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
  const fbo = useRenderTarget(512, 512, {
    depthBuffer: true,
    samples: 4,
  })

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

### Using Canvas Size

If you omit width/height, the hook uses the canvas dimensions:

```tsx
// Full-screen render target that resizes with the canvas
const fbo = useRenderTarget()

// Or just specify options
const fbo = useRenderTarget(undefined, undefined, { samples: 4 })
```

### API

```ts
useRenderTarget(
  width?: number,   // Target width (defaults to canvas width)
  height?: number,  // Target height (defaults to canvas height)
  options?: RenderTargetOptions
)
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

v10 includes automatic Hot Module Replacement (HMR) support for the WebGPU TSL hooks (`useNodes`, `useUniforms`, `usePostProcessing`). When you save changes to files containing TSL node or uniform definitions, they automatically refresh without a full page reload.

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

## More Features Coming

v10 is in active development. More features will be documented here as they're released.

- **Powerful New Scheduler** - See [Migration Guide](./v10-migration.md#powerful-new-scheduler)
- **WebGPU & TSL Hooks** - See [Migration Guide](./v10-migration.md#webgpu--tsl-hooks)
