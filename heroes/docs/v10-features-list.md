# React Three Fiber v10 Features

> Comprehensive feature reference for R3F v10.0.0 - React 19 & WebGPU Edition

## Quick Links

- [WebGPU & TSL Shaders](#webgpu--tsl-shaders)
- [New Scheduler](#new-scheduler)
- [Multi-Canvas Rendering](#multi-canvas-rendering-webgpu)
- [Camera & Scene](#camera--scene)
- [Visibility Events](#visibility-events)
- [Events & Interaction](#events--interaction)
- [Prop Utilities](#prop-utilities)
- [Canvas Configuration](#canvas-configuration)
- [Hooks](#hooks)
- [Breaking Changes](#breaking-changes--migration)
- [Bug Fixes](#bug-fixes)

---

## WebGPU & TSL Shaders

| Feature                      | Description                                                 | Why It Matters                                                  | Tags                    |
| ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| **WebGPU Support**           | Import from `@react-three/fiber/webgpu` for WebGPU renderer | Access modern GPU features, compute shaders, better performance | `new-feature`, `major`  |
| **useNodes**                 | Define TSL shader functions shared across components        | Write shaders declaratively in React, share logic globally      | `new-feature`, `webgpu` |
| **useLocalNodes**            | Compose shared nodes with local logic                       | Component-specific shader variations that inherit globals       | `new-feature`, `webgpu` |
| **useUniforms / useUniform** | Create and share uniforms across components with scoping    | Declarative uniform management, Leva integration                | `new-feature`, `webgpu` |
| **useRenderPipeline**        | Declarative render pipeline with MRT configuration          | WebGPU post-processing without boilerplate                      | `new-feature`, `webgpu` |
| **useBuffers**               | Manage TypedArrays, BufferAttributes, TSL buffer nodes      | GPU compute storage for particles, simulations                  | `new-feature`, `webgpu` |
| **useGPUStorage**            | Manage StorageTextures for compute results                  | GPU-side texture storage for advanced effects                   | `new-feature`, `webgpu` |
| **HMR Support**              | Hot reload TSL hooks without page refresh                   | Faster shader iteration during development                      | `new-feature`, `dx`     |
| **ScopedStore**              | Type-safe access to uniforms/nodes in creators              | Better TypeScript DX, no manual casting                         | `new-feature`, `dx`     |

### Usage Examples

```tsx
// WebGPU Entry Point
import { Canvas } from '@react-three/fiber/webgpu'

// useNodes - Define shared shader logic
const nodes = useNodes({
  fresnel: () => {
    const { viewDirection, normalLocal } = Fn(() => ({
      viewDirection: cameraPosition.sub(positionWorld).normalize(),
      normalLocal: normalWorld,
    }))()
    return pow(float(1).sub(dot(viewDirection, normalLocal)), 2)
  },
})

// useUniforms - Declarative uniform management
const uniforms = useUniforms({
  time: 0,
  color: new THREE.Color('#ff0000'),
})

// Update in useFrame
useFrame(({ elapsed }) => {
  uniforms.time = elapsed
})
```

---

## New Scheduler

| Feature                      | Description                                                                | Why It Matters                                  | Tags                   |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------- |
| **Phase-Based Execution**    | Organize frame work into phases: input, physics, update, preRender, render | Predictable ordering, no more priority guessing | `new-feature`, `major` |
| **FPS Throttling**           | `useFrame(() => {}, { fps: 30 })`                                          | Run heavy work at lower rates, save battery     | `new-feature`          |
| **Pause/Resume**             | `const job = useFrame(...); job.pause(); job.resume()`                     | Pause menus, debugging, conditional animations  | `new-feature`          |
| **before/after Constraints** | `{ after: 'physics', before: 'render' }`                                   | Explicit dependency ordering                    | `new-feature`          |
| **Render Phase Takeover**    | Registering to 'render' phase takes over default rendering                 | Clear separation of render responsibilities     | `breaking`             |

### Usage Examples

```tsx
// Phase-based execution
useFrame(
  () => {
    // Physics calculations
  },
  { phase: 'physics' },
)

useFrame(
  () => {
    // Visual updates after physics
  },
  { phase: 'update', after: 'physics' },
)

// FPS throttling for expensive operations
useFrame(
  () => {
    // Heavy particle simulation
  },
  { fps: 30 },
)

// Pause/resume control
const animation = useFrame(({ elapsed }) => {
  mesh.current.rotation.y = elapsed
})

// Later...
animation.pause() // Pause when menu opens
animation.resume() // Resume when menu closes
```

### Scheduler Phases

1. **input** - Process user input, device state
2. **physics** - Physics simulations, collision detection
3. **update** - General updates, animations
4. **preRender** - Pre-render calculations, frustum culling
5. **render** - Actual rendering (registering takes over default)

---

## Multi-Canvas Rendering (WebGPU)

| Feature                 | Description                                                                     | Why It Matters                                            | Tags                   |
| ----------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------- |
| **Shared Renderer**     | `<Canvas id="main" renderer>` + `<Canvas renderer={{ primaryCanvas: 'main' }}>` | HUDs, picture-in-picture, multi-viewport without overhead | `new-feature`, `major` |
| **Scheduler Options**   | `scheduler: { after: 'main', fps: 30 }`                                         | Control render order and rate per canvas                  | `new-feature`          |
| **primaryStore Access** | Access primary canvas's scene/camera from secondary                             | Render main scene from different viewpoints               | `new-feature`          |

### Usage Examples

```tsx
// Primary canvas owns the renderer
<Canvas id="main" renderer>
  <MainScene />
</Canvas>

// Secondary canvas shares renderer, renders after main at 30fps
<Canvas
  renderer={{ primaryCanvas: 'main' }}
  scheduler={{ after: 'main', fps: 30 }}
>
  <HUDOverlay />
</Canvas>

// Access primary store for minimap
function Minimap() {
  const { primaryStore } = useThree()
  const mainScene = primaryStore?.getState().scene

  return (
    <OrthographicCamera makeDefault position={[0, 100, 0]} />
    // Renders main scene from above
  )
}
```

---

## Camera & Scene

| Feature                    | Description                                                   | Why It Matters                                   | Tags                   |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------------------ | ---------------------- |
| **Camera Scene Parenting** | Default camera auto-added to scene                            | Camera children (HUDs, lights) now render        | `new-feature`, `major` |
| **Portal Component**       | `<Portal container={camera}>` for declarative camera children | Clean JSX for headlights, HUDs without useEffect | `new-feature`          |
| **Frustum on State**       | `const { frustum } = useThree()`                              | Direct access for custom visibility logic        | `new-feature`          |
| **autoUpdateFrustum**      | Canvas prop to control frustum updates                        | Optimization for custom setups                   | `new-feature`          |
| **updateFrustum Utility**  | Manual frustum updates for any camera                         | Shadow cameras, portal cameras                   | `new-feature`          |

### Usage Examples

```tsx
// Camera-attached elements via Portal
function CarWithHeadlights() {
  const camera = useThree((state) => state.camera)

  return (
    <>
      <PlayerCar />
      <Portal container={camera}>
        <spotLight position={[0, 0, 0]} target-position={[0, 0, -10]} />
        <HUDElement position={[0, 0, -1]} />
      </Portal>
    </>
  )
}

// Custom frustum culling
function CustomVisibility() {
  const { frustum } = useThree()

  useFrame(() => {
    objects.forEach((obj) => {
      obj.visible = frustum.containsPoint(obj.position)
    })
  })
}
```

---

## Visibility Events

| Feature        | Description                                                    | Why It Matters                           | Tags                    |
| -------------- | -------------------------------------------------------------- | ---------------------------------------- | ----------------------- |
| **onFramed**   | `onFramed={(inView) => {}}` fires on frustum enter/exit        | Pause off-screen work, lazy loading      | `new-feature`           |
| **onOccluded** | `onOccluded={(occluded) => {}}` GPU occlusion queries (WebGPU) | Know when objects hidden behind geometry | `new-feature`, `webgpu` |
| **onVisible**  | `onVisible={(visible) => {}}` combined visibility              | One handler for all visibility state     | `new-feature`           |

### Usage Examples

```tsx
// Pause animations when off-screen
function ExpensiveAnimation() {
  const animation = useRef()

  return (
    <mesh
      onFramed={(inView) => {
        if (inView) animation.current?.resume()
        else animation.current?.pause()
      }}
    >
      <AnimatedGeometry ref={animation} />
    </mesh>
  )
}

// WebGPU occlusion queries
function OcclusionAwareObject() {
  return (
    <mesh
      onOccluded={(occluded) => {
        // true when hidden behind other geometry
        console.log('Occluded:', occluded)
      }}
    >
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}

// Combined visibility
<mesh onVisible={(visible) => setActive(visible)}>
```

---

## Events & Interaction

| Feature                     | Description                                    | Why It Matters                                         | Tags                         |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ---------------------------- |
| **Frame-Timed Raycasting**  | Move raycasts deferred to frame start          | Performance: 1 raycast/frame vs 1000+ on high-refresh  | `new-feature`, `performance` |
| **Per-Pointer State**       | Each touch/pointer tracks own hover state      | Proper multi-touch support                             | `new-feature`                |
| **Interactive Priority**    | `userData={{ interactivePriority: 1 }}`        | UI controls with depth tricks receive events correctly | `new-feature`                |
| **XR Pointer Registration** | API for registering XR controllers as pointers | WebXR integration preparation                          | `new-feature`                |

### Usage Examples

```tsx
// Multi-touch piano keys
function PianoKey({ note }) {
  const [pressed, setPressed] = useState(new Set())

  return (
    <mesh
      onPointerDown={(e) => {
        setPressed((prev) => new Set([...prev, e.pointerId]))
        playNote(note)
      }}
      onPointerUp={(e) => {
        setPressed((prev) => {
          const next = new Set(prev)
          next.delete(e.pointerId)
          return next
        })
      }}>
      <boxGeometry />
      <meshStandardMaterial color={pressed.size > 0 ? 'red' : 'white'} />
    </mesh>
  )
}

// Interactive priority for transform gizmo
;<mesh userData={{ interactivePriority: 100 }}>
  <GizmoHandle /> {/* Always clickable even if visually behind objects */}
</mesh>
```

---

## Prop Utilities

| Feature       | Description                                   | Why It Matters                               | Tags                 |
| ------------- | --------------------------------------------- | -------------------------------------------- | -------------------- |
| **fromRef()** | `<spotLight target={fromRef(targetRef)} />`   | Deferred ref resolution, no useEffect needed | `new-feature`, `qol` |
| **once()**    | `<boxGeometry rotateX={once(Math.PI / 2)} />` | Mount-only transforms, no accumulation       | `new-feature`, `qol` |

### Usage Examples

```tsx
import { fromRef, once } from '@react-three/fiber'

// fromRef - Declarative ref targeting
function SpotlightRig() {
  const targetRef = useRef()

  return (
    <>
      <mesh ref={targetRef} position={[0, 0, -5]}>
        <sphereGeometry args={[0.5]} />
      </mesh>

      {/* No useEffect needed! */}
      <spotLight position={[0, 5, 0]} target={fromRef(targetRef)} intensity={1} />
    </>
  )
}

// once - Mount-only geometry transforms
function CenteredGeometry() {
  return (
    <mesh>
      {/* Rotates once on mount, won't accumulate on re-renders */}
      <boxGeometry args={[1, 2, 1]} rotateX={once(Math.PI / 2)} center={once()} />
      <meshStandardMaterial />
    </mesh>
  )
}
```

---

## Canvas Configuration

| Feature                | Description                                             | Why It Matters                               | Tags                    |
| ---------------------- | ------------------------------------------------------- | -------------------------------------------- | ----------------------- |
| **background Prop**    | `<Canvas background="sunset">` or colors, URLs, objects | Declarative scene background/environment     | `new-feature`           |
| **width/height Props** | `<Canvas width={3840} height={2160}>`                   | Fixed resolution for video export            | `new-feature`           |
| **Enhanced setSize**   | `setSize(1024)` square, `setSize()` reset               | Imperative size control with ownership model | `new-feature`           |
| **forceEven**          | `<Canvas forceEven>`                                    | Safari compatibility for odd dimensions      | `new-feature`, `bugfix` |
| **textureColorSpace**  | Control 8-bit texture interpretation                    | Correct color management                     | `new-feature`           |

### Usage Examples

```tsx
// Declarative background
<Canvas background="sunset">      {/* Environment preset */}
<Canvas background="#1a1a2e">     {/* Solid color */}
<Canvas background="studio.hdr">  {/* HDRI file */}

// Fixed resolution for video export
<Canvas width={3840} height={2160} dpr={1}>
  <ExportableScene />
</Canvas>

// Imperative size control
function ExportButton() {
  const setSize = useThree((state) => state.setSize)

  return (
    <button onClick={() => {
      setSize(4096) // Square 4K
      // Capture frame...
      setSize()     // Reset to container
    }}>
      Export 4K
    </button>
  )
}

// Safari compatibility
<Canvas forceEven>
```

---

## Hooks

| Feature             | Description                               | Why It Matters                            | Tags          |
| ------------------- | ----------------------------------------- | ----------------------------------------- | ------------- |
| **useRenderTarget** | Renderer-agnostic FBO creation            | Works with WebGL and WebGPU automatically | `new-feature` |
| **useFrame Timing** | `{ time, delta, elapsed }` replaces clock | More accurate RAF-based timing            | `breaking`    |

### Usage Examples

```tsx
// useRenderTarget - Works with WebGL and WebGPU
function SecurityCamera() {
  const renderTarget = useRenderTarget(512, 512)
  const cameraRef = useRef()

  useFrame(({ renderer, scene }) => {
    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, cameraRef.current)
    renderer.setRenderTarget(null)
  })

  return (
    <>
      <perspectiveCamera ref={cameraRef} position={[10, 10, 10]} />
      <mesh>
        <planeGeometry args={[4, 3]} />
        <meshBasicMaterial map={renderTarget.texture} />
      </mesh>
    </>
  )
}

// New timing parameters
useFrame(({ time, delta, elapsed }) => {
  // time: current RAF timestamp
  // delta: time since last frame (seconds)
  // elapsed: total elapsed time since canvas mount (seconds)
  mesh.rotation.y = elapsed * 0.5
})
```

---

## Breaking Changes / Migration

| Change             | Before (v9)                       | After (v10)                                                        | Tags       |
| ------------------ | --------------------------------- | ------------------------------------------------------------------ | ---------- |
| **gl → renderer**  | `const { gl } = useThree()`       | `const { renderer } = useThree()`                                  | `breaking` |
| **Clock Removed**  | `state.clock.getElapsedTime()`    | `state.elapsed` or `useFrame(({ elapsed }))`                       | `breaking` |
| **Renderer Props** | `<Canvas legacy linear flat>`     | `<Canvas gl={{ outputColorSpace, toneMapping }}>`                  | `breaking` |
| **Entry Points**   | `@react-three/fiber` (WebGL only) | Default supports both, `/legacy` WebGL-only, `/webgpu` WebGPU-only | `breaking` |

### Migration Guide

```tsx
// Before (v9)
import { Canvas, useThree, useFrame } from '@react-three/fiber'

function Component() {
  const { gl, clock } = useThree()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    // ...
  })
}

<Canvas legacy linear flat>

// After (v10)
import { Canvas, useThree, useFrame } from '@react-three/fiber/webgpu'

function Component() {
  const { renderer, elapsed } = useThree()

  useFrame(({ elapsed, delta, time }) => {
    // Use elapsed directly
    // ...
  })
}

<Canvas gl={{
  outputColorSpace: THREE.LinearSRGBColorSpace,
  toneMapping: THREE.NoToneMapping
}}>
```

### Entry Point Selection

```tsx
// Default - Supports both WebGL and WebGPU (auto-detects)
import { Canvas } from '@react-three/fiber'

// Legacy - WebGL only, smaller bundle
import { Canvas } from '@react-three/fiber/legacy'

// WebGPU - WebGPU only, full TSL support
import { Canvas } from '@react-three/fiber/webgpu'
```

---

## Bug Fixes

| Fix                          | Description                                                 | Tags     |
| ---------------------------- | ----------------------------------------------------------- | -------- |
| **createPortal Memory Leak** | Fixed subscription cleanup preventing memory leaks          | `bugfix` |
| **Portal Size Override**     | Portals now correctly preserve their size configuration     | `bugfix` |
| **setSize Demand Mode**      | setSize now properly triggers frame render in demand mode   | `bugfix` |
| **Windows Paths in Types**   | Fixed absolute Windows paths appearing in type declarations | `bugfix` |

---

## Feature Tags Reference

| Tag           | Meaning                               |
| ------------- | ------------------------------------- |
| `new-feature` | New functionality added in v10        |
| `breaking`    | Requires migration from v9            |
| `major`       | Significant feature with broad impact |
| `webgpu`      | Requires WebGPU entry point           |
| `qol`         | Quality of life improvement           |
| `dx`          | Developer experience improvement      |
| `performance` | Performance optimization              |
| `bugfix`      | Bug fix from v9                       |

---

## Browser Support

### WebGPU

- Chrome 113+ (stable)
- Edge 113+ (stable)
- Firefox (behind flag)
- Safari (Technology Preview)

### WebGL (Legacy)

- All modern browsers
- iOS Safari 15+
- Android Chrome 90+

---

## Resources

- [R3F Documentation](https://docs.pmnd.rs/react-three-fiber)
- [Three.js TSL Guide](https://threejs.org/docs/#api/en/nodes/tsl/TSL)
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [Poimandres Discord](https://discord.gg/poimandres)
