# WebGPU Hooks Documentation

React hooks for WebGPU/TSL shader development in react-three-fiber.

## 📚 Documentation

### Getting Started

- **[WebGPU Hooks Overview](./readmes/overview.md)** - Introduction, patterns, and quick start guide

### API Reference

- **[useUniform Hook](./readmes/useUniform.md)** - Single uniform management
- **[useUniforms Hook](./readmes/useUniforms.md)** - Batch uniform management with scoping
- **[useNodes Hook](./readmes/useNodes.md)** - Global TSL node management
- **[useLocalNodes Hook](./readmes/useLocalNodes.md)** - Component-local TSL nodes
- **[usePostProcessing Hook](./readmes/usePostProcessing.md)** - Post-processing setup and MRT configuration

## ⚠️ Important

**Read these before using WebGPU hooks:**

1. **[Build-Time vs Run-Time](./readmes/overview.md#️-critical-build-time-vs-run-time)** - JavaScript vs TSL execution

   - JavaScript `if/else` runs once at build → won't react to uniform changes
   - TSL `If()/select()` runs on GPU every frame → reacts to uniform changes

2. **[Use TSL Built-ins First](./readmes/overview.md#-use-tsl-built-ins-first)** - Don't reinvent the wheel
   - Use `cameraPosition` TSL node, not `state.camera.position`
   - Use `time` TSL node, not `uTime` uniform
   - Only create uniforms for values without TSL built-ins (viewport, size, custom data)

## 🚀 Quick Links

| I want to...                           | Go to...                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Create a simple uniform                | [useUniform - Basic Usage](./readmes/useUniform.md#basic-usage)                                    |
| Create multiple uniforms               | [useUniforms - Basic Usage](./readmes/useUniforms.md#basic-usage)                                  |
| Share TSL nodes between components     | [useNodes - Shared Nodes](./readmes/useNodes.md#shared-nodes)                                      |
| Create component-local TSL expressions | [useLocalNodes - Local Nodes](./readmes/useLocalNodes.md#basic-usage)                              |
| Set up post-processing effects         | [usePostProcessing - Basic Setup](./readmes/usePostProcessing.md#basic-setup)                      |
| Configure MRT for post-processing      | [usePostProcessing - MRT Setup](./readmes/usePostProcessing.md#mrt-configuration)                  |
| Register custom passes                 | [usePostProcessing - Registering Passes](./readmes/usePostProcessing.md#registering-custom-passes) |
| Organize uniforms by scope             | [useUniforms - Scoped Uniforms](./readmes/useUniforms.md#scoped-uniforms)                          |
| Use Leva controls with uniforms        | [useUniforms - Reactive Values](./readmes/useUniforms.md#reactive-values-from-leva)                |
| Understand the architecture            | [WebGPU Hooks Overview - Architecture](./readmes/overview.md#architecture)                         |

## 📖 Examples

### Simple Uniform

```tsx
import { useUniform } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal } from 'three/tsl'

function DisplacedMesh() {
  const uDisplacement = useUniform('uDisplacement', 0.5)

  useFrame(({ elapsed }) => {
    uDisplacement.value = Math.sin(elapsed) * 0.5
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(uDisplacement))} />
    </mesh>
  )
}
```

### Multiple Uniforms with Function

```tsx
import { useUniforms } from '@react-three/fiber/webgpu'

function AnimatedMaterial() {
  const { uTime, uColor, uScale } = useUniforms(() => ({
    uTime: 0,
    uColor: '#ff0000',
    uScale: 1.0,
  }))

  useFrame(({ elapsed }) => {
    uTime.value = elapsed
  })

  // Or access uniforms from state
  useFrame(({ elapsed, uniforms }) => {
    uniforms.uTime.value = elapsed
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial colorNode={uColor} positionNode={positionLocal.mul(uScale)} />
    </mesh>
  )
}
```

### Shared TSL Nodes

```tsx
import { useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, vec3, sin, time } from 'three/tsl'

// Global shared nodes
function GlobalNodes() {
  useNodes(() => ({
    wobbleFn: Fn(() => {
      return vec3(sin(time), sin(time.mul(2)), sin(time.mul(3)))
    }),
  }))
  return null
}

// Use shared nodes locally
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

  return (
    <mesh>
      <boxGeometry />
      <meshBasicNodeMaterial color="hotpink" />
    </mesh>
  )
}
```

## 🏗️ System Architecture

```
Canvas (WebGPU Renderer)
├── RootState
│   ├── uniforms         - Global UniformNodes (create-if-not-exists)
│   │   ├── uTime        - Root-level uniform
│   │   ├── uColor       - Root-level uniform
│   │   └── player       - Scoped uniforms
│   │       └── uHealth  - Scoped uniform
│   ├── nodes            - Global TSL Nodes (create-if-not-exists)
│   │   ├── wobbleFn     - Root-level node
│   │   └── effects      - Scoped nodes
│   │       └── glowFn   - Scoped node
│   ├── textures         - Texture registry
│   ├── postProcessing   - PostProcessing instance
│   └── passes           - PostProcessing pass registry
│       └── scenePass    - Default scene pass
```

## 🎯 Best Practices

1. **Use scopes for organization** - Prevent naming conflicts with component/feature scopes
2. **Share expensive nodes** - Use `useNodes` for nodes used across components
3. **Local for component-specific** - Use `useLocalNodes` for one-off component expressions
4. **Update uniforms imperatively** - Use `.value =` for GPU-only updates (no React re-render)
5. **Function syntax for reactivity** - Use functions to capture reactive values (Leva, state)
6. **Plain objects for Leva** - `{ x, y, z }` auto-converts to Three.js vectors

## 🔧 TypeScript Support

All hooks are fully typed with proper inference:

```typescript
// Inferred types
const { uTime } = useUniforms({ uTime: 0 }) // UniformNode<number>
const { uColor } = useUniforms({ uColor: new THREE.Color() }) // UniformNode<THREE.Color>

// Manual typing when needed
const uPosition = useUniform<THREE.Vector3>('uPosition', new THREE.Vector3())
```

## 🐛 Debugging

```tsx
// Named uniforms for debugging
const { uTime } = useUniforms({ uTime: 0 })
console.log(uTime.name) // 'uTime'

// Check what's registered
const { uniforms, nodes } = useThree()
console.log('Uniforms:', Object.keys(uniforms))
console.log('Nodes:', Object.keys(nodes))

// Scoped debugging
const playerUniforms = useUniforms('player')
console.log('Player uniforms:', Object.keys(playerUniforms))
```

## 📝 Related Documentation

- [Three.js TSL Documentation](https://threejs.org/docs/#manual/en/introduction/WebGPU-TSL)
- [useFrame Hook](../core/hooks/useFrame/readme.md) - Animation loop control
- [Canvas API](https://docs.pmnd.rs/react-three-fiber/api/canvas) - Canvas configuration
- [WebGPU Renderer](https://threejs.org/docs/#api/en/renderers/WebGPURenderer) - Three.js WebGPU renderer
