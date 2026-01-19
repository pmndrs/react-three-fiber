# Changelog (Alpha)

This changelog tracks changes during the v10 alpha period. For the full changelog after stable release, see [CHANGELOG.md](./CHANGELOG.md).

---

## Unreleased

### Features

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

- `packages/fiber/src/core/Canvas.tsx` - HMR detection and auto-refresh
- `packages/fiber/src/core/store.ts` - Added `_hmrVersion` to initial state
- `packages/fiber/src/webgpu/hooks/useNodes.tsx` - Reader subscription, rebuildNodes, hmrVersion support
- `packages/fiber/src/webgpu/hooks/useUniforms.tsx` - Reader subscription, rebuildUniforms
- `packages/fiber/src/webgpu/hooks/usePostProcessing.tsx` - HMR ref reset fix
- `packages/fiber/src/webgpu/hooks/index.ts` - Export rebuild functions
- `packages/fiber/types/store.d.ts` - Added `_hmrVersion` type
- `packages/fiber/types/canvas.d.ts` - Added `hmr` prop type
- `docs/v10-features.md` - HMR documentation

---

## Previous Alpha Releases

See git history for changes prior to this changelog.
