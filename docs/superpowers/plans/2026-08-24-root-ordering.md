# Canvas Root Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Canvas scheduler ordering through Scheduler 0.2 root constraints while keeping FPS throttling on the default render job.

**Architecture:** Expand the existing flat `renderer.scheduler` config with root-level `before`, `after`, and `order`. Pass those values during root registration and update them through Scheduler 0.2 when an existing Canvas is reconfigured; retain `fps` only on the render job.

**Tech Stack:** TypeScript, React 19, Three.js, `@pmndrs/scheduler@^0.2.0`, Vitest.

## Global Constraints

- Preserve the flat `renderer={{ scheduler: ... }}` API.
- `before`, `after`, and `order` apply only to scheduler roots.
- `fps` applies only to the default render job.
- Do not implement compatibility duplication on the render job.
- Do not change frameloop lifecycle behavior from #3865.

---

### Task 1: Public Scheduler Configuration

**Files:**

- Modify: `packages/fiber/types/renderer.d.ts:62-76`
- Modify: `packages/fiber/src/core/utils/parseRendererConfig.ts:6-10`
- Test: `packages/fiber/tests/renderer-config.test.ts:66-111`

**Interfaces:**

- Produces: `CanvasSchedulerConfig` and internal `RendererScheduler` with `before?: string | string[]`, `after?: string | string[]`, `order?: number`, and `fps?: number`.

- [ ] **Step 1: Expand the parser fixture**

Update the config-bag test to pass and retain every scheduler field:

```ts
const scheduler = {
  before: ['overlay'],
  after: 'main',
  order: 2,
  fps: 30,
}
const prop = { primaryCanvas: 'main', scheduler, antialias: true } as any
const result = parseRendererConfig(prop)

expect(result.scheduler).toEqual(scheduler)
expect(result.renderer).toEqual({ antialias: true })
```

- [ ] **Step 2: Run the parser test**

Run:

```bash
pnpm exec vitest run packages/fiber/tests/renderer-config.test.ts
```

Expected: PASS because parsing is intentionally transparent; this test locks the expanded shape before integration work.

- [ ] **Step 3: Expand both scheduler interfaces**

Use the same field types in the public declaration and internal parser interface:

```ts
before?: string | string[]
after?: string | string[]
order?: number
fps?: number
```

Document `before`, `after`, and `order` as Canvas-root ordering and `fps` as default-render throttling.

- [ ] **Step 4: Run strict type checking**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

### Task 2: Root Registration and Runtime Reconfiguration

**Files:**

- Modify: `packages/fiber/src/core/renderer.tsx:127-142`
- Modify: `packages/fiber/src/core/renderer.tsx:629-770`
- Create: `packages/fiber/tests/root-ordering.test.tsx`

**Interfaces:**

- Consumes: expanded `RendererScheduler`.
- Produces: initial `registerRoot(..., { before, after, order })` mapping and runtime `setRootConstraints` / `setRootOrder` updates.

- [ ] **Step 1: Add failing root-order integration tests**

Create a deterministic mock-renderer suite with roots configured as `frameloop: 'never'`. Cover:

```tsx
// Mount dependent first; root constraint must override registration order.
await secondary.configure({
  id: 'secondary',
  renderer: secondaryRenderer,
  frameloop: 'never',
  scheduler: { after: 'main' },
})
await main.configure({ id: 'main', renderer: mainRenderer, frameloop: 'never' })

getScheduler().step(1000)
expect(renderOrder).toEqual(['main', 'secondary'])
```

Add equivalent assertions for:

- runtime `after` changes reordering the next `step()`;
- runtime `order` changes reordering the next `step()`;
- removing and re-registering `main` reactivating `secondary`'s dormant dependency;
- `fps: 30` throttling only renderer calls while a normal `useFrame` callback continues each step.

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
pnpm exec vitest run packages/fiber/tests/root-ordering.test.tsx
```

Expected: ordering assertions fail because `after` is still attached to the render job and root options are not updated.

- [ ] **Step 3: Register root ordering**

Pass root options from `schedulerConfig`:

```ts
const unregisterRoot = scheduler.registerRoot(newRootId, {
  getState: () => store.getState(),
  onError: (err) => store.getState().setError(err),
  frameloop: store.getState().frameloop,
  before: schedulerConfig?.before,
  after: schedulerConfig?.after,
  order: schedulerConfig?.order,
})
```

Remove `after` from default render-job registration:

```ts
{
  id: canvasId || `${newRootId}_render`,
  rootId: newRootId,
  phase: 'render',
  system: true,
  ...(schedulerConfig?.fps && { fps: schedulerConfig.fps }),
}
```

- [ ] **Step 4: Update existing roots on reconfigure**

Track the last configured root options independently from FPS. When `rootId` already exists:

```ts
if (
  !is.equ(schedulerConfig?.before, lastSchedulerBefore, shallowLoose) ||
  !is.equ(schedulerConfig?.after, lastSchedulerAfter, shallowLoose)
) {
  scheduler.setRootConstraints(rootId, {
    before: schedulerConfig?.before,
    after: schedulerConfig?.after,
  })
}

if (schedulerConfig?.order !== lastSchedulerOrder) {
  scheduler.setRootOrder(rootId, schedulerConfig?.order ?? 0)
}
```

Persist the latest values after registration or update. Do not move `fps` to root options.

- [ ] **Step 5: Run focused tests**

Run:

```bash
pnpm exec vitest run packages/fiber/tests/root-ordering.test.tsx packages/fiber/tests/scheduler-integration.test.tsx packages/fiber/tests/per-canvas-frameloop.test.tsx
```

Expected: PASS.

### Task 3: Documentation and Full Verification

**Files:**

- Modify: `docs/frame-loop.mdx`
- Verify: all files changed by Tasks 1-2

**Interfaces:**

- Documents: root ordering fields and render-job FPS distinction.

- [ ] **Step 1: Document the Canvas scheduler config**

Add a concise example:

```tsx
<Canvas
  id="secondary"
  renderer={{
    primaryCanvas: 'main',
    scheduler: { after: 'main', order: 1, fps: 40 },
  }}
/>
```

Explain that `before`, `after`, and `order` sort roots, while `fps` throttles only the default render job.

- [ ] **Step 2: Run complete verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm eslint
pnpm format
pnpm build
pnpm verify-bundles
git diff --check
```

Expected: every command passes.

- [ ] **Step 3: Review the final diff**

Confirm:

- no root-ordering constraint remains on the render job;
- no frameloop lifecycle code changed;
- `fps` remains render-job scoped;
- tests prove mount-order independence and runtime updates;
- documentation matches the public types.
