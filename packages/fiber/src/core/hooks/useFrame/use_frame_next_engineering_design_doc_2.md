# useFrameNext — Engineering Design Doc

**Owners:** Dennis Smolek (author), LLM agents

**Purpose:**
This doc specifies the design and implementation plan for `useFrameNext` — a next‑generation, frame‑driven scheduler intended to supersede/augment the current `useFrame` behavior in React Three Fiber (R3F). The target audience is implementation engineers and LLM coding agents. The doc focuses on a pragmatic, incremental build with low dependency cost, testability, and a clear migration path.

---

## 1. Goals

- Provide a deterministic, low‑overhead per‑frame scheduler for browser RAF loops.
- Support **priority**, **before/after (phase constraints)**, **fps throttling**, and **drop/catch‑up** semantics per callback.
- Keep the runtime synchronous and cheap (no promises/timers for core loop).
- Make the implementation easy to test and auditable by LLM agents.
- Allow incremental adoption: `useFrameNext` can coexist with the current `useFrame` until full migration.

## 2. Non‑Goals

- Distributed job queuing or persisted job queues.
- Full reactive propagation engines (we are not implementing a reactivity DAG like `directed`).
- Async job/workers as part of the core dispatch (workers can be used for offload separately).
- Replacing React’s reconciliation or lifecycle semantics.

---

## 3. High level architecture

```
requestAnimationFrame -> Frame Driver -> Sorted Job List -> Run Jobs (sync) -> Next RAF
                              ^
                              | register/unregister/modify (mount/unmount/hooks)
                              |
                         Job Registry
                         (phase metadata, rate limiters, priority)
```

### Components

- **Public Hook API (`useFrameNext`)** — exposes registration, options, and teardown for components.
- **Scheduler (singleton per canvas/root)** — maintains the job registry, sorted execution list, and RAF loop driver.
- **Job Registry** — Map of jobs; each job holds metadata and runtime fields (lastRun, index, enabled).
- **Phase model** — small fixed phase graph (named phases) used for primary ordering. The phase topology is static by default and rarely changes.
- **Topo/phase ordering** — high‑level ordering obtained by combining phase graph (static) + before/after constraints (per job may reference phases or other jobs by id).
- **Sorter** — builds `sortedJobs` when topology changes. Optimized for rare rebuilds.
- **Rate limiter** — per‑job fps logic and drop/catch behavior.

---

## 4. Public API

### Exposed hook

```ts
function useFrameNext(callback: (state: FrameState, dt: number) => void, opts?: UseFrameNextOptions): void
```

### Options

```ts
type UseFrameNextOptions = {
  id?: string // optional stable id, otherwise auto-generated
  phase?: string // named phase; default: 'update' or a small set
  before?: string | string[] // add job before a phase or other job id
  after?: string | string[] // add job after a phase or other job id
  priority?: number // numeric priority within resolved phase (higher first)
  fps?: number // max frames per second for this job
  drop?: boolean // if true, skip when behind; if false, try to catch up
  enabled?: boolean // allow toggling without unregister
}
```

### FrameState (relevant subset)

```ts
interface FrameState {
  time: number // high-res timestamp from RAF
  delta: number // ms since last frame
  frame: number // incrementing frame counter
  // extendable: camera, gl context, scene, etc. (R3F specific)
}
```

### Return / lifecycle

- Hook registers on mount and unregisters on unmount.
- If `id` is provided, subsequent hook calls with same id may update the job entry (for advanced use).

---

## 5. Internal data structures

```ts
type Job = {
  id: string
  callback: (s: FrameState, dt: number) => void
  phase: string
  before: Set<string> // refer to phase names or job ids
  after: Set<string>
  priority: number
  index: number // insertion order for deterministic ties
  fps?: number
  drop?: boolean
  lastRun?: number // timestamp ms
  enabled: boolean
}

// Registry
const jobsById: Map<string, Job>
// Phase → job[] map for quick grouping
const jobsByPhase: Map<string, Job[]>
// Cached sorted list for the frame
let sortedJobs: Job[]
```

Notes:

- `index` is assigned incrementally during registration to break ties deterministically.
- `phase` is the primary grouping key. `before/after` constraints referencing phases map to edges between phase nodes; if referencing job ids, they create fine-grained constraints.

---

## 6. Phase model & ordering

Define a small, default phase set (editable per root):

```
['input', 'read', 'physics', 'compute', 'update', 'before-render', 'render', 'after-render', 'post']
```

Rules:

- Jobs declare `phase` OR `before/after` relative to a phase/job.
- If job specifies `before: 'render'` it will be placed into the phase immediately preceding render in the resolved topology (or a virtual phase named `before-render`).

Implementation detail:

- The phase graph is static and provides coarse ordering. Jobs can add fine-grained constraints by referencing other job ids.
- Sorting algorithm: build ordered phase list (static) → place jobs into phase buckets → within each bucket apply priority sorting + tie break by index → then apply fine-grained job-level constraints via a lightweight stable topological sort if cross-job edges exist inside the same or adjacent phases.

Optimization:

- Most apps will only use phase names; cross-job references are rare and will trigger a small topo sort only when present.

---

## 7. Sorting algorithm (practical)

1. **On job register/unregister/modify:** mark `needsRebuild = true` and (optionally) schedule a microtask rebuild (see batching below).
2. **RebuildSortedJobs():**
   - Group jobs into the static phase bucket order.
   - For each bucket, sort by `priority desc` then `index asc`.
   - If there are any cross-job `before/after` constraints that cannot be resolved by phase ordering alone, run a _local_ topological sort on the subset of impacted jobs. This keeps complexity small.
   - Concatenate buckets into `sortedJobs`.

Complexity: O(N log N) per affected bucket. Rebuilds are rare.

Third‑party option: for safety, consider using a tiny topological sort utility (e.g. `topsort` ~ small) only if the internal implementation proves tricky. Default: implement a tiny inlined stable topo for limited use.

---

## 8. Rate limiting & drop/catch‑up semantics

Per job we store `lastRun` (timestamp ms). Algorithm when dispatching:

```ts
function shouldRun(job, now) {
  if (!job.enabled) return false
  if (!job.fps) return true

  const minInterval = 1000 / job.fps
  const elapsed = now - (job.lastRun ?? 0)

  if (elapsed < minInterval) {
    return false
  }

  // run; update lastRun depending on drop
  if (job.drop) {
    job.lastRun = now
  } else {
    // catch-up semantics: advance lastRun by multiples of minInterval
    // but avoid unbounded loops; we only run one invocation per frame
    job.lastRun = (job.lastRun ?? now) + Math.floor(elapsed / minInterval) * minInterval
    if (job.lastRun < now) job.lastRun = now
  }

  return true
}
```

Notes:

- If `drop === true` we mark `lastRun = now` and execute with current dt.
- If `drop === false` we advance `lastRun` by a step to approximate catch‑up; but **we do not run multiple updates in a single RAF** (we keep single invocation per frame to avoid long frames). For strict deterministic fixed-step physics, an advanced API can expose `fixedStep()` runs.

---

## 9. Dispatch loop

The RAF loop (per canvas root):

```ts
let last = performance.now()
let frame = 0
function loop(now) {
  const dt = now - last
  last = now
  frame++
  const state = { time: now, delta: dt, frame }

  if (needsRebuild) rebuildSortedJobs()

  for (const job of sortedJobs) {
    if (!job.enabled) continue
    if (shouldRun(job, now)) {
      try {
        job.callback(state, dt)
      } catch (e) {
        // swallow/log — scheduler must be robust
      }
    }
  }

  requestAnimationFrame(loop)
}
```

Important:

- Keep call stack shallow and synchronous.
- Avoid microtask yields in the core loop.
- Catch and log individual job exceptions so the loop continues.

---

## 10. Registration lifecycle (hooks)

`useFrameNext(cb, opts)` behavior:

- On mount: create Job object, insert into `jobsById`, set `needsRebuild = true`, optionally request a microtask rebuild.
- On update (opts changed): mutate job, set `needsRebuild = true`.
- On unmount: remove job, set `needsRebuild = true`.

Edge cases:

- Duplicate ids: last registration wins (log warning).
- Strict mode double-mount: use `index` assignment to remain deterministic.

---

## 11. Microtask batching (optional)

When many components mount/unmount in a single render tick, rebuilding on every change is wasteful. Provide optional microtask‑based rebuild batching:

```ts
let rebuildRequested = false
function requestRebuild() {
  if (rebuildRequested) return
  rebuildRequested = true
  queueMicrotask(() => {
    rebuildRequested = false
    rebuildSortedJobs()
  })
}
```

Default: enable batching. It is cheap and protects against React bursts.

---

## 12. Tests & Validation

Unit tests:

- register/unregister ordering
- priority tie breaking
- before/after constraints
- fps limiting (drop vs catch-up)
- rebuild batching correctness
- stability across mount/unmount churn

Integration tests:

- run a synthetic RAF driver and assert order/frame counts
- real browser smoke tests with R3F small scene

---

## 13. Incremental rollout plan

1. Implement library internals in an isolated repo/module (`use-frame-next-core`).
2. Create exhaustive unit tests.
3. Provide `useFrameNext` React hook wrapper with simple examples.
4. Integrate into R3F as opt‑in hook and docs.
5. Beta: ship dual runtime where both `useFrame` and `useFrameNext` can coexist.
6. Migrate internal R3F subsystems to opt into `useFrameNext` gradually.

---

## 14. Implementation tasks for LLM agents

- Task 1: scaffold module, types, build/test infra.
- Task 2: implement Job registry, hook stub, basic RAF loop.
- Task 3: implement phase buckets + priority sorting.
- Task 4: add before/after constraint handling and local topo sort.
- Task 5: add fps/drop logic + tests.
- Task 6: microtask batching + tests.
- Task 7: integration example with R3F (demo scene).

Each task should include unit tests and small smoke examples.

---

## 15. Future extensions

- Optional durable job IDs for hot reloading scenarios.
- Expose a `fixedStep()` helper for deterministic physics subsystems.
- Allow offloading heavy jobs to WebWorkers with message bridge.
- Add profiling hooks and metrics (latency, run counts, avg dt).
- Allow multiple independent loops per page (multiple canvases / roots).

---

## 16. Appendix: Example usage

```tsx
// within a component
useFrameNext(
  (state, dt) => {
    // update transforms
  },
  {
    id: 'update-position',
    phase: 'physics',
    priority: 5,
    fps: 120,
    drop: true,
  },
)

useFrameNext(
  (s, dt) => {
    // render‑adjacent effect
  },
  { before: 'render', priority: 10 },
)
```

---

End of document.

## Additional Considerations

- **RAF Timestamp Reliability**: requestAnimationFrame timestamps are significantly more stable and aligned with display refresh cycles compared to `performance.now()`. The scheduler will pass the **raw RAF timestamp** directly into all graph and hook callbacks.
- **Delta & Elapsed Time**: The scheduler will compute and supply both `delta` (time since last frame) and `elapsed` (time since loop start) for all tasks.
- **Loop Control (Skipping / Halting Execution)**: Expose loop controls via the hook, e.g.: `const { skip, stop, resume } = useFrameNext()`. This allows a task to skip itself for a frame, temporarily pause the entire graph, or resume.
- **Dropped Frame Detection & Events**: Add a dropped-frame monitor that counts frames exceeding a delta threshold. Configurable options:
  - `windowMs`: time window to observe drops (e.g., 3000ms)
  - `maxDrops`: number of drops to trigger an event
  - `onDropEvent`: callback for analytics / degrading quality / notifying dev tools
- **Cleanup & Unsubscription Guarantees**: When a component using the hook unmounts, the scheduler will:
  - Remove its node from the execution graph
  - Remove event listeners
  - Release any internal references to avoid leaks
