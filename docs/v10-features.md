---
title: 'v10 New Features'
description: New features and additions in react-three-fiber v10
nav: 15
---

# v10 New Features

This document covers new features added in v10. For breaking changes and migration steps, see the [v10 Migration Guide](./v10-migration.md).

---

## Camera Scene Parenting

In v10, the default camera is automatically added as a child of the scene when it doesn't have a parent. This enables camera-relative effects like HUDs, cockpit displays, or any objects that should follow the camera.

### Why This Matters

In previous versions, the default camera existed outside the scene graph. This meant any children attached to it wouldn't render because Three.js only renders objects that are part of the scene hierarchy.

```tsx
// Before v10: Children wouldn't render
const { camera } = useThree()
camera.add(hudMesh) // hudMesh never appears!

// In v10: This now works automatically
const { camera } = useThree()
camera.add(hudMesh) // hudMesh renders and follows the camera
```

### Common Use Cases

**HUD / UI Elements:**

```tsx
function HUD() {
  const { camera } = useThree()
  const hudRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (hudRef.current) {
      camera.add(hudRef.current)
      return () => camera.remove(hudRef.current!)
    }
  }, [camera])

  return (
    <group ref={hudRef} position={[0, 0, -2]}>
      <mesh>
        <planeGeometry args={[0.5, 0.1]} />
        <meshBasicMaterial color="green" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}
```

**Camera-Attached Lights:**

```tsx
function Flashlight() {
  const { camera } = useThree()
  const lightRef = useRef<THREE.SpotLight>(null)

  useEffect(() => {
    if (lightRef.current) {
      camera.add(lightRef.current)
      camera.add(lightRef.current.target)
      lightRef.current.target.position.set(0, 0, -1)
      return () => {
        camera.remove(lightRef.current!)
        camera.remove(lightRef.current!.target)
      }
    }
  }, [camera])

  return <spotLight ref={lightRef} intensity={2} angle={0.3} />
}
```

### Custom Camera Behavior

If you provide your own camera that already has a parent, R3F respects your setup and won't re-parent it:

```tsx
function App() {
  const customCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera()
    someGroup.add(cam) // You've parented it yourself
    return cam
  }, [])

  return <Canvas camera={customCamera}>{/* Camera stays parented to someGroup */}</Canvas>
}
```

### Portal Component for Camera Children

The `Portal` component provides a declarative way to render children into the camera (or any container). This is cleaner than imperative `camera.add()` calls:

```tsx
import { Portal, useThree } from '@react-three/fiber'

function CameraHeadlights() {
  const { camera } = useThree()

  return (
    <Portal container={camera}>
      {/* These render as camera children */}
      <spotLight position={[-0.5, -0.3, 0]} intensity={100} />
      <spotLight position={[0.5, -0.3, 0]} intensity={100} />
    </Portal>
  )
}
```

Portal accepts any `Object3D` as a container - camera, groups, or any other scene object. Children are automatically added on mount and removed on unmount.

---

## Prop Utilities

v10 adds two utilities for common prop patterns that previously required imperative code.

### fromRef - Deferred Ref Resolution

The `fromRef` utility defers prop application until refs are populated. This is essential for props like `target` that reference sibling elements:

```tsx
import { fromRef } from '@react-three/fiber'

function SpotlightWithTarget() {
  const targetRef = useRef<THREE.Object3D>(null)

  return (
    <>
      <group ref={targetRef} position={[0, 0, -10]} />
      {/* target resolves after targetRef is populated */}
      <spotLight target={fromRef(targetRef)} intensity={100} />
    </>
  )
}
```

**Before v10** you needed a `useEffect` to set the target after mount:

```tsx
// Old approach - required useEffect
useEffect(() => {
  if (lightRef.current && targetRef.current) {
    lightRef.current.target = targetRef.current
  }
}, [])
```

**With fromRef** the relationship is declarative and automatic.

### once - Mount-Only Method Calls

The `once` utility marks a method to be called only on initial mount. This is useful for geometry transforms that shouldn't be reapplied on every render:

```tsx
import { once } from '@react-three/fiber'

// Rotate geometry 90 degrees on mount
<boxGeometry args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />

// Center geometry on mount
<bufferGeometry center={once()} />

// Apply matrix on mount
<bufferGeometry applyMatrix4={once(transformMatrix)} />
```

**Why this matters:** Without `once`, putting `rotateX={Math.PI / 2}` as a prop would apply the rotation every render, compounding the rotation. With `once`, it applies exactly once when the geometry is created.

**Reconstruction behavior:** When `args` changes (triggering element reconstruction), `once` methods run again on the new instance.

---

## useRenderTarget

The `useRenderTarget` hook creates a render target (FBO) that is automatically compatible with the current renderer, whether WebGL or WebGPU.

### Why This Matters

Three.js has different render target classes for different renderers:

- `WebGLRenderTarget` for WebGLRenderer
- `RenderTarget` for WebGPURenderer

With v10's dual-renderer support, you need the right type for your active renderer. This hook handles that automatically.

### Basic Usage

```tsx
import { useRenderTarget, useFrame } from '@react-three/fiber'

function PortalScene() {
  // Creates the correct render target type for your renderer
  const fbo = useRenderTarget(512, 512, { depthBuffer: true, samples: 4 })

  useFrame(({ renderer, scene, camera }) => {
    renderer.setRenderTarget(fbo)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
  })

  return (
    <mesh>
      <planeGeometry />
      <meshBasicMaterial map={fbo.texture} />
    </mesh>
  )
}
```

### Flexible Arguments

The hook accepts multiple argument patterns for convenience:

```tsx
// Use canvas size (resizes with canvas)
const fbo = useRenderTarget()

// Canvas size with options
const fbo = useRenderTarget({ samples: 4 })

// Square render target (512×512)
const fbo = useRenderTarget(512)

// Square render target with options
const fbo = useRenderTarget(512, { depthBuffer: true })

// Explicit dimensions
const fbo = useRenderTarget(512, 256)

// Explicit dimensions with options
const fbo = useRenderTarget(512, 256, { samples: 4 })
```

### API

```ts
// Canvas size (defaults to canvas dimensions)
useRenderTarget(options?: RenderTargetOptions)

// Square render target
useRenderTarget(size: number, options?: RenderTargetOptions)

// Explicit dimensions
useRenderTarget(width: number, height: number, options?: RenderTargetOptions)
```

### Options

| Option            | Type      | Default            | Description               |
| ----------------- | --------- | ------------------ | ------------------------- |
| `depthBuffer`     | `boolean` | `true`             | Create depth buffer       |
| `stencilBuffer`   | `boolean` | `false`            | Create stencil buffer     |
| `samples`         | `number`  | `0`                | MSAA sample count         |
| `count`           | `number`  | `1`                | MRT target count (WebGPU) |
| `format`          | `number`  | `RGBAFormat`       | Texture format            |
| `type`            | `number`  | `UnsignedByteType` | Data type                 |
| `minFilter`       | `number`  | `LinearFilter`     | Minification filter       |
| `magFilter`       | `number`  | `LinearFilter`     | Magnification filter      |
| `generateMipmaps` | `boolean` | `false`            | Generate mipmaps          |

### Build Behavior

The hook is optimized for each build target:

- **Legacy build** (`@react-three/fiber/legacy`): Always returns `WebGLRenderTarget`
- **WebGPU build** (`@react-three/fiber/webgpu`): Always returns `RenderTarget`
- **Default build** (`@react-three/fiber`): Returns the appropriate type based on active renderer

---

## Visibility Events

v10 adds three new event handlers for tracking object visibility state changes. These events fire when visibility transitions occur, not every frame.

### onFramed - Frustum Culling Events

Fires when an object enters or exits the camera frustum:

```tsx
function FrustumAwareObject() {
  return (
    <mesh
      onFramed={(inView) => {
        console.log(inView ? 'Object entered view' : 'Object left view')
      }}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

Common use cases:

- Pausing animations when off-screen
- Loading/unloading heavy resources
- Analytics tracking for what users see

### onOccluded - Occlusion Events (WebGPU Only)

Fires when an object becomes occluded or visible based on GPU occlusion queries. This only works with WebGPU renderer:

```tsx
function OcclusionAwareObject() {
  return (
    <mesh
      onOccluded={(occluded) => {
        console.log(occluded ? 'Object is hidden behind something' : 'Object is visible')
      }}>
      <sphereGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

The `occlusionTest` flag is automatically enabled on the object when using this handler.

**Note:** Occlusion queries are automatically enabled when any object uses `onOccluded` or `onVisible`. You can also enable it explicitly:

```tsx
<Canvas occlusion>{/* ... */}</Canvas>
```

If you use occlusion handlers with a WebGL renderer, a warning will be logged and the events won't fire.

### onVisible - Combined Visibility Events

Fires when the combined visibility state changes. An object is considered visible when:

- It's within the camera frustum (in view)
- It's not occluded (WebGPU only, otherwise always considered not occluded)
- Its `visible` property is `true`

```tsx
function FullyVisibleObject() {
  return (
    <mesh
      onVisible={(visible) => {
        if (visible) {
          // Start expensive animations, load high-res textures, etc.
        } else {
          // Pause animations, reduce quality, etc.
        }
      }}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Performance Notes

- Events only fire on state changes, not every frame
- Frustum checks use `THREE.Frustum.intersectsObject()` which relies on bounding spheres
- The visibility system runs in the `preRender` phase after frustum updates
- Objects are automatically unregistered when unmounted

### Implementation Details

When occlusion queries are enabled, R3F adds an internal helper group (`__r3fInternal`) to the scene. This group contains an invisible observer mesh that caches occlusion query results during the render pass. This is necessary because WebGPU's `isOccluded()` method only returns valid results during rendering.

The helper group and observer mesh:

- Are invisible and have no visual impact
- Are automatically cleaned up on unmount
- Can be identified by the `__r3fInternal` property if needed

If you're counting scene children, be aware this group exists when occlusion is enabled.

### Event Handler Reference

| Handler      | Parameter           | Description                                  |
| ------------ | ------------------- | -------------------------------------------- |
| `onFramed`   | `inView: boolean`   | `true` when in frustum, `false` when out     |
| `onOccluded` | `occluded: boolean` | `true` when occluded, `false` when visible   |
| `onVisible`  | `visible: boolean`  | `true` when fully visible, `false` otherwise |

---

## Camera Frustum

v10 exposes a `THREE.Frustum` on the root state that stays synchronized with the default camera. The visibility events above (`onFramed`, `onVisible`) use this frustum internally for frustum culling checks, but you can also use it directly for custom visibility logic.

### Basic Usage

```tsx
import { useThree } from '@react-three/fiber'

function VisibilityCheck() {
  const { frustum } = useThree()

  // Check if a point is visible
  const point = new THREE.Vector3(0, 5, 0)
  if (frustum.containsPoint(point)) {
    // Point is in view
  }

  // Check if an object is visible (uses bounding sphere)
  if (frustum.intersectsObject(mesh)) {
    // Object is at least partially visible
  }

  // Check against a bounding sphere directly
  if (frustum.intersectsSphere(boundingSphere)) {
    // Sphere intersects frustum
  }
}
```

### In the Frame Loop

The frustum is updated automatically each frame (after all `update` phase callbacks, before `render`), so you can use it in `useFrame` for visibility-based logic:

```tsx
useFrame(({ frustum }) => {
  // LOD based on visibility
  for (const object of objects) {
    object.visible = frustum.intersectsObject(object)
  }

  // Or custom culling logic
  particles.forEach((particle) => {
    particle.needsUpdate = frustum.containsPoint(particle.position)
  })
})
```

### Disabling Auto-Update

If you don't need frustum updates or want to control updates manually, disable auto-updating via Canvas props:

```tsx
<Canvas autoUpdateFrustum={false}>
  <Scene />
</Canvas>
```

### Manual Frustum Updates

The `updateFrustum` utility is also exported for manual control:

```tsx
import { updateFrustum } from '@react-three/fiber'

// Update an existing frustum (no allocation)
updateFrustum(camera, existingFrustum)

// Create a new frustum from a camera
const newFrustum = updateFrustum(camera)

// Use with a different camera (e.g., shadow camera, portal camera)
updateFrustum(light.shadow.camera, shadowFrustum)
```

### State Properties

| Prop                | Description                             | Type            |
| ------------------- | --------------------------------------- | --------------- |
| `frustum`           | Camera frustum for visibility checks    | `THREE.Frustum` |
| `autoUpdateFrustum` | Whether frustum auto-updates each frame | `boolean`       |

### Canvas Props

| Prop                | Description                              | Default |
| ------------------- | ---------------------------------------- | ------- |
| `autoUpdateFrustum` | Enable/disable automatic frustum updates | `true`  |

---

## HMR Support for TSL Hooks

v10 includes automatic Hot Module Replacement (HMR) support for the WebGPU TSL hooks (`useNodes`, `useUniforms`, `useRenderPipeline`). When you save changes to files containing TSL node or uniform definitions, they automatically refresh without a full page reload.

### How It Works

The Canvas component automatically detects HMR events from Vite or webpack and refreshes the TSL state:

```tsx
// Just works! Save your file and see changes immediately
const { wobble } = useNodes(() => ({
  wobble: sin(time.mul(2)), // Change to mul(5), save, see update
}))

const { uColor } = useUniforms({
  uColor: '#ff0000', // Change color, save, see update
})
```

### Disabling HMR

If you need to disable automatic HMR refresh (rare), use the `hmr` prop:

```tsx
<Canvas hmr={false}>{/* HMR won't auto-refresh TSL state */}</Canvas>
```

### Manual Rebuild

For edge cases or programmatic control, hooks return a rebuild function:

```tsx
const { wobble, rebuildNodes } = useNodes(() => ({
  wobble: sin(time.mul(2)),
}))

const { uColor, rebuildUniforms } = useUniforms({
  uColor: '#ff0000',
})

// Force rebuild (clears cache and re-runs creators)
rebuildNodes() // Rebuild all nodes
rebuildNodes('player') // Rebuild only 'player' scope
rebuildUniforms() // Rebuild all uniforms
```

### Global Rebuild Functions

For advanced use cases (custom HMR handlers, dev tools), standalone rebuild functions are exported:

```tsx
import { rebuildAllNodes, rebuildAllUniforms } from '@react-three/fiber/webgpu'

// Requires the R3F store reference
rebuildAllNodes(store)
rebuildAllUniforms(store)
```

### Reader Reactivity

Reader-mode hooks now properly subscribe to store changes:

```tsx
// These now reactively update when nodes/uniforms change elsewhere
const allNodes = useNodes()
const playerNodes = useNodes('player')
const allUniforms = useUniforms()
const playerUniforms = useUniforms('player')
```

---

## Canvas Size Control

v10 adds `width` and `height` props to Canvas for explicit resolution control. This enables use cases like video export at specific resolutions (e.g., 4K) independent of the container's CSS size.

### Basic Usage

```tsx
// Fixed resolution - canvas renders at 1920×1080 regardless of container
<Canvas width={1920} height={1080}>
  <Scene />
</Canvas>

// Square canvas
<Canvas width={800}>
  <Scene />
</Canvas>

// Responsive (default, unchanged behavior)
<Canvas>
  <Scene />
</Canvas>
```

### Video Export Use Case

The primary motivation is capturing video frames at specific resolutions:

```tsx
function VideoExportScene() {
  const { gl, scene, camera } = useThree()

  const captureFrame = () => {
    // Canvas is rendering at 3840×2160 for 4K export
    gl.render(scene, camera)
    const frame = new VideoFrame(gl.domElement)
    // Use frame with MediaRecorder, WebCodecs, etc.
  }

  return <mesh>{/* ... */}</mesh>
}

// 4K resolution for video, displayed scaled in container
;<Canvas width={3840} height={2160} dpr={1}>
  <VideoExportScene />
</Canvas>
```

### Imperative Size Control

The `setSize` API has been enhanced with new capabilities:

```tsx
function DynamicResolution() {
  const { setSize } = useThree()

  // Temporarily boost to 4K for capture, then reset
  const captureAt4K = async () => {
    setSize(3840, 2160) // Take ownership, render at 4K
    await captureFrame()
    setSize() // Reset to props/container
  }

  // Create square canvas
  const makeSquare = () => {
    setSize(1024) // 1024×1024 square
  }

  return <button onClick={captureAt4K}>Capture 4K</button>
}
```

### Ownership Model

The size control follows an ownership model:

1. **Props mode** (default): Canvas uses `width`/`height` props, or falls back to container measurement
2. **Imperative mode**: Once `setSize(w, h)` is called, it takes ownership
3. **Reset**: Call `setSize()` with no arguments to return to props/container mode

```tsx
// Initial: props control size (1920×1080)
<Canvas width={1920} height={1080}>

// User calls setSize(800, 600) → imperative mode, now 800×600
// Container resizes → ignored, still 800×600
// Props change to width={1280} → stored but not applied, still 800×600
// User calls setSize() → reset to props mode, now 1280×1080
```

### API Reference

**Canvas Props:**

| Prop     | Type     | Default     | Description                        |
| -------- | -------- | ----------- | ---------------------------------- |
| `width`  | `number` | `undefined` | Canvas resolution width in pixels  |
| `height` | `number` | `undefined` | Canvas resolution height in pixels |

**setSize Methods:**

| Call                       | Description                   |
| -------------------------- | ----------------------------- |
| `setSize()`                | Reset to props/container mode |
| `setSize(n)`               | Set to n×n square             |
| `setSize(w, h)`            | Set to w×h rectangle          |
| `setSize(w, h, top, left)` | Set with position (existing)  |

### Notes

- **DPR**: Width/height are logical size. DPR multiplies as usual. For exact pixel control (e.g., 3840×2160 exactly), set `dpr={1}`.
- **CSS**: When canvas resolution differs from container, CSS scales the canvas to fit. The canvas renders at full resolution internally.
- **Partial props**: You can specify just `width` or just `height`; the other dimension comes from container measurement.

---

## Texture Color Space

R3F provides a `textureColorSpace` prop to control how 8-bit input textures (color maps) are interpreted:

```tsx
// sRGB textures (default - most textures are authored in sRGB)
<Canvas textureColorSpace={THREE.SRGBColorSpace}>

// Linear textures
<Canvas textureColorSpace={THREE.LinearSRGBColorSpace}>
```

### Renderer Color Settings

For renderer-level settings like `outputColorSpace` and `toneMapping`, pass them via the `gl` or `renderer` props:

```tsx
// Configure renderer color space and tone mapping
<Canvas gl={{
  outputColorSpace: THREE.LinearSRGBColorSpace,
  toneMapping: THREE.NoToneMapping
}}>

// Access from components
function ColorInfo() {
  const { renderer } = useThree()
  console.log(renderer.outputColorSpace)
  console.log(renderer.toneMapping)
  return null
}
```

**Defaults:**

- `outputColorSpace`: `THREE.SRGBColorSpace`
- `toneMapping`: `THREE.ACESFilmicToneMapping`

---

## Multi-Canvas Rendering (WebGPU)

v10 adds support for sharing a single WebGPURenderer across multiple Canvas components. This enables HUD overlays, picture-in-picture views, and multi-viewport rendering without the overhead of multiple GPU contexts.

### Basic Setup

**Primary Canvas** - Creates and owns the renderer:

```tsx
<Canvas id="main" renderer>
  <Scene />
</Canvas>
```

**Secondary Canvas** - Shares the primary's renderer:

```tsx
<Canvas renderer={{ primaryCanvas: 'main' }}>
  <SecondaryScene />
</Canvas>
```

The `id` prop on the primary canvas makes it targetable. Secondary canvases reference it via `renderer={{ primaryCanvas: 'id' }}`.

### Scheduler Options

Control render timing with the `scheduler` option:

```tsx
// Render after the primary canvas completes
<Canvas renderer={{ primaryCanvas: 'main', scheduler: { after: 'main' } }}>

// Limit to 30fps (useful for HUDs that don't need full framerate)
<Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }}>

// Both options together
<Canvas renderer={{ primaryCanvas: 'main', scheduler: { after: 'main', fps: 30 } }}>
```

| Option  | Type     | Description                           |
| ------- | -------- | ------------------------------------- |
| `after` | `string` | Render after another canvas (by `id`) |
| `fps`   | `number` | Limit this canvas's render rate       |

### Accessing the Primary Scene (HUD Pattern)

Secondary canvases can render the primary's scene from a different viewpoint using `primaryStore`:

```tsx
import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { useEffect, useRef } from 'react'
import * as THREE from 'three/webgpu'

function HudScene() {
  const orthoCamera = useRef<THREE.OrthographicCamera>(null!)

  // Create and position the orthographic camera
  useEffect(() => {
    const cam = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 100)
    cam.position.set(0, 10, 0) // Above the scene
    cam.lookAt(0, 0, 0) // Looking at center
    cam.updateProjectionMatrix()
    orthoCamera.current = cam
  }, [])

  // Take over rendering to render the primary's scene
  useFrame(
    ({ primaryStore, renderer }) => {
      if (!orthoCamera.current) return
      // Get the primary canvas's state
      const primaryState = primaryStore.getState()
      // Render the primary's scene with our camera
      renderer.render(primaryState.scene, orthoCamera.current)
    },
    { phase: 'render', after: 'main' },
  )

  return null
}

function App() {
  return (
    <>
      {/* Main 3D scene */}
      <Canvas id="main" renderer>
        <ambientLight />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="orange" />
        </mesh>
      </Canvas>

      {/* HUD overlay - top-down view of the same scene */}
      <div style={{ position: 'absolute', top: 10, left: 10, width: 200, height: 200 }}>
        <Canvas renderer={{ primaryCanvas: 'main', scheduler: { after: 'main' } }}>
          <HudScene />
        </Canvas>
      </div>
    </>
  )
}
```

### How It Works

Each canvas maintains its own:

- Scene graph and camera
- Event handling
- State (via its own Zustand store)

But secondary canvases share:

- The WebGPURenderer instance
- GPU resources and context

The `primaryStore` on each canvas's state provides access to shared TSL resources (uniforms, nodes) and the primary's scene/camera for advanced patterns like HUDs.

### Canvas Target Management

R3F automatically manages `CanvasTarget` switching when rendering to multiple canvases. A job in the scheduler's `start` phase sets the correct canvas target before any other jobs run for that root, so user render callbacks automatically render to the correct canvas.

### API Reference

**Primary Canvas Props:**

| Prop       | Type      | Description                                            |
| ---------- | --------- | ------------------------------------------------------ |
| `id`       | `string`  | Unique identifier, makes canvas targetable             |
| `renderer` | `boolean` | Enable WebGPU renderer (shorthand for `renderer={{}}`) |

**Secondary Canvas Props:**

| Prop                       | Type     | Description                       |
| -------------------------- | -------- | --------------------------------- |
| `renderer.primaryCanvas`   | `string` | ID of the primary canvas to share |
| `renderer.scheduler.after` | `string` | Render after another canvas       |
| `renderer.scheduler.fps`   | `number` | Limit render rate                 |

**State Properties:**

| Property                 | Type        | Description                         |
| ------------------------ | ----------- | ----------------------------------- |
| `primaryStore`           | `RootStore` | Zustand store of the primary canvas |
| `internal.isSecondary`   | `boolean`   | Whether this is a secondary canvas  |
| `internal.isMultiCanvas` | `boolean`   | Whether multi-canvas mode is active |

---

## Canvas Background Prop

v10 adds a flexible `background` prop to Canvas that enables declarative scene background and environment configuration. This replaces the need to manually set up `<color attach="background">` or use separate Environment components for simple cases.

### Simple String Forms

```tsx
// Color (CSS color names, hex values, rgb(), etc.)
<Canvas background="red" />
<Canvas background="#1a1a2e" />
<Canvas background="rgb(100, 149, 237)" />

// Hex number
<Canvas background={0xff0000} />

// URL to HDR/EXR/image file
<Canvas background="/path/to/env.hdr" />
<Canvas background="./sky.exr" />

// Preset name (apartment, city, dawn, forest, lobby, night, park, studio, sunset, warehouse)
<Canvas background="sunset" />
```

### String Detection Logic

When a string is provided, it's detected in this priority order:

1. **Preset** - Exact match against known preset names
2. **URL** - Starts with `/`, `./`, `../`, `http://`, `https://`, OR has image extension (.hdr, .exr, .jpg, .png, .webp, etc.)
3. **Color** - Default fallback (CSS color names, hex values, etc.)

Example: `"city"` → preset, `"./city.jpg"` → URL, `"cyan"` → color

### Expanded Object Form

For advanced scenarios with separate background and environment maps:

```tsx
<Canvas
  background={{
    // Preset or files for environment (PBR lighting/reflections)
    preset: 'city',
    // Or use files directly:
    // files: '/path/to/env.hdr',
    // files: ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'],

    // Separate files for visual backdrop (optional, defaults to same as environment)
    backgroundMap: '/path/to/sky.jpg',

    // Background settings
    backgroundBlurriness: 0.5,
    backgroundIntensity: 1,
    backgroundRotation: [0, Math.PI / 2, 0],

    // Environment settings
    environmentIntensity: 1.2,
    environmentRotation: [0, 0, 0],

    // Base path for file loading
    path: '/textures/',
  }}
/>
```

### Why Use This Instead of `<color attach="background">`

Previously, setting a scene background required:

```tsx
// Old approach - still works but verbose
<Canvas>
  <color attach="background" args={['#1a1a2e']} />
  <Scene />
</Canvas>
```

The new `background` prop is more concise and handles more cases:

```tsx
// New approach - cleaner
<Canvas background="#1a1a2e">
  <Scene />
</Canvas>

// And supports environments directly
<Canvas background="sunset">
  <Scene />
</Canvas>
```

### Environment Component

The underlying `Environment` component is also exported for direct use:

```tsx
import { Environment } from '@react-three/fiber'

// Use directly for more control
;<Canvas>
  <Environment preset="sunset" background />
  <Scene />
</Canvas>
```

### API Reference

**Simple Forms:**

| Input Type    | Example                     | Description                              |
| ------------- | --------------------------- | ---------------------------------------- |
| Color string  | `"red"`, `"#ff0000"`        | CSS color for solid background           |
| Hex number    | `0xff0000`                  | Numeric color for solid background       |
| Preset string | `"city"`, `"sunset"`        | HDRI preset for environment + background |
| URL string    | `"/env.hdr"`, `"./sky.jpg"` | File path for environment texture        |

**Object Form Properties:**

| Property               | Type                 | Description                                  |
| ---------------------- | -------------------- | -------------------------------------------- |
| `preset`               | `string`             | HDRI preset name                             |
| `files`                | `string \| string[]` | File path(s) for environment                 |
| `backgroundMap`        | `string \| string[]` | Separate file(s) for visual backdrop         |
| `backgroundBlurriness` | `number`             | Blur factor (0-1, default: 0)                |
| `backgroundIntensity`  | `number`             | Background brightness (default: 1)           |
| `backgroundRotation`   | `[x, y, z]`          | Background rotation in radians               |
| `environmentIntensity` | `number`             | Environment lighting brightness (default: 1) |
| `environmentRotation`  | `[x, y, z]`          | Environment rotation in radians              |
| `path`                 | `string`             | Base path for file loading                   |

---

## Frame-Timed Raycasting

v10 introduces a performance optimization for pointer events: **frame-timed raycasting**. Instead of raycasting on every `pointermove` event (which can fire 1000+ times per second on high-refresh systems), R3F now defers move/hover raycasts to frame start, performing at most one raycast per frame.

### How It Works

- **Pointer moves are deferred**: When `pointermove` fires, the pointer position is updated immediately (for responsive feel), but the actual raycast is queued for the next frame's `input` phase.
- **Clicks raycast immediately**: Click events (`pointerdown`, `pointerup`, `click`, etc.) always raycast synchronously to ensure accuracy.
- **Scroll events**: By default, scroll (`wheel`) events also raycast immediately.

This means if your mouse moves 10 times between frames, R3F only performs 1 raycast instead of 10.

### Configuration

Frame-timed raycasting is **enabled by default** in v10. You can configure it via the `events` prop or `setEvents`:

```tsx
// Disable frame-timed raycasting (sync behavior like v9)
<Canvas events={(store) => {
  const events = createPointerEvents(store)
  events.frameTimedRaycasts = false
  return events
}}>
```

Or dynamically:

```tsx
function DisableFrameTiming() {
  const { setEvents } = useThree()

  useEffect(() => {
    setEvents({ frameTimedRaycasts: false })
  }, [])

  return null
}
```

### Event Manager Options

| Option               | Type      | Default | Description                                                                   |
| -------------------- | --------- | ------- | ----------------------------------------------------------------------------- |
| `frameTimedRaycasts` | `boolean` | `true`  | Defer pointer move raycasting to frame start (only when `frameloop='always'`) |
| `alwaysFireOnScroll` | `boolean` | `true`  | Always raycast immediately on scroll events                                   |
| `updateOnFrame`      | `boolean` | `false` | Re-raycast every frame (for moving objects under cursor)                      |

> **Note:** Frame-timed raycasting is automatically disabled when `frameloop` is `'demand'` or `'never'`, since the frame loop may not run to flush deferred events.

### Update on Frame

When objects move under a stationary cursor, hover events won't fire unless you enable `updateOnFrame`:

```tsx
function Scene() {
  const { events } = useThree()

  useEffect(() => {
    events.updateOnFrame = true
    return () => {
      events.updateOnFrame = false
    }
  }, [events])

  return <AnimatedMesh />
}
```

With `updateOnFrame: true`, R3F re-raycasts every frame using the last known pointer position. This detects hover changes from moving objects or camera movement.

### Manual Updates

You can manually trigger a raycast using `events.update()`:

```tsx
function CameraControls() {
  const { events } = useThree()

  // Re-raycast when camera moves
  const onCameraMove = () => {
    events.update?.() // Re-raycast all pointers
    // Or for a specific pointer:
    events.update?.(1) // Re-raycast pointer ID 1
  }
}
```

### Flush Method

The `events.flush()` method processes all pending deferred raycasts immediately:

```tsx
const { events } = useThree()

// Force process all pending pointer raycasts
events.flush?.()
```

This is called automatically at the start of each frame (in the scheduler's `input` phase).

---

## Per-Pointer State (Multi-Touch Support)

v10 refactors the event system to track state **per pointer**, enabling proper multi-touch support and preparing for WebXR integration.

### How It Works

Previously, R3F tracked hover state in a single global `internal.hovered` map. Now, each pointer (touch finger, mouse, XR controller) has its own state in `internal.pointerMap`:

```typescript
type PointerState = {
  hovered: Map<string, ThreeEvent<DomEvent>> // Objects this pointer is hovering
  captured: Map<THREE.Object3D, PointerCaptureTarget> // Capture state
  initialClick: [x: number, y: number] // Click start position
  initialHits: THREE.Object3D[] // Objects hit on click start
}

// Access via internal.pointerMap
const pointerState = state.internal.pointerMap.get(pointerId)
```

### Multi-Touch Example

With per-pointer state, each touch finger tracks its own hover state independently:

```tsx
function MultiTouchDemo() {
  const [touches, setTouches] = useState<number[]>([])

  return (
    <mesh
      onPointerEnter={(e) => {
        console.log(`Pointer ${e.pointerId} entered`)
        setTouches((prev) => [...prev, e.pointerId])
      }}
      onPointerLeave={(e) => {
        console.log(`Pointer ${e.pointerId} left`)
        setTouches((prev) => prev.filter((id) => id !== e.pointerId))
      }}>
      <boxGeometry />
      <meshStandardMaterial color={touches.length > 0 ? 'hotpink' : 'orange'} />
    </mesh>
  )
}
```

### XR Pointer Registration (API Preview)

The event system now includes an API for registering XR pointers (controllers, hands, gaze). This enables XR systems to participate in the same event flow as DOM pointers:

```tsx
// Register an XR controller as a pointer
const pointerId = events.registerPointer?.({
  ray: controllerRay, // THREE.Ray updated each frame
  type: 'controller',
  handedness: 'right',
})

// XR system updates the ray and triggers raycasting
events.update?.(pointerId)

// Unregister when controller disconnects
events.unregisterPointer?.(pointerId)
```

**Note:** This is a low-level API. XR integration libraries will typically handle this automatically.

### Backwards Compatibility

The deprecated `internal.hovered`, `internal.capturedMap`, `internal.initialClick`, and `internal.initialHits` properties are still maintained for backwards compatibility. They reflect the combined state from all pointers:

```tsx
// Still works, but deprecated
const hoveredCount = state.internal.hovered.size

// New approach - check specific pointer
const pointer0State = state.internal.pointerMap.get(0)
const hoveredByMouse = pointer0State?.hovered.size ?? 0
```

---

## useBuffers & useGPUStorage Hooks (WebGPU)

v10 adds two new hooks for managing GPU storage in compute-intensive applications:

- **`useBuffers`** - Manages buffer data: TypedArrays, BufferAttributes, and TSL buffer nodes (`instancedArray`, `storage`)
- **`useGPUStorage`** - Manages GPU storage textures: `StorageTexture`, `Storage3DTexture`, and TSL storage texture nodes

These hooks follow the same pattern as `useNodes` and `useUniforms`, with scoped storage and create-if-not-exists semantics.

### Basic Usage

```tsx
import { useBuffers, useGPUStorage, useNodes } from '@react-three/fiber/webgpu'
import { instancedArray } from 'three/tsl'
import { StorageTexture } from 'three/webgpu'

// Create buffer storage for particle data
const { positions, velocities } = useBuffers(
  () => ({
    positions: instancedArray(count, 'vec3'),
    velocities: new Float32Array(count * 3),
  }),
  'particles',
)

// Create texture storage for compute results
const { heightMap } = useGPUStorage(
  () => ({
    heightMap: new StorageTexture(512, 512),
  }),
  'terrain',
)

// Access in node creators
const { positionNode } = useNodes(({ buffers, gpuStorage }) => ({
  positionNode: buffers.scope('particles').positions.element(instanceIndex),
}))
```

### Utility Functions

Both hooks return utility functions:

```tsx
const { positions, removeBuffers, clearBuffers, rebuildBuffers, disposeBuffers } = useBuffers(...)

// Remove specific buffers
removeBuffers('positions')

// Dispose (releases GPU resources + removes from store)
disposeBuffers('positions')

// Rebuild (for HMR)
rebuildBuffers()
```

### Accessing in Node Creators

Buffer and storage data is available in `useNodes` and `useLocalNodes` via the creator state:

```tsx
const { computeNode } = useLocalNodes(({ buffers, gpuStorage, uniforms }) => ({
  computeNode: Fn(() => {
    const pos = buffers.particles.positions.element(instanceIndex)
    const height = texture(gpuStorage.terrain.heightMap, uv())
    return pos.add(vec3(0, height, 0))
  })(),
}))
```

---

## More Features Coming

v10 is in active development. More features will be documented here as they're released.

- **Powerful New Scheduler** - See [Migration Guide](./v10-migration.md#powerful-new-scheduler)
- **WebGPU & TSL Hooks** - See [Migration Guide](./v10-migration.md#webgpu--tsl-hooks)
