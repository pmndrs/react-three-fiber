# useLocalNodes Hook

Creates component-local TSL nodes that rebuild when dependencies change. Unlike `useNodes`, this does NOT register to the global store - nodes are local to the component.

## API

```tsx
const localNodes = useLocalNodes((state) => ({
  colorNode: nodes.noiseFn.mul(uniforms.intensity),
  positionNode: positionLocal.add(vec3(0, uniforms.height, 0)),
}))
```

### Parameters

| Parameter | Type                  | Description                                     |
| --------- | --------------------- | ----------------------------------------------- |
| `creator` | `LocalNodeCreator<T>` | Function that receives RootState, returns nodes |

### LocalNodeCreator Function

```typescript
type LocalNodeCreator<T> = (state: RootState) => T
```

- Receives full RootState - destructure what you need
- Returns any object (not limited to TSL nodes)
- Re-executes when `uniforms`, `nodes`, or `textures` change

### Return Value

Returns whatever your creator function returns - typically an object with TSL nodes:

```typescript
{
  colorNode: Node
  positionNode: Node
  customValue: any
  // ... anything you return
}
```

---

## Basic Usage

### Component-Specific Nodes

```tsx
import { useLocalNodes } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal, sin, time } from 'three/tsl'

function CustomMesh() {
  // Nodes specific to this component
  const { positionNode, colorNode } = useLocalNodes(({ uniforms }) => ({
    positionNode: positionLocal.add(normalLocal.mul(sin(time).mul(uniforms.displacement))),
    colorNode: vec3(sin(time).mul(0.5).add(0.5), uniforms.hue, 0.5),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial positionNode={positionNode} colorNode={colorNode} />
    </mesh>
  )
}
```

---

## When to Use

### ✅ Use `useLocalNodes` for:

1. **Component-specific compositions** of shared nodes
2. **Props-driven** node creation
3. **Simple expressions** that don't need sharing
4. **Combining** global uniforms/nodes with local logic

```tsx
// ✅ Good: Component-specific, uses shared resources
function Terrain({ scale = 1 }) {
  const { displacementNode } = useLocalNodes(({ nodes, uniforms }) => ({
    displacementNode: nodes.noiseFn(positionLocal.mul(scale)).mul(uniforms.terrainHeight),
  }))

  return <mesh>...</mesh>
}
```

### ❌ Don't use for:

1. **Expensive nodes** used in multiple components (use `useNodes`)
2. **Static nodes** that never change (use `useMemo` or direct creation)

```tsx
// ❌ Bad: Expensive and shared across many components
function Mesh() {
  const { noiseFn } = useLocalNodes(() => ({
    noiseFn: Fn(() => {
      // Complex multi-octave noise
      // Rebuilt every time uniforms change
      // Used in 10+ components
    }),
  }))
}

// ✅ Good: Share expensive nodes with useNodes
function GlobalNodes() {
  useNodes(() => ({
    noiseFn: Fn(() => {
      // Built once, shared everywhere
    }),
  }))
}
```

---

## Automatic Rebuild Triggers

`useLocalNodes` rebuilds when these change:

- `state.uniforms` - Any uniform added/removed
- `state.nodes` - Any node added/removed
- `state.textures` - Any texture added/removed

```tsx
// Rebuilds automatically when uIntensity is registered
const { colorNode } = useLocalNodes(({ uniforms }) => ({
  colorNode: vec3(1, 0, 0).mul(uniforms.uIntensity),
}))

// Later, when another component registers uIntensity:
useUniforms({ uIntensity: 1.0 })
// → colorNode rebuilds with access to uIntensity
```

---

## Examples

### Composition of Shared Nodes

```tsx
import { useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, sin, time } from 'three/tsl'

// Global shared function
function GlobalNodes() {
  useNodes(() => ({
    wobbleFn: Fn(() => sin(time).mul(0.5).add(0.5)),
  }))
  return null
}

// Local composition
function AnimatedMesh() {
  const { colorNode } = useLocalNodes(({ nodes, uniforms }) => ({
    // Combine shared wobbleFn with local uniforms
    colorNode: nodes.wobbleFn.mul(uniforms.baseColor),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={colorNode} />
    </mesh>
  )
}
```

### Props-Driven Nodes

```tsx
interface MeshProps {
  scale: number
  intensity: number
  hueShift: number
}

function PropsBasedMesh({ scale, intensity, hueShift }: MeshProps) {
  // Props captured in closure, nodes rebuild when uniforms/nodes change
  const { positionNode, colorNode } = useLocalNodes(({ nodes, uniforms }) => {
    const noise = nodes.noiseFn(positionLocal.mul(scale))

    return {
      positionNode: positionLocal.add(normalLocal.mul(noise).mul(intensity)),
      colorNode: vec3(noise.add(hueShift), 0.5, 0.8),
    }
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial positionNode={positionNode} colorNode={colorNode} />
    </mesh>
  )
}
```

### Fog Effect (From Examples)

```tsx
import { useLocalNodes } from '@react-three/fiber/webgpu'
import { fog, positionWorld, positionView, color, float } from 'three/tsl'

function FogEffect() {
  const { fogNode, backgroundNode } = useLocalNodes(({ uniforms }) => {
    const u = uniforms.fog

    // Distance-based fog
    const distanceFade = positionView.z.negate().smoothstep(u.fogStart, u.fogEnd)

    // Height-based fog
    const heightAboveFog = positionWorld.y.sub(u.fogHeight)
    const heightFogAmount = float(u.fogThickness)
      .sub(heightAboveFog)
      .div(u.fogThickness)
      .pow(u.fogFalloff)
      .saturate()
      .mul(u.fogDensity)

    // Combine
    const finalFogAmount = distanceFade.mul(heightFogAmount)
    const fogColor = color(u.groundColor)

    return {
      fogNode: fog(fogColor, finalFogAmount),
      backgroundNode: normalWorld.y.max(0).mix(color(u.groundColor), color(u.skyColor)),
    }
  })

  // Apply to scene
  useEffect(() => {
    scene.fogNode = fogNode
    scene.backgroundNode = backgroundNode
  }, [fogNode, backgroundNode])

  return null
}
```

### Material Variations (GPU-side branching)

```tsx
import { If, select } from 'three/tsl'

function MaterialVariations() {
  const { uVariant } = useUniforms({ uVariant: 0 })

  // Use TSL conditionals for GPU-side branching
  const { colorNode } = useLocalNodes(({ uniforms, nodes }) => {
    // ⚠️ WRONG: JavaScript conditionals run at BUILD TIME only
    // if (uniforms.uVariant.value === 0) { ... }

    // ✅ CORRECT: TSL If() nodes run on GPU every frame
    const result = vec3(0).toVar()

    If(uniforms.uVariant.equal(0), () => {
      result.assign(nodes.noisePattern)
    })
      .ElseIf(uniforms.uVariant.equal(1), () => {
        result.assign(nodes.stripesPattern)
      })
      .Else(() => {
        result.assign(nodes.dotsPattern)
      })

    return { colorNode: result }
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={colorNode} />
    </mesh>
  )
}

// Alternative: Use select() for cleaner two-way branching
function MaterialToggle() {
  const { uUseNoise } = useUniforms({ uUseNoise: 1 })

  const { colorNode } = useLocalNodes(({ uniforms, nodes }) => {
    // select(condition, valueIfTrue, valueIfFalse)
    const result = select(uniforms.uUseNoise.equal(1), nodes.noisePattern, nodes.stripesPattern)

    return { colorNode: result }
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={colorNode} />
    </mesh>
  )
}
```

### Accessing RootState (viewport, size, custom data)

```tsx
import { cameraPosition } from 'three/tsl'

function ViewportReactiveShader() {
  // ⚠️ For camera data, use TSL built-in nodes!
  const { distanceNode } = useLocalNodes(() => ({
    // ✅ CORRECT: Use TSL's cameraPosition node
    distanceNode: length(cameraPosition.sub(positionWorld)),
  }))

  // ✅ useLocalNodes is useful for viewport/size from RootState
  const { aspectNode } = useLocalNodes(({ size, viewport }) => ({
    // Access viewport or size properties
    aspectNode: uniform(size.width / size.height),
    // Or viewport bounds for responsive effects
    scaleNode: uniform(viewport.factor),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={distanceNode.mul(aspectNode)} />
    </mesh>
  )
}
```

**Available TSL Camera Nodes** (use these instead of accessing `state.camera`):

- `cameraPosition` - Camera world position
- `cameraViewMatrix` - Camera view matrix
- `cameraProjectionMatrix` - Camera projection matrix
- `cameraNormalMatrix` - Camera normal matrix
- `cameraWorldMatrix` - Camera world matrix

### Returning Non-Node Values

```tsx
function CustomSetup() {
  // Can return anything, not just nodes
  const { nodes, metadata, helpers } = useLocalNodes(({ uniforms }) => ({
    nodes: {
      colorNode: vec3(uniforms.color),
      scaleNode: float(uniforms.scale),
    },
    metadata: {
      createdAt: Date.now(),
      version: '1.0',
    },
    helpers: {
      updateScale: (val: number) => (uniforms.scale.value = val),
    },
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={nodes.colorNode} />
    </mesh>
  )
}
```

---

## Rebuild Behavior

### What Triggers Rebuild

```tsx
const localNodes = useLocalNodes(({ uniforms, nodes, textures }) => ({
  // Uses uniforms, nodes, textures
}))

// Rebuilds when:
// 1. Any uniform is added/removed (not value changes)
// 2. Any node is added/removed
// 3. Any texture is added/removed
```

### Value Changes Don't Trigger Rebuild

```tsx
const { uTime } = useUniforms({ uTime: 0 })

const { colorNode } = useLocalNodes(({ uniforms }) => ({
  colorNode: sin(uniforms.uTime), // References uniform
}))

// This does NOT rebuild colorNode:
useFrame(() => {
  uTime.value = performance.now() // Value change only
})

// This DOES rebuild colorNode:
useUniforms({ uNewUniform: 5 }) // New uniform added
```

This is intentional - TSL nodes reference uniforms, they don't capture values.

---

## Performance

### Efficient for Component-Local Work

```tsx
// ✅ Good: Local composition, rebuilds only when dependencies change
const { colorNode } = useLocalNodes(({ nodes, uniforms }) => ({
  colorNode: nodes.sharedNoise.mul(uniforms.localIntensity),
}))
```

### Avoid Expensive Operations

```tsx
// ❌ Bad: Expensive operation rebuilt on every uniform change
const { noiseFn } = useLocalNodes(() => ({
  noiseFn: Fn(() => {
    // Complex 10-octave noise
    // Rebuilt whenever ANY uniform changes
  }),
}))

// ✅ Good: Share expensive operations with useNodes
useNodes(() => ({
  noiseFn: Fn(() => {
    // Built once, reused everywhere
  }),
}))
```

---

## Best Practices

### 1. Destructure Only What You Need

```tsx
// ✅ Good: Clear dependencies
const { colorNode } = useLocalNodes(({ uniforms, nodes }) => ({
  colorNode: nodes.noiseFn.mul(uniforms.intensity),
}))

// ❌ Bad: Unclear what's being used
const { colorNode } = useLocalNodes((state) => ({
  colorNode: state.nodes.noiseFn.mul(state.uniforms.intensity),
}))
```

### 2. Use for Composition, Not Creation

```tsx
// ✅ Good: Composing shared resources
const { output } = useLocalNodes(({ nodes, uniforms }) => ({
  output: nodes.wobbleFn.mul(uniforms.scale)
}))

// ❌ Bad: Creating expensive nodes locally
const { noiseFn } = useLocalNodes(() => ({
  noiseFn: Fn(() => /* expensive noise */)
}))
```

### 3. Keep Creator Functions Simple

```tsx
// ✅ Good: Simple, clear composition
const { colorNode } = useLocalNodes(({ nodes, uniforms }) => ({
  colorNode: mix(nodes.baseColor, nodes.highlightColor, uniforms.blend)
}))

// ❌ Bad: Complex logic in creator
const { nodes } = useLocalNodes(({ uniforms }) => {
  const temp1 = /* ... complex calc ... */
  const temp2 = /* ... more calc ... */
  const temp3 = /* ... even more ... */
  return { colorNode: temp3 }
})
```

### 4. Component-Specific Only

```tsx
// ✅ Good: Truly component-specific
function MyMesh() {
  const { colorNode } = useLocalNodes(({ uniforms }) => ({
    colorNode: vec3(uniforms.myLocalColor) // Only used here
  }))
}

// ❌ Bad: Shared across multiple components
function MeshA() {
  const { sharedFn } = useLocalNodes(() => ({
    sharedFn: Fn(() => /* used in MeshA, MeshB, MeshC */)
  }))
}
// Should use useNodes instead for sharing
```

---

## TypeScript

Full type inference:

```typescript
import { Node } from 'three/tsl'

const localNodes = useLocalNodes(({ uniforms, nodes }) => ({
  colorNode: vec3(1, 0, 0), // Node
  positionNode: positionLocal, // Node
  customValue: 42, // number
}))

localNodes.colorNode // Node
localNodes.positionNode // Node
localNodes.customValue // number
```

Manual typing:

```typescript
interface LocalNodes {
  colorNode: Node
  positionNode: Node
  metadata: {
    version: string
  }
}

const localNodes = useLocalNodes(({ uniforms }) => ({
  colorNode: vec3(uniforms.color),
  positionNode: positionLocal,
  metadata: { version: '1.0' },
})) as LocalNodes
```

---

## Comparison with useNodes

| Feature             | useNodes                        | useLocalNodes                       |
| ------------------- | ------------------------------- | ----------------------------------- |
| **Storage**         | Global store                    | Component-local                     |
| **Sharing**         | Shared across components        | Component-specific                  |
| **Best for**        | Expensive, reusable nodes       | Component compositions              |
| **Rebuild trigger** | Never (cached)                  | When uniforms/nodes/textures change |
| **Use case**        | Functions, varyings, attributes | Material-specific expressions       |

---

## Related Documentation

- **[useNodes](./useNodes.md)** - Global TSL node management
- **[useUniforms](./useUniforms.md)** - Global uniform management
- **[Overview](./overview.md)** - WebGPU hooks architecture and patterns
- **[Three.js TSL](https://threejs.org/docs/#manual/en/introduction/WebGPU-TSL)** - Three.js shading language
