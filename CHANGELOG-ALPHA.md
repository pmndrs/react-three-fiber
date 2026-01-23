# Changelog (Alpha)

This changelog tracks changes during the v10 alpha period. For the full changelog after stable release, see [CHANGELOG.md](./CHANGELOG.md).

---

## Unreleased

### Features

#### forceEven Canvas Prop

Added `forceEven` prop to Canvas for Safari compatibility. Safari has issues with odd or fractional HTML canvas dimensions. When enabled, canvas dimensions are rounded up to the nearest even number.

```tsx
<Canvas forceEven>{/* Canvas dimensions are guaranteed to be even numbers */}</Canvas>
```

**Key details:**

- Rounds dimensions UP to the nearest even number (e.g., 501 → 502, 301 → 302)
- Uses `Math.ceil(n / 2) * 2` to ensure odd values round up, not down
- Accessible to Drei components via `useThree((state) => state.internal.forceEven)`

**Files changed:**

- `packages/fiber/types/canvas.d.ts` - Added `forceEven` prop type
- `packages/fiber/types/store.d.ts` - Added `forceEven` to InternalState
- `packages/fiber/src/core/Canvas.tsx` - Prop destructuring and effectiveSize rounding logic
- `packages/fiber/src/core/renderer.tsx` - Store forceEven in internal state

#### Canvas Background Prop

Added a flexible `background` prop to Canvas for declarative scene background and environment configuration. Supports colors, URLs, presets, and an expanded object form for separate background/environment maps.

**Simple string forms:**

```tsx
<Canvas background="red" />              // Color
<Canvas background="#1a1a2e" />          // Hex color
<Canvas background={0xff0000} />         // Hex number
<Canvas background="/path/to/env.hdr" /> // URL
<Canvas background="sunset" />           // Preset
```

**Expanded object form:**

```tsx
<Canvas
  background={{
    preset: 'city',
    backgroundBlurriness: 0.5,
    backgroundIntensity: 1,
    environmentIntensity: 1.2,
  }}
/>
```

**Key features:**

- String detection: presets → URLs → colors (priority order)
- Supports all HDRI presets: apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse
- Object form allows separate `backgroundMap` and environment files
- Replaces verbose `<color attach="background">` pattern

**Loader migrations:**

- `RGBELoader` → `HDRLoader` (renamed in Three.js r180)
- `HDRJPGLoader` → `UltraHDRLoader` (Three.js native)

**New exports:**

- `Environment` component from `@react-three/fiber`
- `useEnvironment` hook from `@react-three/fiber`
- `presetsObj` and `PresetsType` for preset names

**Files changed:**

- `packages/fiber/types/canvas.d.ts` - Added `BackgroundProp`, `BackgroundConfig` types
- `packages/fiber/src/core/Canvas.tsx` - Background prop parsing and Environment rendering
- `packages/fiber/src/core/components/Environment/Environment.tsx` - Enhanced with color/backgroundFiles support
- `packages/fiber/src/core/hooks/useEnvironment.tsx` - Loader migrations
- `packages/fiber/src/core/index.tsx` - Added Environment exports
- `packages/fiber/src/core/hooks/index.tsx` - Added useEnvironment export

#### Multi-Canvas Rendering (WebGPU)

Added support for sharing a single WebGPURenderer across multiple Canvas components, enabling HUD overlays, picture-in-picture views, and multi-viewport rendering.

**Primary canvas setup:**

```tsx
<Canvas id="main" renderer>
  <Scene />
</Canvas>
```

**Secondary canvas sharing the renderer:**

```tsx
<Canvas renderer={{ primaryCanvas: 'main', scheduler: { after: 'main', fps: 30 } }}>
  <HudScene />
</Canvas>
```

**Key features:**

- `renderer={{ primaryCanvas: 'id' }}` - Share renderer from another canvas
- `scheduler.after` - Control render ordering between canvases
- `scheduler.fps` - Limit secondary canvas render rate
- `primaryStore` - Access primary's scene/camera for HUD-style rendering

**Files changed:**

- `packages/fiber/types/store.d.ts` - Added `primaryStore` to RootState
- `packages/fiber/types/renderer.d.ts` - Added `CanvasSchedulerConfig`, `RendererConfigExtended`
- `packages/fiber/types/canvas.d.ts` - Omit internal props from CanvasProps
- `packages/fiber/src/core/Canvas.tsx` - Extract renderer config props
- `packages/fiber/src/core/renderer.tsx` - Canvas target management, scheduler config, primaryStore setup

#### Color Management Props

Added explicit `colorSpace` and `toneMapping` props for direct control over renderer color settings, deprecating the boolean `linear` and `flat` shortcuts.

**New props:**

- `colorSpace` - Set `renderer.outputColorSpace` directly (default: `THREE.SRGBColorSpace`)
- `toneMapping` - Set `renderer.toneMapping` directly (default: `THREE.ACESFilmicToneMapping`)

**Deprecated props:**

- `linear` - Use `colorSpace={THREE.LinearSRGBColorSpace}` instead
- `flat` - Use `toneMapping={THREE.NoToneMapping}` instead

```tsx
// Before (deprecated)
<Canvas linear flat />

// After
<Canvas
  colorSpace={THREE.LinearSRGBColorSpace}
  toneMapping={THREE.NoToneMapping}
/>

// New flexibility - use any tone mapping algorithm
<Canvas toneMapping={THREE.ReinhardToneMapping} />
<Canvas toneMapping={THREE.CineonToneMapping} />
```

**Files changed:**

- `packages/fiber/types/renderer.d.ts` - Added `colorSpace`, `toneMapping` props to RenderProps
- `packages/fiber/types/store.d.ts` - Added `colorSpace`, `toneMapping` to RootState
- `packages/fiber/src/core/store.ts` - Added initial state for new props
- `packages/fiber/src/core/Canvas.tsx` - Pass new props to configure
- `packages/fiber/src/core/renderer.tsx` - Resolution logic and deprecation warnings
- `packages/fiber/src/core/utils/props.ts` - Use colorSpace for texture auto-assignment

#### Camera Scene Parenting

The default camera is now automatically added as a child of the scene when it doesn't have a parent. This enables camera-relative effects like HUDs, headlights, and any objects that should follow the camera.

**Why this matters:**

- Previously, children attached to the camera wouldn't render because Three.js only renders objects in the scene hierarchy
- Now `camera.add(mesh)` works automatically - the mesh renders and follows the camera

**New Portal component:**

```tsx
import { Portal, useThree } from '@react-three/fiber'

function CameraHeadlights() {
  const { camera } = useThree()
  return (
    <Portal container={camera}>
      <spotLight position={[-0.5, -0.3, 0]} intensity={100} />
      <spotLight position={[0.5, -0.3, 0]} intensity={100} />
    </Portal>
  )
}
```

#### Prop Utilities: fromRef and once

Two new utilities for common prop patterns that previously required imperative code:

**fromRef - Deferred Ref Resolution:**

```tsx
import { fromRef } from '@react-three/fiber'

// target resolves after targetRef is populated - no useEffect needed!
<group ref={targetRef} position={[0, 0, -10]} />
<spotLight target={fromRef(targetRef)} intensity={100} />
```

**once - Mount-Only Method Calls:**

```tsx
import { once } from '@react-three/fiber'

// Geometry transforms that shouldn't be reapplied on every render
<boxGeometry rotateX={once(Math.PI / 2)} />
<bufferGeometry center={once()} />
```

**Files changed:**

- `packages/fiber/src/core/utils/fromRef.ts` - **NEW** Deferred ref resolution utility
- `packages/fiber/src/core/utils/once.ts` - **NEW** Mount-only method call utility
- `packages/fiber/src/core/utils/props.ts` - Integration of fromRef and once in applyProps
- `packages/fiber/src/core/renderer.tsx` - Camera scene parenting logic, Portal support

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

- Fixed portal `size` state being overwritten by parent resize events. Portals now correctly preserve their own size override when the root canvas resizes, matching the existing behavior for `events`. This also fixes nested portals ignoring their size configuration.
- Fixed `setSize` not triggering a frame in demand mode. Now calls `scheduler.invalidate()` directly so `useFrame` callbacks can respond to size changes.
- Fixed `useNodes()` and `useUniforms()` reader modes not updating when store changes
- Fixed `usePostProcessing` callbacks not re-running after HMR due to stale ref guards
- Fixed absolute Windows paths appearing in bundled type declarations by defining `FiberRoot` locally instead of importing from `react-reconciler`
- Fixed eslint-plugin codegen script not awaiting prettier format before writing files
- Fixed type exports in `reconciler.d.ts` and `three.d.ts` to properly export Three.js types

### Examples

- Added **NestedCamera** demo showcasing camera-attached headlights using the new Portal component
  - Demonstrates figure-8 path camera movement
  - Shows spotlights following camera orientation
  - Located at `example/src/demos/default/NestedCamera.tsx`

### Maintenance

- Migrated to ESLint 9 flat config
- Updated Vite to v7
- Updated Prettier to v3 and reformatted codebase
- Updated Husky to v9 and lint-staged to v16
- Updated various dependencies to latest versions
- Converted `verify-bundles.js` script to ES modules

### Files Changed

- `packages/fiber/src/core/utils/fromRef.ts` - **NEW** Deferred ref resolution utility
- `packages/fiber/src/core/utils/once.ts` - **NEW** Mount-only method call utility
- `packages/fiber/src/core/utils/props.ts` - Integration of fromRef and once in applyProps
- `packages/fiber/src/core/renderer.tsx` - Camera scene parenting logic, Portal support
- `packages/fiber/src/webgpu/hooks/ScopedStore.ts` - **NEW** Type-safe proxy wrapper for uniform/node access
- `packages/fiber/src/core/Canvas.tsx` - HMR detection and auto-refresh
- `packages/fiber/src/core/store.ts` - Added `_hmrVersion` to initial state
- `packages/fiber/src/webgpu/hooks/useNodes.tsx` - Reader subscription, rebuildNodes, hmrVersion support, ScopedStore integration
- `packages/fiber/src/webgpu/hooks/useUniforms.tsx` - Reader subscription, rebuildUniforms, ScopedStore integration
- `packages/fiber/src/webgpu/hooks/usePostProcessing.tsx` - HMR ref reset fix
- `packages/fiber/src/webgpu/hooks/index.ts` - Export rebuild functions, ScopedStore exports
- `packages/fiber/types/store.d.ts` - Added `_hmrVersion` type
- `packages/fiber/types/canvas.d.ts` - Added `hmr` prop type
- `packages/fiber/types/reconciler.d.ts` - Fixed type exports
- `packages/fiber/types/three.d.ts` - Fixed type exports
- `example/src/demos/default/NestedCamera.tsx` - **NEW** Camera headlights demo
- `docs/v10-features.md` - Camera parenting, Portal, fromRef, once documentation

---

## Previous Alpha Releases

See git history for changes prior to this changelog.
