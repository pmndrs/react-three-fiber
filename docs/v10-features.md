---
title: 'v10 New Features'
description: New features and additions in react-three-fiber v10
nav: 15
---

# v10 New Features

This document covers new features added in v10. For breaking changes and migration steps, see the [v10 Migration Guide](./v10-migration.md).

---

## Camera Frustum

v10 exposes a `THREE.Frustum` on the root state that stays synchronized with the default camera. This enables efficient visibility checks without needing to create and manage your own frustum instance.

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

### Event Handler Reference

| Handler      | Parameter           | Description                                  |
| ------------ | ------------------- | -------------------------------------------- |
| `onFramed`   | `inView: boolean`   | `true` when in frustum, `false` when out     |
| `onOccluded` | `occluded: boolean` | `true` when occluded, `false` when visible   |
| `onVisible`  | `visible: boolean`  | `true` when fully visible, `false` otherwise |

---

## More Features Coming

v10 is in active development. More features will be documented here as they're released.

- **Powerful New Scheduler** - See [Migration Guide](./v10-migration.md#powerful-new-scheduler)
- **WebGPU & TSL Hooks** - See [Migration Guide](./v10-migration.md#webgpu--tsl-hooks)
