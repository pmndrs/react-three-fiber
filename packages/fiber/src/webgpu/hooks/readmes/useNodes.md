# useNodes Hook

Global TSL node management with create-if-not-exists pattern and optional scoping. Share expensive TSL expressions, functions, and operations across components.

> For concepts like build-time vs run-time and TSL built-ins, see the [Overview](./overview.md).

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

### Return Value

Returns `NodesWithUtils<NodeRecord>` - object mapping names to TSL nodes, plus `removeNodes` and `clearNodes` utils.

---

## Basic Usage

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

### Good: Expensive Operations to Share

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
}))
```

### Bad: Simple Expressions

```tsx
// Don't store trivial operations
useNodes(() => ({
  simpleAdd: positionLocal.add(vec3(0, 1, 0)), // Too simple
  constant: vec3(1, 0, 0), // Just use directly
}))
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
  }), 'enemy')

  return null
}

// Access scoped nodes
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
import { Fn, float, Loop, sin, positionWorld } from 'three/tsl'

function NoiseSystem() {
  useNodes(() => ({
    // Expensive noise - built once, used everywhere
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

// Use in materials
function TerrainMaterial() {
  const { displacementNode } = useLocalNodes(({ nodes }) => ({
    displacementNode: nodes.fbmNoise(positionWorld, 4),
  }))

  return <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(displacementNode))} />
}
```

### Effect Functions

```tsx
import { Fn, float, pow, dot, normalize, cameraPosition, normalWorld, positionWorld } from 'three/tsl'

function EffectNodes() {
  useNodes(
    () => ({
      // Fresnel effect (shared across materials)
      fresnelFn: Fn(([power = float(3)]) => {
        const viewDir = normalize(cameraPosition.sub(positionWorld))
        const NdotV = dot(normalWorld, viewDir).max(0)
        return pow(float(1).sub(NdotV), power)
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
```

---

## useNodes vs useLocalNodes

### Use `useNodes` when:

- Node is used in **multiple components**
- Node is **expensive to create**
- Node needs to be **shared across scope**

### Use `useLocalNodes` when:

- Node is **component-specific**
- Node **depends on props or state**
- Node is a **simple composition** of shared nodes

```tsx
// ✅ Shared across many materials → useNodes
useNodes(() => ({
  expensiveNoise: Fn(() => {
    /* complex noise */
  }),
}))

// ✅ Component-specific composition → useLocalNodes
const { colorNode } = useLocalNodes(({ nodes, uniforms }) => ({
  colorNode: nodes.noiseFn.mul(uniforms.intensity),
}))
```

---

## Utils

The hook returns `removeNodes` and `clearNodes` utils alongside your nodes. These can be used in event handlers, useEffect cleanup, etc.

### removeNodes

Remove specific nodes by name:

```tsx
const { removeNodes, myNode } = useNodes(() => ({ myNode: float(1) }))

// Remove single node from root
removeNodes('myNode')

// Remove multiple nodes from a scope
removeNodes(['nodeA', 'nodeB'], 'effects')

// Use in cleanup
useEffect(() => {
  return () => removeNodes('temporaryNode')
}, [])
```

### clearNodes

Clear nodes by scope or all at once:

```tsx
const { clearNodes } = useNodes()

// Clear specific scope
clearNodes('effects')

// Clear only root-level nodes (preserve scopes)
clearNodes('root')

// Clear everything (root + all scopes)
clearNodes()

// Use in cleanup
useEffect(() => {
  return () => clearNodes('myScope')
}, [])
```

### Deprecated Standalone Functions

The standalone `removeNodes(set, names, scope)`, `clearNodeScope(set, scope)`, and `clearRootNodes(set)` functions are deprecated. Use the utils returned from the hook instead.

---

## Best Practices

### Define Shared Nodes Early

```tsx
function App() {
  return (
    <Canvas renderer>
      <GlobalNodes /> {/* Define shared nodes */}
      <Scene />
    </Canvas>
  )
}
```

### Use Scopes for Features

```tsx
// ✅ Good: Scoped by feature
function TerrainSystem() {
  useNodes(() => ({
    erosionFn: Fn(() => /* terrain erosion */),
  }), 'terrain')
}

function WaterSystem() {
  useNodes(() => ({
    waveFn: Fn(() => /* water waves */),
  }), 'water')
}
```

### Access Scoped Nodes Directly

```tsx
// ✅ Good: Access from state parameter
const { colorNode } = useLocalNodes(({ nodes }) => ({
  colorNode: nodes.effects.glowFn(),
}))

// ❌ Bad: Unnecessary extra read
const effectNodes = useNodes('effects')
const { colorNode } = useLocalNodes(() => ({
  colorNode: effectNodes.glowFn(),
}))
```

---

## Related

- **[useLocalNodes](./useLocalNodes.md)** - Component-local node creation
- **[useUniforms](./useUniforms.md)** - Global uniform management
- **[Overview](./overview.md)** - Concepts and architecture
