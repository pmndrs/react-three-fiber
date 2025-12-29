# useNodes Hook

Global TSL node management with create-if-not-exists pattern and optional scoping. Share expensive TSL expressions, functions, and operations across components.

## API

```tsx
// Create/get nodes at root level
const nodes = useNodes(() => ({
  wobbleFn: Fn(() => vec3(sin(time), cos(time), sin(time.mul(2))))
}))

// Create/get nodes in a scope
const nodes = useNodes(() => ({
  effectFn: Fn(() => /* effect logic */)
}), 'effects')

// Read all nodes
const allNodes = useNodes()

// Read nodes from a scope
const effectNodes = useNodes('effects')
```

### Parameters

| Parameter | Type                    | Description                                    |
| --------- | ----------------------- | ---------------------------------------------- |
| `creator` | `NodeCreator \| string` | Function that returns TSL nodes, or scope name |
| `scope`   | `string`                | Optional scope name for organization           |

### NodeCreator Function

```typescript
type NodeCreator<T> = (state: RootState) => T
```

- Receives full RootState for accessing uniforms, camera, etc.
- Returns object mapping names to TSL nodes
- Nodes are cached - function only builds them once

### Return Value

Returns `NodeRecord` - object mapping names to TSL nodes:

```typescript
{
  wobbleFn: Node
  colorNode: Node
  // ... etc
}
```

---

## Basic Usage

### Shared Function Nodes

```tsx
import { useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, vec3, sin, cos, time } from 'three/tsl'

// Define shared nodes once (usually near root)
function GlobalNodes() {
  useNodes(() => ({
    wobbleFn: Fn(() => {
      return vec3(sin(time), cos(time.mul(1.3)), sin(time.mul(2)))
    }),
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

---

## What to Store in useNodes

### ✅ Good: Expensive Operations to Share

```tsx
useNodes(() => ({
  // Complex functions used in multiple materials
  noiseFn: Fn(() => {
    // Expensive multi-octave noise
    return fbm(positionWorld.mul(scale))
  }),

  // Reusable effect functions
  glowFn: Fn(([color, intensity]) => {
    return color.mul(pow(fresnel, intensity))
  }),

  // Shared varyings
  vWorldPos: varying(vec3()),

  // Shared attributes
  aOffset: attribute('offset', 'vec3'),
}))
```

### ❌ Bad: Simple Expressions

```tsx
// Don't store trivial operations
useNodes(() => ({
  simpleAdd: positionLocal.add(vec3(0, 1, 0)), // Too simple
  constant: vec3(1, 0, 0), // Just use directly
}))

// Instead use directly or in useLocalNodes
const colorNode = vec3(1, 0, 0)
```

---

## Scoped Nodes

Prevent naming conflicts with scopes:

```tsx
// Player effects
function PlayerEffects() {
  useNodes(() => ({
    damageFn: Fn(() => /* damage visual effect */),
    healFn: Fn(() => /* heal visual effect */)
  }), 'player')

  return null
}

// Enemy effects - same names, different scope
function EnemyEffects() {
  useNodes(() => ({
    damageFn: Fn(() => /* enemy damage effect */),
    attackFn: Fn(() => /* enemy attack effect */)
  }), 'enemy')

  return null
}

// Use scoped nodes directly
function PlayerMesh() {
  const { colorNode } = useLocalNodes(({ nodes }) => ({
    colorNode: nodes.player.damageFn(),
  }))
}
```

---

## Examples

### Shared Noise Function

```tsx
import { useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, vec3, sin, cos, float, positionWorld } from 'three/tsl'

// Define shared noise once
function NoiseSystem() {
  useNodes(() => ({
    // Expensive noise function - built once, used everywhere
    fbmNoise: Fn(([p, octaves = float(4)]) => {
      const result = float(0).toVar()
      const amplitude = float(1).toVar()
      const frequency = float(1).toVar()

      Loop(octaves, () => {
        result.addAssign(sin(p.mul(frequency)).mul(amplitude))
        amplitude.mulAssign(0.5)
        frequency.mulAssign(2.0)
      })

      return result
    }),
  }))

  return null
}

// Use in multiple materials
function TerrainMaterial() {
  const { displacementNode } = useLocalNodes(({ nodes, uniforms }) => ({
    displacementNode: nodes.fbmNoise(positionWorld, 4),
  }))

  return <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(displacementNode))} />
}

function CloudMaterial() {
  const { opacityNode } = useLocalNodes(({ nodes }) => ({
    opacityNode: nodes.fbmNoise(positionWorld.mul(2), 3),
  }))

  return <meshBasicNodeMaterial transparent opacityNode={opacityNode} />
}
```

### Effect Functions

```tsx
import { Fn, mix, pow, dot, normalize } from 'three/tsl'

function EffectNodes() {
  useNodes(
    ({ uniforms }) => ({
      // Fresnel effect (shared across materials)
      fresnelFn: Fn(([power = float(3)]) => {
        const viewDir = normalize(cameraPosition.sub(positionWorld))
        const NdotV = dot(normalWorld, viewDir).max(0)
        return pow(float(1).sub(NdotV), power)
      }),

      // Rim lighting
      rimLightFn: Fn(([color, intensity]) => {
        const fresnel = fresnelFn(float(5))
        return color.mul(fresnel).mul(intensity)
      }),

      // Distance fade
      distanceFadeFn: Fn(([fadeStart, fadeEnd]) => {
        const dist = length(cameraPosition.sub(positionWorld))
        return dist.smoothstep(fadeStart, fadeEnd)
      }),
    }),
    'effects',
  )

  return null
}

// Use effects - access scoped nodes directly
function GlowingMesh() {
  const { emissiveNode } = useLocalNodes(({ uniforms, nodes }) => ({
    // Access scoped nodes via nodes.scopeName (like uniforms.scopeName)
    emissiveNode: nodes.effects.rimLightFn(color('#ff00ff'), uniforms.glowIntensity),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial emissiveNode={emissiveNode} />
    </mesh>
  )
}
```

### Shared Varyings

```tsx
import { varying, vec3, vec4, positionWorld, normalWorld } from 'three/tsl'

function SharedVaryings() {
  useNodes(() => ({
    // Pass data from vertex to fragment shader
    vWorldPos: varying(vec3()),
    vWorldNormal: varying(vec3()),
    vCustomData: varying(vec4()),
  }))

  return null
}

function CustomMaterial() {
  const { vWorldPos, vWorldNormal } = useNodes()

  // In vertex shader, assign to varyings
  const vertexNode = Fn(() => {
    vWorldPos.assign(positionWorld)
    vWorldNormal.assign(normalWorld)
  })

  // In fragment shader, read from varyings
  const fragmentNode = Fn(() => {
    const distFromOrigin = length(vWorldPos)
    return vec4(vWorldNormal.mul(0.5).add(0.5), 1)
  })

  return <meshBasicNodeMaterial vertexNode={vertexNode()} fragmentNode={fragmentNode()} />
}
```

---

## API Modes

### Create Mode (Function)

```tsx
const { nodeName } = useNodes(() => ({
  nodeName: Fn(() => /* node logic */)
}))
// First call: creates and caches node
// Subsequent calls: returns cached node
```

### Create Mode (Scoped)

```tsx
const { nodeName } = useNodes(() => ({
  nodeName: Fn(() => /* node logic */)
}), 'scopeName')
// Creates in scope: state.nodes.scopeName.nodeName
```

### Read Mode (All)

```tsx
const allNodes = useNodes()
// Returns: { wobbleFn, colorNode, effects: { glowFn }, ... }
```

### Read Mode (Scope)

```tsx
const effectNodes = useNodes('effects')
// Returns: { glowFn, rimLightFn, ... }
```

---

## Utility Functions

### removeNodes

Remove nodes by name:

```tsx
import { removeNodes } from '@react-three/fiber/webgpu'

const store = useStore()

// Remove from root
removeNodes(store.setState, ['wobbleFn', 'noiseFn'])

// Remove from scope
removeNodes(store.setState, ['glowFn'], 'effects')
```

### clearNodeScope

Remove entire scope:

```tsx
import { clearNodeScope } from '@react-three/fiber/webgpu'

const store = useStore()
clearNodeScope(store.setState, 'effects')
```

### clearRootNodes

Clear all root-level nodes (keeps scopes):

```tsx
import { clearRootNodes } from '@react-three/fiber/webgpu'

const store = useStore()
clearRootNodes(store.setState)
```

---

## useNodes vs useLocalNodes

### Use `useNodes` when:

- Node is used in **multiple components**
- Node is **expensive to create**
- Node needs to be **shared across scope**

```tsx
// ✅ Good: Shared across many materials
useNodes(() => ({
  expensiveNoise: Fn(() => {
    // Complex multi-octave noise
    // Used by 10+ materials
  }),
}))
```

### Use `useLocalNodes` when:

- Node is **component-specific**
- Node **depends on props or state**
- Node is a **simple composition** of shared nodes

```tsx
// ✅ Good: Component-specific composition
const { colorNode } = useLocalNodes(({ nodes, uniforms }) => ({
  colorNode: nodes.noiseFn.mul(uniforms.intensity),
}))
```

---

## Best Practices

### 1. Define Shared Nodes Early

Create shared nodes near the root of your app:

```tsx
function App() {
  return (
    <Canvas renderer>
      <GlobalNodes /> {/* Define shared nodes */}
      <Scene />
    </Canvas>
  )
}

function GlobalNodes() {
  useNodes(() => ({
    // Shared nodes for entire app
  }))
  return null
}
```

### 2. Use Scopes for Features

Organize nodes by feature or system:

```tsx
// ✅ Good: Scoped by feature
function TerrainSystem() {
  useNodes(() => ({
    erosionFn: Fn(() => /* terrain erosion */),
    vegetationFn: Fn(() => /* vegetation placement */)
  }), 'terrain')
}

function WaterSystem() {
  useNodes(() => ({
    waveFn: Fn(() => /* water waves */),
    foamFn: Fn(() => /* foam generation */)
  }), 'water')
}
```

### 3. Access RootState in Creator

Use the state parameter to access uniforms, nodes, etc:

```tsx
import { cameraPosition } from 'three/tsl'

useNodes(({ uniforms, size }) => ({
  // Can access global state (but prefer TSL built-ins for camera)
  responsiveFn: Fn(() => {
    const aspect = uniform(size.width / size.height)
    // Note: For camera use TSL's cameraPosition, not state.camera
    return cameraPosition.mul(aspect)
  }),
}))
```

### 4. Access Scoped Nodes Directly in useLocalNodes

```tsx
// ❌ Bad: Unnecessary extra read
const effectNodes = useNodes('effects')
const { colorNode } = useLocalNodes(() => ({
  colorNode: effectNodes.glowFn(),
}))

// ✅ Good: Access scoped nodes directly
const { colorNode } = useLocalNodes(({ nodes }) => ({
  colorNode: nodes.effects.glowFn(),
}))
```

### 5. Don't Store Simple Operations

```tsx
// ❌ Bad: Too simple to share
useNodes(() => ({
  addOne: positionLocal.add(vec3(0, 1, 0)),
}))

// ✅ Good: Use directly
const positionNode = positionLocal.add(vec3(0, 1, 0))
```

---

## TypeScript

Full type inference:

```tsx
import { Fn, vec3, Node } from 'three/tsl'

const nodes = useNodes(() => ({
  wobbleFn: Fn(() => vec3(0, 0, 0)), // NodeFunction
  colorNode: vec3(1, 0, 0), // Node
}))

nodes.wobbleFn // NodeFunction
nodes.colorNode // Node
```

Manual typing when needed:

```tsx
interface MyNodes {
  customFn: NodeFunction
  colorNode: Node
}

const nodes = useNodes(() => ({
  customFn: Fn(() => vec3(0, 0, 0)),
  colorNode: vec3(1, 0, 0),
})) as MyNodes
```

---

## Related Documentation

- **[useLocalNodes](./useLocalNodes.md)** - Component-local node creation
- **[useUniforms](./useUniforms.md)** - Global uniform management
- **[Overview](./overview.md)** - WebGPU hooks architecture and patterns
- **[Three.js TSL](https://threejs.org/docs/#manual/en/introduction/WebGPU-TSL)** - Three.js shading language
