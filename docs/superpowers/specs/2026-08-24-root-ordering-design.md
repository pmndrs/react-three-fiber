# Canvas Root Ordering Design

## Goal

Make `renderer={{ scheduler: ... }}` order Canvas roots through Scheduler 0.2 root constraints. Cross-canvas ordering must remain correct regardless of mount order, runtime reconfiguration, or temporary target removal.

## Public API

Extend `CanvasSchedulerConfig` without adding a nested configuration layer:

- `before?: string | string[]`
- `after?: string | string[]`
- `order?: number`
- `fps?: number`

`before`, `after`, and `order` configure the Canvas scheduler root. `fps` remains a throttle on the Canvas default render job.

This intentionally changes `after` from an ineffective render-job constraint to the root constraint its existing documentation describes.

## Integration

On first Canvas configuration:

1. Generate or resolve the Canvas root ID.
2. Call `scheduler.registerRoot(rootId, { frameloop, before, after, order, getState, onError })`.
3. Register the default render job with `fps`, but no root-ordering constraints.

On later configuration:

1. Compare `before`, `after`, and `order` with the last configured scheduler values.
2. Call `setRootConstraints(rootId, { before, after })` when either constraint changes.
3. Call `setRootOrder(rootId, order ?? 0)` when numeric order changes.
4. Update the render job FPS independently.

Missing root references remain dormant inside Scheduler 0.2 and reactivate automatically if the target root registers later.

## Compatibility and Errors

- Existing `scheduler.after: 'main'` call sites begin working as documented.
- `fps` behavior remains render-only.
- Unknown root references are accepted and deferred by the scheduler.
- Root ordering stays separate from frameloop lifecycle and from job phase ordering.
- No compatibility shim applies `after` to both root and render job.

## Tests

Integration tests will cover:

1. A dependent Canvas mounted before `main` still executes after it.
2. Runtime `before`, `after`, and numeric `order` changes reorder the next frame.
3. Removing and re-registering a referenced root reactivates the dependency.
4. `fps` remains attached only to the default render job.
5. Renderer config parsing and public types accept the expanded scheduler shape.

## Documentation

Update the frame-loop scheduler documentation to distinguish root ordering (`before`, `after`, `order`) from render-job throttling (`fps`).
