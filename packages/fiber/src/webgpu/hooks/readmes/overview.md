# WebGPU Hooks Overview

R3F's WebGPU hooks provide React-friendly APIs for Three.js Shading Language (TSL) development. They solve the problem of managing shader state in a React component tree while maintaining GPU-side performance.

## Quick Start

### Uniforms

```tsx
import { useUniforms } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal } from 'three/tsl'

function DisplacedSphere() {
  const { uDisplacement } = useUniforms({ uDisplacement: 0.5 })

  useFrame(({ elapsed }) => {
    uDisplacement.value = Math.sin(elapsed)
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(uDisplacement))} />
    </mesh>
  )
}
```

### Shared Nodes

```tsx
import { useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, vec3, sin, time } from 'three/tsl'

// Define shared nodes once
function GlobalEffects() {
  useNodes(() => ({
    wobbleFn: Fn(() => vec3(sin(time), sin(time.mul(2)), sin(time.mul(3)))),
  }))
  return null
}

// Use in components
function WobblyMesh() {
  const { colorNode } = useLocalNodes(({ nodes }) => ({
    colorNode: nodes.wobbleFn.mul(0.5).add(0.5),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={colorNode} />
    </mesh>
  )
}
```

### Post-Processing

```tsx
import { usePostProcessing } from '@react-three/fiber/webgpu'
import { bloom } from 'three/tsl'

function Scene() {
  usePostProcessing(({ postProcessing, passes }) => {
    const sceneTexture = passes.scenePass.getTextureNode()
    postProcessing.outputNode = bloom(sceneTexture, 1.5, 0.1, 0.9)
  })

  return <mesh>...</mesh>
}
```

---

## Critical: Build-Time vs Run-Time

**The most important concept when using these hooks.**

TSL code executes at TWO different times:

### Build-Time (JavaScript)

React component renders → JavaScript executes → shader node graph is built

```tsx
function MyShader() {
  const { uMode } = useUniforms({ uMode: 0 })

  const { colorNode } = useLocalNodes(({ uniforms }) => {
    // ❌ WRONG: JavaScript conditional runs ONCE at build
    // Won't react to uniform changes!
    if (uniforms.uMode.value === 0) {
      return { colorNode: vec3(1, 0, 0) }
    }
    return { colorNode: vec3(0, 0, 1) }
  })
}
```

### Run-Time (GPU)

Every frame → compiled shader executes on GPU → uniforms update

```tsx
import { If } from 'three/tsl'

function MyShader() {
  const { uMode } = useUniforms({ uMode: 0 })

  const { colorNode } = useLocalNodes(({ uniforms }) => {
    // ✅ CORRECT: TSL If() runs on GPU every frame
    const result = vec3(0).toVar()

    If(uniforms.uMode.equal(0), () => {
      result.assign(vec3(1, 0, 0))
    }).Else(() => {
      result.assign(vec3(0, 0, 1))
    })

    return { colorNode: result }
  })
}
```

### Quick Rule

- **JavaScript `if/else/for`**: Build-time only → won't react to uniform changes
- **TSL `If()/Loop()/select()`**: Run-time GPU code → reacts to uniform changes

---

## Use TSL Built-ins First

Before creating uniforms, check if TSL has a built-in node:

### Camera

```tsx
import { cameraPosition } from 'three/tsl'

// ✅ CORRECT: Use TSL built-in
const { colorNode } = useLocalNodes(() => ({
  colorNode: length(cameraPosition.sub(positionWorld)),
}))

// ❌ WRONG: Don't create uniforms from state.camera
const { uCamPos } = useUniforms((state) => ({
  uCamPos: state.camera.position, // Redundant!
}))
```

**Available TSL Camera Nodes:** `cameraPosition`, `cameraViewMatrix`, `cameraProjectionMatrix`, `cameraNormalMatrix`, `cameraWorldMatrix`

### Time

```tsx
import { time } from 'three/tsl'

// ✅ CORRECT: Use TSL's time node
const { waveNode } = useLocalNodes(() => ({
  waveNode: sin(time.mul(2)),
}))

// ❌ WRONG: Don't create time uniforms manually
const { uTime } = useUniforms({ uTime: 0 })
useFrame(({ elapsed }) => {
  uTime.value = elapsed // Unnecessary!
})
```

### When to Use RootState

Use uniforms from RootState for values that DON'T have TSL built-ins:

```tsx
// ✅ Good: viewport/size don't have TSL built-ins
const { uAspect, uDpr } = useUniforms((state) => ({
  uAspect: state.size.width / state.size.height,
  uDpr: state.viewport.dpr,
}))
```

---

## Architecture

All WebGPU hooks interact with R3F's root store:

```typescript
interface RootState {
  uniforms: UniformRecord // Global uniforms + scopes
  nodes: NodeRecord // Global TSL nodes + scopes
  buffers: BufferRecord // GPU buffer storage + scopes
  gpuStorage: StorageRecord // GPU texture storage + scopes
  textures: TextureRecord // Texture registry
  postProcessing: PostProcessing | null
  passes: PassRecord // Post-processing passes
}
```

### Create-If-Not-Exists Pattern

All hooks use a "create if not exists, reuse if exists" pattern:

```tsx
// First call creates
const { uTime } = useUniforms({ uTime: 0 })

// Second call reuses (same uniform instance)
const { uTime } = useUniforms({ uTime: 0 })
```

This means:

- No duplicate GPU allocations
- Shared state across component tree
- Safe to call in multiple components
- Works with React Strict Mode

---

## API Reference

- **[useUniform](./useUniform.md)** - Single uniform management
- **[useUniforms](./useUniforms.md)** - Batch uniforms with scoping, Leva integration
- **[useNodes](./useNodes.md)** - Global TSL node sharing
- **[useLocalNodes](./useLocalNodes.md)** - Component-local node composition
- **[useBuffers & useGPUStorage](./useBuffers-useGPUStorage.md)** - GPU buffer and storage texture management
- **[usePostProcessing](./usePostProcessing.md)** - Post-processing setup

## External Resources

- [Three.js TSL Docs](https://threejs.org/docs/#manual/en/introduction/WebGPU-TSL)
- [WebGPU Renderer](https://threejs.org/docs/#api/en/renderers/WebGPURenderer)
