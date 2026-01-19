# Changelog (Alpha)

This changelog tracks changes during the v10 alpha period. For the full changelog after stable release, see [CHANGELOG.md](./CHANGELOG.md).

---

## Unreleased

### Features

#### Canvas Size Control

Added `width` and `height` props to Canvas for explicit resolution control, enabling use cases like 4K video export independent of container size.

**New Canvas props:**

```tsx
<Canvas width={1920} height={1080}>  // Fixed 1920×1080 resolution
<Canvas width={800}>                  // 800×800 square
<Canvas>                              // Container-responsive (default, unchanged)
```

**Enhanced setSize API:**

```typescript
state.setSize() // Reset to props/container
state.setSize(500) // 500×500 square
state.setSize(1920, 1080) // Explicit size (takes ownership)
state.setSize(1920, 1080, top, left) // With position (existing)
```

**Ownership model:**

- Once `setSize(n, m)` is called imperatively, it takes ownership of canvas dimensions
- Props/container changes are stored but don't apply until `setSize()` reset is called
- This enables temporary resolution changes (e.g., bump to 4K for video frame capture, then reset)

**Files changed:**

- `packages/fiber/types/canvas.d.ts` - Added `width`, `height` props
- `packages/fiber/types/store.d.ts` - Updated `setSize` signature, added `_sizeImperative`, `_sizeProps`
- `packages/fiber/types/renderer.d.ts` - Added internal `_sizeProps` prop
- `packages/fiber/src/core/store.ts` - New `setSize` logic with square shorthand and reset
- `packages/fiber/src/core/Canvas.tsx` - Width/height prop handling, effective size calculation
- `packages/fiber/src/core/renderer.tsx` - Imperative mode respect

#### ScopedStore Wrapper for Type-Safe Uniform/Node Access

Added `ScopedStore` proxy wrapper that provides TypeScript-friendly access to uniforms and nodes in creator functions without manual casting.

**Before (required manual casting):**

```typescript
useLocalNodes(({ uniforms }) => ({
  wobble: sin((uniforms.uTime as UniformNode<number>).mul(2)),
}))
```

**After (no cast needed):**

```typescript
useLocalNodes(({ uniforms }) => ({
  wobble: sin(uniforms.uTime.mul(2)), // Direct access typed as UniformNode
  playerHealth: uniforms.scope('player').uHealth, // Explicit scope access
}))
```

**New exports from `@react-three/fiber/webgpu`:**

- `createScopedStore<T>()` - Factory function to wrap store data
- `ScopedStoreType<T>` - Type for the wrapped store
- `CreatorState` - Type passed to creator functions (replaces `RootState` in creators)

**ScopedStore methods:**

- `.scope(key)` - Access nested scope, returns empty wrapper if not found
- `.has(key)` - Check if key exists
- `.keys()` - Get all keys
- Supports `Object.keys()`, `for...in`, and `'key' in store`

**Type changes:**

- `NodeCreator`, `LocalNodeCreator`, `UniformCreator` now receive `CreatorState` instead of `RootState`

#### HMR Support for TSL Hooks

Added automatic Hot Module Replacement (HMR) support for WebGPU TSL hooks. When you save changes to files containing TSL node or uniform definitions, they automatically refresh without a full page reload.

**Canvas HMR Integration:**

- Canvas now detects Vite (`vite:afterUpdate`) and webpack HMR events
- Automatically clears and rebuilds TSL nodes/uniforms on hot reload
- New `hmr` prop to disable if needed: `<Canvas hmr={false}>`

**useNodes improvements:**

- Reader modes (`useNodes()`, `useNodes('scope')`) now subscribe to store changes
- New `rebuildNodes(scope?)` util returned from hook for manual rebuild
- New `rebuildAllNodes(store, scope?)` standalone export for HMR integration
- Creators now respond to `_hmrVersion` changes to bust memoization cache

**useUniforms improvements:**

- Reader modes (`useUniforms()`, `useUniforms('scope')`) now subscribe to store changes
- New `rebuildUniforms(scope?)` util returned from hook for manual rebuild
- New `rebuildAllUniforms(store, scope?)` standalone export for HMR integration

**usePostProcessing fix:**

- Fixed callback guards (`callbacksRanRef`, `scenePassCacheRef`) blocking re-execution after HMR
- Refs now reset on mount to allow callbacks to re-run after hot reload

**Store changes:**

- Added `_hmrVersion: number` to RootState for coordinating HMR rebuilds

### Bug Fixes

- Fixed `useNodes()` and `useUniforms()` reader modes not updating when store changes
- Fixed `usePostProcessing` callbacks not re-running after HMR due to stale ref guards

### Files Changed

- `packages/fiber/src/webgpu/hooks/ScopedStore.ts` - **NEW** Type-safe proxy wrapper for uniform/node access
- `packages/fiber/src/core/Canvas.tsx` - HMR detection and auto-refresh
- `packages/fiber/src/core/store.ts` - Added `_hmrVersion` to initial state
- `packages/fiber/src/webgpu/hooks/useNodes.tsx` - Reader subscription, rebuildNodes, hmrVersion support, ScopedStore integration
- `packages/fiber/src/webgpu/hooks/useUniforms.tsx` - Reader subscription, rebuildUniforms, ScopedStore integration
- `packages/fiber/src/webgpu/hooks/usePostProcessing.tsx` - HMR ref reset fix
- `packages/fiber/src/webgpu/hooks/index.ts` - Export rebuild functions, ScopedStore exports
- `packages/fiber/types/store.d.ts` - Added `_hmrVersion` type
- `packages/fiber/types/canvas.d.ts` - Added `hmr` prop type
- `docs/v10-features.md` - HMR documentation

---

## Previous Alpha Releases

See git history for changes prior to this changelog.
