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

## More Features Coming

v10 is in active development. More features will be documented here as they're released.

- **Powerful New Scheduler** - See [Migration Guide](./v10-migration.md#powerful-new-scheduler)
- **WebGPU & TSL Hooks** - See [Migration Guide](./v10-migration.md#webgpu--tsl-hooks)
