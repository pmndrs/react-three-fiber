# Changelog (Alpha)

This changelog tracks changes during the v10 alpha period. For the full per-package history, see [`packages/fiber/CHANGELOG.md`](./packages/fiber/CHANGELOG.md). At stable release this file is folded into the release notes and retired.

---

## 10.0.0-alpha.4

Alpha 4 is a stabilization release for the new scheduler, WebGPU entry point, multi-canvas rendering,
Suspense lifecycle and resource hooks introduced during the v10 alpha.

### Features

#### Canvas scheduling is root-scoped

R3F now uses the root lifecycle and ordering APIs from `@pmndrs/scheduler@0.2`.

- Every Canvas owns its `frameloop` mode and pending demand frames. A demand or never Canvas no longer
  freezes an always-running sibling.
- `invalidate(state)` targets that state’s root; stateless `invalidate()` retains its global fan-out.
- State-bound `advance()` and XR frames step only their owning root; stateless `advance()` still steps
  every root.
- Resizes invalidate only the Canvas that changed, and scheduler roots unregister immediately on
  unmount.
- `useFrame` controls expose the owning `rootId` and a root-scoped `invalidate()`.

Canvas ordering also moved from the default render job to the complete scheduler root:

```tsx
<Canvas
  id="secondary"
  renderer={{
    primaryCanvas: 'main',
    scheduler: { after: 'main', order: 1, fps: 40 },
  }}
/>
```

`before` and `after` accept one Canvas id or an array. Missing references remain dormant until the
target mounts, and runtime configuration changes reorder the next frame. `order` supplies a numeric
root order. `fps` remains scoped to the default render job, so other `useFrame` work can continue
while rendering is throttled.

#### WebGPU hooks use WebGPU state types

`useThree` and `useFrame` imported from `@react-three/fiber/webgpu` now use `WebGPURootState`.
`state.renderer`, `state.gl` and frame callback renderers are therefore typed as `WebGPURenderer`
without casts. This is a types-only narrowing; the exported runtime hooks remain the core
implementations.

### Bug Fixes

#### `useRenderPipeline` rebuilds now reach the GPU

- Rebuilds set `RenderPipeline.needsUpdate`, so a changed `outputNode` recompiles instead of silently
  continuing to render the first graph.
- Replaced `scenePass` instances are disposed after the new graph is installed, preventing render
  targets and MRT attachments from leaking.
- The default passthrough follows the replacement pass instead of retaining a disposed target.
- `reset()` disposes the pass it drops.
- Setup and main callbacks now receive a state whose `renderPipeline` is correctly typed as
  non-null.

Application-created passes and effect nodes retain their existing ownership rules; broader disposal
semantics remain a beta discussion in [#3864](https://github.com/pmndrs/react-three-fiber/issues/3864).

#### Suspense no longer destroys the renderer root

When a child suspends under React StrictMode, Canvas now distinguishes a temporarily hidden tree from
a real DOM unmount. Showing an outer Suspense fallback no longer tears down and recreates the whole
renderer root, preserving store identity and stateful GPU resources such as `useGPUStorage`.

#### Array and record textures no longer loop

`useLoader` preserves the returned array identity while its resolved values are unchanged, and
`useTexture` derives stable signatures for inline array and record inputs. The registry effect no
longer feeds its own subscriber render and ends in `Maximum update depth exceeded`.

Cache invalidation still propagates correctly: if the same keys resolve to new resources, consumers
receive a new result.

#### Multi-canvas resize targets the correct Canvas

Multi-canvas WebGPU resizing now updates the owning `CanvasTarget` rather than whichever target is
currently active on the shared renderer. Deferred backend size updates flush only after that Canvas
becomes the active target, preventing stale depth attachments and mismatched attachment-size
validation errors.

#### WebGPU imports and shader identifiers are safe

- The three.js Inspector is loaded lazily, removing an eager `three/webgpu` import cycle that crashed
  the entire WebGPU entry under Turbopack. This also removes the unused Inspector from normal bundles.
- Scoped names created by `useGPUStorage`, `useBuffers`, `useNodes` and `useUniforms` are sanitized
  into valid WGSL identifiers. Spaces, punctuation and leading digits no longer produce invalid
  struct declarations.

### Dependencies

- `@pmndrs/scheduler` moves from `^0.1.0` to `^0.2.0` for root-scoped lifecycle, invalidation,
  stepping and ordering.

---

## 10.0.0-alpha.3

### Breaking Changes

#### three.js peer floor raised to `>=0.185.0`

The `three` peer range moved from `>=0.181.2` to **`>=0.185.0`**. **If you are on r181–r184 you cannot install alpha.3** — upgrade three alongside R3F.

```diff
- "three": ">=0.181.2"
+ "three": ">=0.185.0"
```

The floor moved because v10 now uses three's own APIs rather than shadowing them: `RenderPipeline` (renamed from `PostProcessing` in r183), `CubeRenderTarget`, and the real `UniformNode` types. Keeping a fallback path for older three meant maintaining a parallel implementation of types three already ships.

#### `act` is no longer re-exported

R3F's `act` was a re-export of React's own, deprecated in favour of importing it directly. It is now
removed from the public surface.

```diff
- import { act } from '@react-three/fiber'
+ import { act } from 'react'
```

It is the same function, so this is an import change and nothing more.

#### React peer range is `>=19.0 <19.3`

v10 requires React 19, with an upper bound. The ceiling is deliberate and follows the same rule as
the three range: we state the versions we have tested. It moves when a newer React is verified, not
before.

```json
"react": ">=19.0 <19.3",
"react-dom": ">=19.0 <19.3"
```

#### Removed Renderer Props

> **These shipped in alpha.3, not alpha.2.** The alpha.2 notes described them, but the entries were
> written after `v10.0.0-alpha.2` was tagged — "Removed Renderer Props" four days after, the shadow
> default nineteen days after — so anyone reading the published alpha.2 notes was told this had
> already happened when it had not. Moved here, where an alpha.2 → alpha.3 upgrader will meet them.

Removed redundant renderer props that can be passed via `gl` or `renderer` props directly:

**Removed from Canvas/RenderProps:**

- `legacy` - `THREE.ColorManagement.enabled` is now always `true`
- `linear` (deprecated) - Use `gl={{ outputColorSpace: THREE.LinearSRGBColorSpace }}`
- `flat` (deprecated) - Use `gl={{ toneMapping: THREE.NoToneMapping }}`
- `colorSpace` - Use `gl={{ outputColorSpace: ... }}`
- `toneMapping` - Use `gl={{ toneMapping: ... }}`

**Removed from RootState (useThree):**

- `legacy`, `linear`, `flat`, `colorSpace`, `toneMapping`
- Access via `state.renderer.outputColorSpace` and `state.renderer.toneMapping` instead

**Migration:**

```diff
- <Canvas colorSpace={THREE.LinearSRGBColorSpace} toneMapping={THREE.NoToneMapping} />
+ <Canvas gl={{ outputColorSpace: THREE.LinearSRGBColorSpace, toneMapping: THREE.NoToneMapping }} />

- const { colorSpace, toneMapping } = useThree()
+ const { renderer } = useThree()
+ const colorSpace = renderer.outputColorSpace
+ const toneMapping = renderer.toneMapping
```

**Note:** `textureColorSpace` survives, but **not as a Canvas prop**. It moved into
`ColorManagementConfig`, which is intersected into `GLProps` and `RendererProps` — so it goes inside
the config bag, not at the top level:

```diff
- <Canvas textureColorSpace="srgb" />
+ <Canvas gl={{ textureColorSpace: 'srgb' }} />
+ <Canvas renderer={{ textureColorSpace: 'srgb' }} />
```

#### Default shadow type is now `PCFShadowMap`

Changed from `PCFSoftShadowMap` to match three r182 defaults. three deprecated `PCFSoftShadowMap` and
improved the standard `PCFShadowMap`, so R3F aligns with upstream. The legacy `shadows` aliases
`percentage` and `soft` still work, mapping to `PCFShadowMap` with a console warning.

_(Also written into the alpha.2 notes after that tag — see the box above.)_

#### `usePostProcessing` → `useRenderPipeline`

three renamed `PostProcessing` to `RenderPipeline` in r183. `usePostProcessing` was a **public export**
of `@react-three/fiber/webgpu` at alpha.2 and no longer exists, and the store key moved with it.

```diff
- import { usePostProcessing } from '@react-three/fiber/webgpu'
+ import { useRenderPipeline } from '@react-three/fiber/webgpu'

- const { postProcessing } = useThree()
+ const { renderPipeline } = useThree()
```

#### Smaller breaking changes

Individually minor, collectively enough to break a build — none of these were listed before.

- **`useTexture({ cache })` now defaults to `true`.** Every URL-loaded texture enrols in the global
  registry and persists until disposed. If you were relying on textures being collected, this reads
  like a leak. Opt out per call with `{ cache: false }`.
- **`useTextures()` return shape changed.** `textures` is now `all`; `addMultiple`, `remove`,
  `removeMultiple` and `disposeMultiple` are gone; `dispose()` returns a boolean and is refcount-gated,
  so it no longer disposes a texture another consumer still holds.
- **Pointer-move raycasts are deferred to frame start by default** (`events.frameTimedRaycasts: true`).
  Moves are now processed once per frame rather than per DOM event.
- **The default camera is a child of `scene`.** This shifts every index in `scene.children` by one —
  code doing `scene.children[0]` to reach the first rendered object now gets the camera.
- **`advance()` is narrowed to `(timestamp: number)`.** Extra arguments are a type error.
- **`Mutable<P>` now uses `-readonly`** rather than `P[K] | Readonly<P[K]>`, which affects every
  `ThreeElement` prop type.
- **`ObjectMap` is generic**, with `Record<>` members.
- **Canvas CSS is `width: 100%; height: 100%`**, and `setSize(w, h, false)` is now unconditional.
- **`TextureEntry` is no longer exported** from the default entry.
- **`@react-three/test-renderer` entry paths and peer range changed** — see that package's changelog.

### Features

#### Interactive Priority (userData.interactivePriority)

Added support for object-level interactive priority in the event system. Objects with `userData.interactivePriority` take precedence over standard distance-based hit testing, enabling UI controls that render on top via depth tricks to receive events correctly.

```tsx
// This mesh receives events even if behind other objects in world space
<mesh userData={{ interactivePriority: 1 }}>
  <boxGeometry />
  <meshBasicMaterial />
</mesh>

// Higher values take precedence
<mesh userData={{ interactivePriority: 10 }}>
  {/* Receives events before interactivePriority: 1 */}
</mesh>
```

**Sort order:**

1. Objects with `interactivePriority` come before objects without
2. Higher `interactivePriority` values win among prioritized objects
3. Then standard `events.priority` (portal/layer priority)
4. Then distance (closer first)

**Use cases:** Transform controls (PivotControls), UI overlays, debug helpers that use depth tricks to render on top.

**Files changed:**

- `packages/fiber/src/core/events.ts` - Added interactivePriority check in hit sorting

#### useBuffers & useGPUStorage Hooks

Added two new hooks for managing GPU storage in compute-intensive WebGPU applications:

**useBuffers** - Manages buffer data for GPU compute:

```tsx
import { useBuffers } from '@react-three/fiber/webgpu'
import { instancedArray } from 'three/tsl'

const { positions, velocities } = useBuffers(
  () => ({
    positions: instancedArray(count, 'vec3'),
    velocities: new Float32Array(count * 3),
  }),
  'particles',
)
```

**useGPUStorage** - Manages GPU storage textures:

```tsx
import { useGPUStorage } from '@react-three/fiber/webgpu'
import { StorageTexture } from 'three/webgpu'

const { heightMap } = useGPUStorage(
  () => ({
    heightMap: new StorageTexture(512, 512),
  }),
  'terrain',
)
```

**Key features:**

- Same API pattern as `useNodes` and `useUniforms`
- Scoped storage with create-if-not-exists semantics
- Accessible in node creators via `({ buffers, gpuStorage }) => ...`
- Utility functions: `removeBuffers/Storage`, `clearBuffers/Storage`, `rebuildBuffers/Storage`, `disposeBuffers/Storage`
- GPU resource disposal via `disposeBuffers()` and `disposeStorage()`

**Supported types:**

- **useBuffers**: TypedArrays, BufferAttribute, StorageBufferAttribute, TSL buffer nodes (`instancedArray`, `storage`)
- **useGPUStorage**: StorageTexture, Storage3DTexture, TSL storage texture nodes

**Files changed:**

- `packages/fiber/src/core/store.ts` - Added `buffers: {}`, `gpuStorage: {}` to state
- `packages/fiber/types/store.d.ts` - Added BufferLike, BufferStore, StorageLike, StorageStore types
- `packages/fiber/src/webgpu/hooks/useBuffers.tsx` - **NEW** Buffer management hook
- `packages/fiber/src/webgpu/hooks/useGPUStorage.tsx` - **NEW** GPU storage management hook
- `packages/fiber/src/webgpu/hooks/ScopedStore.ts` - Added buffers/gpuStorage to CreatorState
- `packages/fiber/src/webgpu/hooks/index.ts` - Export new hooks
- `packages/fiber/src/webgpu/hooks/readmes/useBuffers-useGPUStorage.md` - **NEW** Documentation

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

#### Frame Scheduler Extracted to `@pmndrs/scheduler`

The frame scheduler is no longer bundled in fiber. It now ships as its own package,
`@pmndrs/scheduler`, and is consumed as a normal dependency. Named phases, `before`/`after`
constraints, per-callback fps throttling and the single shared RAF all behave as before.

#### `useTextures` — Reactive Texture Registry

**EXPERIMENTAL (A5).** A reactive, refcounted texture registry. The API may change before stable.

### Bug Fixes

- Fixed memory leak in `createPortal` where subscriptions to parent store were never cleaned up. When portals were created/destroyed frequently (e.g., with rapidly changing data), each portal subscribed to `previousRoot` but never unsubscribed, keeping the portal's zustand store and all its state in memory indefinitely.
- Fixed portal `size` state being overwritten by parent resize events. Portals now correctly preserve their own size override when the root canvas resizes, matching the existing behavior for `events`. This also fixes nested portals ignoring their size configuration.
- Fixed `setSize` not triggering a frame in demand mode. Now calls `scheduler.invalidate()` directly so `useFrame` callbacks can respond to size changes.
- Fixed `state.frustum` being stale when read during the render phase. The frustum and visibility
  checks now run via `{ before: 'render' }` rather than an unregistered `preRender` phase.
- Fixed `autoUpdateFrustum` and `occlusion` Canvas props not being forwarded to `configure()` —
  they fell through to the wrapper `<div>` instead.
- Fixed the `background` URL detection regex, which was over-escaped and never matched.
- Fixed HMR not clearing the buffer and GPU-storage caches, so only nodes/uniforms rebuilt.
- Fixed multi-canvas TSL state not being shared: WebGPU hooks now resolve `primaryStore` when
  present and fall back to the local store for single-canvas roots.
- Fixed runtime `setFrameloop()` never reaching the scheduler, so imperative mode changes had no
  effect on the RAF loop.
- Fixed `useRenderPipeline` constructing `THREE.PostProcessing`, which three deprecated in r183 in
  favour of `RenderPipeline` and which warns on construction. R3F now constructs `THREE.RenderPipeline`
  directly — with the peer floor at r185 there is no version left to fall back for.
- Fixed React 19.2's `cloneRootViewTransitionContainer` / `removeRootViewTransitionClone` host
  methods throwing `Not implemented.`; they are now no-ops.
- Fixed an async `gl` factory being invoked more than once when `configure()` calls overlapped.
- Fixed the Canvas `fallback` not being visible when renderer setup failed — it lived inside
  `<canvas>`, which browsers never paint.
- Fixed pointer events silently dying after an `args`-triggered reconstruction.
- Fixed `ShaderMaterial` uniforms losing their target reference across prop updates.
- Added a custom `cacheKey` argument to `useLoader` / `.preload` / `.clear` for assets fetched
  from URLs that change per request.
- Fixed visibility handlers (`onFramed`/`onOccluded`/`onVisible`) keeping a stale closure. Handler
  registration sat behind a check comparing the handler _count_, so swapping `onOccluded` for a
  different function left the count unchanged and the registry kept a snapshot of the old closure.
  Inline handlers (`onFramed={() => …}`) produce a new function every render, which is the common
  case — so an updated callback would simply never fire. Registration now runs on every prop update
  and updates in place, preserving the last-known visibility state instead of re-firing events for
  transitions that did not happen.
- **Fixed TSL hot module replacement rebuilding against stale scoped state.** Vite would hot-update
  a WebGPU scene without a full reload, but the remounted scene reused the previous module's TSL
  nodes: the first edit lost environment lighting, the second lost the mesh entirely, while a cold
  reload of the same code was correct. Two causes in `webgpu/hooks/useNodes.tsx` — creator mode
  called `store.setState` inside `useMemo` during render (producing a React "Cannot update … while
  rendering" error on every HMR remount), and the creator-mode cache returned the old module's
  nodes because nothing invoked the existing `rebuildNodes`/`_hmrVersion` bust on the HMR path.
  Registration is now atomic and generation-aware. Verified live over three consecutive edits on a
  real GPU.
- Ported the reconciler hardening released in `@react-three/fiber@9.7.0`: removed pierced props
  reset on their pierced target rather than the object root; reconstructed instances flushed in
  `resetAfterCommit` so `args`/`primitive` changes apply even when the last updated sibling bailed
  out.

  Three parts of that port are **behaviour changes rather than fixes**, and are worth knowing about:
  - **`commitUpdate` now syncs `instance.props` wholesale.** Removed props no longer linger, changed
    reserved props (`onUpdate`, `dispose`) take effect — and imperative mutations survive a re-render
    instead of being stomped by re-applied defaults. That last one is the change people will notice.
  - **`dragenter`/`dragleave` moved from Discrete to Continuous priority**, matching react-dom.
  - **The reconciler now schedules via microtasks.**

### Examples

- Added **NestedCamera** demo showcasing camera-attached headlights using the new Portal component
  - Demonstrates figure-8 path camera movement
  - Shows spotlights following camera orientation
  - Located at `example/src/demos/default/NestedCamera.tsx`
- Added **Layered Reality** demo showcasing multi-canvas rendering with HTML content sandwiched between two 3D layers
  - Background canvas renders the main scene (ring, wireframe shapes)
  - Foreground canvas renders in front of HTML using shared WebGPU renderer
  - Demonstrates `renderer={{ primaryCanvas: 'id' }}` and render phase control
  - Located at `example/src/demos/default/Layered.tsx`

### Maintenance

- `@react-three/test-renderer` now has a real build. It previously had no build script and no
  `dist`, while `main`/`module`/`types` all pointed into `dist/` — it would have published broken.
- Removed dead `Instance.deferredRefs`.
- Renamed the last internal `PostProcessing`/`pp` identifiers to `RenderPipeline`/`pipeline`.
- Dropped the dangling `heroes` entry from `pnpm-workspace.yaml`.
- Corrected `pnpm ci` to `pnpm run ci` in CLAUDE.md and docs — pnpm reserves `ci` as a built-in,
  so the documented command always errored instead of running the gate.
- Stubbed the HDR loader in the background-preset test, which previously made a live network
  request to raw.githack.com and failed offline.
- Documentation consolidated into a single canonical home under `docs/`, with stale v9 API
  references corrected and a CI link check added. Readmes beside source are now thin pointers.
- The docs link check no longer fails on third-party hosts that are merely slow, and the
  cc0textures links it kept tripping over now point at ambientCG, which is where that site moved.

---

## 10.0.0-alpha.2

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
- Fixed absolute Windows paths appearing in bundled type declarations by defining `FiberRoot` locally instead of importing from `react-reconciler`
- Fixed eslint-plugin codegen script not awaiting prettier format before writing files
- Fixed type exports in `reconciler.d.ts` and `three.d.ts` to properly export Three.js types

### Maintenance

- Migrated to ESLint 9 flat config
- Updated Vite to v7
- Updated Prettier to v3 and reformatted codebase
- Updated Husky to v9 and lint-staged to v16
- Updated various dependencies to latest versions
- Converted `verify-bundles.js` script to ES modules

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
- `packages/fiber/types/reconciler.d.ts` - Fixed type exports
- `packages/fiber/types/three.d.ts` - Fixed type exports

---

## Previous Alpha Releases

See git history for changes prior to this changelog.
