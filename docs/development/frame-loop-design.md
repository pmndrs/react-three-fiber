# Frame Loop & Scheduler — Design Notes

Contributor-facing rationale for the v10 frame loop. User-facing usage lives at
https://docs.pmnd.rs/react-three-fiber/frame-loop — keep usage out of this file.

Source: `packages/fiber/src/core/hooks/useFrame/` (`scheduler.ts`, `phaseGraph.ts`,
`sorter.ts`, `rateLimiter.ts`, `index.ts`).

## Why a global singleton scheduler

The scheduler is a single global singleton driving one `requestAnimationFrame` loop for the
entire application, rather than one RAF per `<Canvas>`. Motivations:

- **Frame sync across canvases.** Multiple roots share one loop, so they advance on the same
  tick instead of drifting against independent RAFs.
- **Cross-bundle identity.** The instance is keyed with `Symbol.for(...)` so imports from
  `@react-three/fiber` and `@react-three/fiber/webgpu` resolve to the _same_ scheduler. Without
  this, mixed-entry apps would get two competing loops.
- **HMR survival.** The instance is preserved across hot module reloads so the render loop does
  not stop during development.

It is class-based. From the source header: "It is class based (Krispy will hate it) but the api
is solid." Noted here so the trade-off is a conscious one, not an accident.

## DAG / phase-graph ordering vs. priority numbers

v9 ordered callbacks with a single numeric `priority`, which does not compose across libraries
(two libraries both picking `0` have no defined order, and consumers can't reorder library jobs
they don't control). v10 replaces this with a directed-acyclic phase graph: named phases plus
per-job `before`/`after` constraints, resolved into a sorted job list. Design is informed by
existing engine loop / scheduler systems including `pmndrs/directed` and Jolt-style loops.

Numeric priority is retained only as a deprecated tie-breaker and backwards-compat shim (see
render takeover below).

## Render takeover via a system job

The default scene render is itself a job registered in the `render` phase, flagged
`system: true`. Each frame it checks `hasUserJobsInPhase('render', rootId)` (which ignores
system jobs) and bails if a user job exists in that phase, or if the legacy
`internal.priority` counter is non-zero.

Why this shape:

- **Composability.** Users can add render-phase work with `before`/`after` without clobbering
  the default render, and a single `{ phase: 'render' }` job cleanly takes over.
- **Automatic resume.** Because the check is dynamic per-frame rather than a one-time flag, the
  default render resumes the moment a user render job unmounts — no teardown bookkeeping.
- **Legacy bridge.** The `internal.priority` counter (incremented by deprecated
  `useFrame(cb, n)` with `n > 0`, including up parent roots for portal support) preserves the v9
  "priority disables default render" behavior while emitting a deprecation notice.

## fps throttling: one call per frame

Rate limiting (`rateLimiter.ts`) deliberately invokes a throttled callback **at most once per
RAF**, never multiple times to catch up. `drop` only affects how the job's `lastRun` timestamp
is advanced:

- `drop: true` snaps `lastRun` to now (discard missed intervals).
- `drop: false` advances `lastRun` by whole `minInterval` steps, clamped to avoid runaway drift,
  so simulations keep consistent interval accounting — but still run once per frame.

This is intentional: running a user callback N times in a single frame to "catch up" risks
unbounded work inside one RAF and was avoided. (Earlier draft docs described multi-invocation
catch-up; that was never the implementation.)

## Independent / waiting modes

`useFrame` reads the Canvas context directly and returns `null` outside a Canvas instead of
throwing. This supports three modes from one hook: inside Canvas (full `RootState`), outside
Canvas "waiting" (registers once a root mounts, via `onRootReady`), and independent mode
(`scheduler.independent = true` creates a default root and delivers timing-only state for
non-R3F loops).
