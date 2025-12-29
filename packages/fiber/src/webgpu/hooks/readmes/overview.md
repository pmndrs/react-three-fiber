# WebGPU Hooks Overview

R3F's WebGPU hooks provide React-friendly APIs for Three.js Shading Language (TSL) development. They solve the problem of managing shader state in a React component tree while maintaining GPU-side performance.

## Quick Start

### Basic Uniform

```tsx
import { useUniform } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal } from 'three/tsl'

function Sphere() {
  const uDisplacement = useUniform('uDisplacement', 0.5)

  useFrame((state) => {
    uDisplacement.value = Math.sin(state.elapsed)
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(uDisplacement))} />
    </mesh>
  )
}
```

### Multiple Uniforms

```tsx
import { useUniforms } from '@react-three/fiber/webgpu'

function ColorfulMesh() {
  const { uTime, uColor } = useUniforms({
    uTime: 0,
    uColor: '#ff0000',
  })

  useFrame((state) => {
    uTime.value = state.elapsed
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial colorNode={uColor} />
    </mesh>
  )
}
```

### Shared Nodes

```tsx
import { useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, vec3, sin, time } from 'three/tsl'

// Define global shared nodes once
function GlobalEffects() {
  useNodes(() => ({
    wobbleFn: Fn(() => vec3(sin(time), sin(time.mul(2)), sin(time.mul(3)))),
  }))
  return null
}

// Use shared nodes in components
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

---

## ⚠️ Critical: Build-Time vs Run-Time

**The most important concept when using these hooks:**

TSL code executes at TWO different times, and understanding this prevents major bugs:

### Build-Time (JavaScript)

React component renders → JavaScript executes → shader node graph is built

```tsx
// This is BUILD-TIME JavaScript
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
import { If, select } from 'three/tsl'

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
- **When in doubt**: If it needs to react to a uniform, use TSL nodes

---

## 📦 Use TSL Built-ins First

**Before creating uniforms from RootState, check if TSL has a built-in node:**

### Camera (use TSL nodes, NOT state.camera)

```tsx
import { cameraPosition, cameraViewMatrix, cameraProjectionMatrix } from 'three/tsl'

// ✅ CORRECT: Use TSL built-in camera nodes
const { colorNode } = useLocalNodes(() => ({
  colorNode: length(cameraPosition.sub(positionWorld)),
}))

// ❌ WRONG: Don't create uniforms from state.camera
const { uCamPos } = useUniforms((state) => ({
  uCamPos: state.camera.position, // Redundant! Use cameraPosition TSL node
}))
```

**Available TSL Camera Nodes:**

- `cameraPosition` - Camera world position
- `cameraViewMatrix` - Camera view matrix
- `cameraProjectionMatrix` - Camera projection matrix
- `cameraNormalMatrix` - Camera normal matrix
- `cameraWorldMatrix` - Camera world matrix

### Time (use TSL time node)

```tsx
import { time } from 'three/tsl'

// ✅ CORRECT: Use TSL's time node
const { waveNode } = useLocalNodes(() => ({
  waveNode: sin(time.mul(2)),
}))

// ❌ WRONG: Don't create time uniforms
const { uTime } = useUniforms({ uTime: 0 })
useFrame(({ elapsed, uniforms }) => {
  uniforms.uTime.value = elapsed // Unnecessary! Use time TSL node
})
```

### When to Actually Use RootState

Use uniforms from RootState for values that DON'T have TSL built-ins:

```tsx
// ✅ Good: viewport/size don't have TSL built-ins
const { uAspect, uDpr } = useUniforms((state) => ({
  uAspect: state.size.width / state.size.height,
  uDpr: state.viewport.dpr,
}))
```

---

## What Problem Do These Hooks Solve?

### Problem 1: Uniform Management Across Components

When you're building TSL shaders, you need uniforms - values that change over time or respond to user input. Without a system, you end up with:

```tsx
// ❌ Bad: Local uniforms can't be shared
function Mesh1() {
  const uTime = useMemo(() => uniform(0), [])
  // Can't access this in Mesh2
}

function Mesh2() {
  const uTime = useMemo(() => uniform(0), []) // Separate instance!
}
```

**Solution: Global uniform registry with create-if-not-exists pattern**

```tsx
// ✅ Good: Shared uniforms across components
function Mesh1() {
  const { uTime } = useUniforms({ uTime: 0 })
  // Creates uniform first time, reuses after
}

function Mesh2() {
  const { uTime } = useUniforms({ uTime: 0 })
  // Gets existing uniform
}
```

### Problem 2: TSL Node Sharing

When you're building complex shaders, you want to share TSL expressions (functions, operations, varyings) across multiple materials:

```tsx
// ❌ Bad: Duplicating expensive node creation
function Mesh1() {
  const wobble = useMemo(() => {
    return Fn(() => vec3(sin(time), cos(time), sin(time.mul(2))))()
  }, [])
  // This node graph is built once per component
}

function Mesh2() {
  const wobble = useMemo(() => {
    return Fn(() => vec3(sin(time), cos(time), sin(time.mul(2))))() // Duplicate!
  }, [])
}
```

**Solution: Global node registry**

```tsx
// ✅ Good: Define once, use everywhere
function GlobalNodes() {
  useNodes(() => ({
    wobbleFn: Fn(() => vec3(sin(time), cos(time), sin(time.mul(2)))),
  }))
  return null
}

function Mesh1() {
  const { wobbleFn } = useLocalNodes(({ nodes }) => ({
    output: nodes.wobbleFn.mul(0.5),
  }))
}
```

### Problem 3: Scope Conflicts

When you're building a complex app with multiple features, uniform names collide:

```tsx
// ❌ Bad: Name collision
function PlayerHealth() {
  const { uHealth } = useUniforms({ uHealth: 100 })
}

function EnemyHealth() {
  const { uHealth } = useUniforms({ uHealth: 50 }) // Same uniform!
}
```

**Solution: Scoped uniforms**

```tsx
// ✅ Good: Scoped by feature
function PlayerHealth() {
  const { uHealth } = useUniforms({ uHealth: 100 }, 'player')
}

function EnemyHealth() {
  const { uHealth } = useUniforms({ uHealth: 50 }, 'enemy')
}
```

### Problem 4: Reactive Values in Shaders

When you're using UI controls (like Leva) that return plain objects, you need to convert them and update uniforms:

```tsx
// ❌ Bad: Manual conversion and updates
function ControlledMesh() {
  const { color } = useControls({ color: { x: 1, y: 0, z: 0 } })
  const uColor = useMemo(() => uniform(new THREE.Vector3()), [])

  useEffect(() => {
    uColor.value.set(color.x, color.y, color.z)
  }, [color, uColor])
}
```

**Solution: Function syntax with auto-conversion**

```tsx
// ✅ Good: Automatic conversion and updates
function ControlledMesh() {
  const { color } = useControls({ color: { x: 1, y: 0, z: 0 } })
  const { uColor } = useUniforms(() => ({ uColor: color })) // Auto-converts to Vector3
  // uColor updates automatically when color changes
}
```

### Problem 5: Post-Processing Setup Boilerplate

When you're setting up post-processing, you need to create PostProcessing, create passes, configure MRT, etc:

```tsx
// ❌ Bad: Manual setup
function Scene() {
  const { gl, scene, camera } = useThree()

  useLayoutEffect(() => {
    const pp = new THREE.PostProcessing(gl)
    const scenePass = pass(scene, camera)
    pp.outputNode = bloom(scenePass.getTextureNode())
    // Manual management, cleanup, etc.
  }, [gl, scene, camera])
}
```

**Solution: Declarative post-processing hook**

```tsx
// ✅ Good: Declarative setup
function Scene() {
  usePostProcessing(({ postProcessing, passes }) => {
    const sceneTexture = passes.scenePass.getTextureNode()
    postProcessing.outputNode = bloom(sceneTexture)
  })
}
```

---

## Architecture

### The Store

All WebGPU hooks interact with R3F's root store:

```typescript
interface RootState {
  uniforms: UniformRecord // Global uniforms + scopes
  nodes: NodeRecord // Global TSL nodes + scopes
  textures: TextureRecord // Texture registry
  postProcessing: PostProcessing | null
  passes: PassRecord // Post-processing passes
  // ... other R3F state
}
```

### Create-If-Not-Exists Pattern

All hooks use a "create if not exists, reuse if exists" pattern:

```tsx
// First call creates
const { uTime } = useUniforms({ uTime: 0 })

// Second call reuses
const { uTime } = useUniforms({ uTime: 0 }) // Same uniform instance
```

This means:

- No duplicate GPU allocations
- Shared state across component tree
- Safe to call in multiple components
- Works with React Strict Mode

### Imperative Updates

Uniform values are updated imperatively for GPU-only updates:

```tsx
// Component A - creates the uniform
function TimeKeeper() {
  const { uTime } = useUniforms({ uTime: 0 })

  // GPU-only update - no React re-render
  useFrame(({ elapsed }) => {
    uTime.value = elapsed
  })

  return null
}

// Component B - accesses uniform from state
function Consumer() {
  // Access uniforms from useFrame callback
  useFrame(({ elapsed, uniforms }) => {
    // uniforms are globally available in state
    uniforms.uTime.value = elapsed
  })

  return <mesh>...</mesh>
}
```

This avoids triggering React renders on every frame.

### Scoping System

Uniforms and nodes support scoping to prevent naming conflicts:

```
state.uniforms = {
  uTime: UniformNode        // Root-level
  uColor: UniformNode       // Root-level
  player: {                 // Scope
    uHealth: UniformNode    // Scoped uniform
    uMana: UniformNode      // Scoped uniform
  }
  enemy: {                  // Scope
    uHealth: UniformNode    // Different from player.uHealth
  }
}
```

Access scoped uniforms:

```tsx
// Create scoped
const { uHealth } = useUniforms({ uHealth: 100 }, 'player')

// Read scoped
const playerUniforms = useUniforms('player')

// Read all
const allUniforms = useUniforms()
```

---

## Common Patterns

### Pattern 1: Global Setup Component

Create a setup component for app-wide uniforms and nodes:

```tsx
function GlobalSetup() {
  // Global uniforms
  useUniforms({ uTime: 0, uDelta: 0 })

  // Global nodes
  useNodes(() => ({
    commonEffectFn: Fn(() => /* shared effect */),
    utilityFn: Fn(() => /* shared utility */)
  }))

  // Update global uniforms - access from state
  useFrame(({ elapsed, uniforms }, delta) => {
    // Access uniforms from state
    uniforms.uTime.value = elapsed
    uniforms.uDelta.value = delta
  })

  return null
}

function App() {
  return (
    <Canvas renderer>
      <GlobalSetup />
      {/* Rest of scene */}
    </Canvas>
  )
}

// Any component can access these uniforms from state
function SomeComponent() {
  useFrame(({ uniforms }) => {
    // Global uniforms are available
    const time = uniforms.uTime.value
    // Use in logic...
  })
}
```

### Pattern 2: Feature-Scoped Uniforms

Organize uniforms by feature or component:

```tsx
function PlayerSystem() {
  const { uHealth, uMana, uSpeed } = useUniforms(
    {
      uHealth: 100,
      uMana: 50,
      uSpeed: 1.0,
    },
    'player',
  )

  // Update player uniforms
  useFrame(() => {
    // Player logic
  })

  return <PlayerMesh />
}

function EnemySystem() {
  const { uHealth, uAggression } = useUniforms(
    {
      uHealth: 75,
      uAggression: 0.8,
    },
    'enemy',
  )

  return <EnemyMesh />
}
```

### Pattern 3: Leva Integration

Leva values can be passed directly - component re-renders on change:

```tsx
import { useControls } from 'leva'

function ControlledEffect() {
  const { color, intensity, speed } = useControls({
    color: { x: 1, y: 0, z: 0 },
    intensity: { value: 1.0, min: 0, max: 2 },
    speed: { value: 1.0, min: 0, max: 5 },
  })

  // Direct object syntax - Leva re-renders component on change
  // Auto-converts plain object to Vector3
  const { uColor, uIntensity, uSpeed } = useUniforms({
    uColor: color,
    uIntensity: intensity,
    uSpeed: speed,
  })

  // Or function syntax (same result, no real benefit for Leva)
  // const { uColor, uIntensity, uSpeed } = useUniforms(() => ({
  //   uColor: color,
  //   uIntensity: intensity,
  //   uSpeed: speed,
  // }))

  // Use in material...
}
```

### Pattern 4: Accessing Scoped Uniforms/Nodes

Access scoped uniforms and nodes directly in `useLocalNodes` instead of reading them separately:

```tsx
// Set up scoped uniforms and nodes
function EffectsSystem() {
  useUniforms({ uGlowIntensity: 1.0, uRimPower: 2.0 }, 'effects')
  useNodes(() => ({
    rimLightFn: Fn(() => /* rim light calculation */),
  }), 'effects')
  return null
}

// ❌ Bad: Extra reads
function GlowMesh() {
  const effectUniforms = useUniforms('effects')
  const effectNodes = useNodes('effects')

  const { emissiveNode } = useLocalNodes(() => ({
    emissiveNode: effectNodes.rimLightFn().mul(effectUniforms.uGlowIntensity)
  }))
}

// ✅ Good: Access directly from state parameter
function GlowMesh() {
  const { emissiveNode } = useLocalNodes(({ uniforms, nodes }) => ({
    // Access via uniforms.scopeName and nodes.scopeName
    emissiveNode: nodes.effects.rimLightFn().mul(uniforms.effects.uGlowIntensity),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial emissiveNode={emissiveNode} />
    </mesh>
  )
}
```

### Pattern 5: Shared + Local Composition

Mix shared nodes with local expressions:

```tsx
// Global shared node
function GlobalNodes() {
  useNodes(() => ({
    noiseFn: Fn(() => /* expensive noise function */)
  }))
  return null
}

// Local composition using shared node
function CustomMesh() {
  const { colorNode, positionNode } = useLocalNodes(({ nodes, uniforms }) => ({
    // Use shared noise with local parameters
    colorNode: nodes.noiseFn.mul(uniforms.uIntensity),
    positionNode: positionLocal.add(normalLocal.mul(nodes.noiseFn))
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial
        colorNode={colorNode}
        positionNode={positionNode}
      />
    </mesh>
  )
}
```

---

## Performance Considerations

### Deep Comparison for Functions

`useUniforms` with function syntax deep-compares output to prevent unnecessary GPU updates:

```tsx
// ✅ Good: Function runs every render, but GPU only updates when color changes
const { color } = useControls({ color: '#ff0000' })
const { uColor } = useUniforms(() => ({ uColor: color }))
```

Without deep comparison, this would update GPU every render even when color hasn't changed.

### Imperative Updates

Always update uniform values imperatively in `useFrame`:

```tsx
// ✅ Good: GPU-only update
useFrame(({ elapsed }) => {
  uTime.value = elapsed
})

// ✅ Also good: Access uniforms from state
useFrame(({ elapsed, uniforms }) => {
  uniforms.uTime.value = elapsed
})

// ❌ Bad: Triggers React re-render every frame
const [time, setTime] = useState(0)
useFrame(({ elapsed }) => {
  setTime(elapsed)
})
const { uTime } = useUniforms(() => ({ uTime: time }))
```

### Node Reuse

Share expensive node creations with `useNodes`:

```tsx
// ✅ Good: Created once, used everywhere
function GlobalNodes() {
  useNodes(() => ({
    expensiveNoise: Fn(() => {
      // Complex noise calculation
      // Only built once
    }),
  }))
}

// ❌ Bad: Rebuilt in every component
function Mesh() {
  const noise = useMemo(
    () =>
      Fn(() => {
        // Same complex noise
        // Rebuilt every time
      }),
    [],
  )
}
```

---

## TypeScript

All hooks have full type inference:

```tsx
import * as THREE from 'three/webgpu'

// Auto-inferred types
const { uTime } = useUniforms({ uTime: 0 }) // UniformNode<number>
const { uColor } = useUniforms({
  // UniformNode<THREE.Color>
  uColor: new THREE.Color('#ff0000'),
})
const { uVec } = useUniforms({
  // UniformNode<THREE.Vector3>
  uVec: new THREE.Vector3(1, 2, 3),
})

// Plain objects auto-convert with correct types
const { uVec } = useUniforms({
  // UniformNode<THREE.Vector3>
  uVec: { x: 1, y: 2, z: 3 },
})
```

---

## Resources

- **[useUniform](./useUniform.md)** - Single uniform API
- **[useUniforms](./useUniforms.md)** - Batch uniform management
- **[useNodes](./useNodes.md)** - Global TSL node management
- **[useLocalNodes](./useLocalNodes.md)** - Component-local nodes
- **[usePostProcessing](./usePostProcessing.md)** - Post-processing setup
- **[Three.js TSL Docs](https://threejs.org/docs/#manual/en/introduction/WebGPU-TSL)** - Three.js shading language
- **[WebGPU Renderer](https://threejs.org/docs/#api/en/renderers/WebGPURenderer)** - Three.js WebGPU renderer
