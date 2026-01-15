# useUniforms Hook

Batch uniform management with scoping and create-if-not-exists pattern.

> For concepts like build-time vs run-time and TSL built-ins, see the [Overview](./overview.md).

## API

```tsx
// Create/update uniforms at root level
const uniforms = useUniforms({ uTime: 0, uColor: '#ff0000' })

// Create/update uniforms in a scope
const uniforms = useUniforms({ uHealth: 100 }, 'player')

// Function syntax for RootState access
const uniforms = useUniforms((state) => ({
  uAspect: state.size.width / state.size.height,
}))

// Read all uniforms
const allUniforms = useUniforms()

// Read uniforms from a scope
const playerUniforms = useUniforms('player')
```

### Parameters

| Parameter | Type                                 | Description                                  |
| --------- | ------------------------------------ | -------------------------------------------- |
| `creator` | `UniformCreator \| object \| string` | Uniform definitions, function, or scope name |
| `scope`   | `string`                             | Optional scope name for organization         |

### Return Value

Returns `UniformsWithUtils<UniformRecord>` - object mapping uniform names to UniformNodes, plus `removeUniforms` and `clearUniforms` utils:

```typescript
{
  uTime: UniformNode<number>
  uColor: UniformNode<THREE.Color>
  removeUniforms: (names: string | string[], scope?: string) => void
  clearUniforms: (scope?: string) => void
}
```

---

## Basic Usage

```tsx
import { useUniforms } from '@react-three/fiber/webgpu'

function Material() {
  const { uTime, uColor, uScale } = useUniforms({
    uTime: 0,
    uColor: '#ff0000',
    uScale: 1.5,
  })

  useFrame(({ elapsed }) => {
    uTime.value = elapsed
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial colorNode={uColor} />
    </mesh>
  )
}
```

---

## Scoped Uniforms

Scopes prevent naming conflicts across features:

```tsx
// Player feature
function PlayerSystem() {
  const { uHealth, uMana, uSpeed } = useUniforms(
    {
      uHealth: 100,
      uMana: 50,
      uSpeed: 1.0,
    },
    'player',
  )

  return <PlayerMesh />
}

// Enemy feature - same names, different scope
function EnemySystem() {
  const { uHealth, uSpeed } = useUniforms(
    {
      uHealth: 75,
      uSpeed: 0.8,
    },
    'enemy',
  )

  return <EnemyMesh />
}

// Access scoped uniforms elsewhere
function DebugPanel() {
  const playerUniforms = useUniforms('player')
  const enemyUniforms = useUniforms('enemy')

  return (
    <div>
      <p>Player Health: {playerUniforms.uHealth?.value}</p>
      <p>Enemy Health: {enemyUniforms.uHealth?.value}</p>
    </div>
  )
}
```

### Accessing Scopes in useLocalNodes

```tsx
// ✅ Good: Access directly from state parameter
function GlowMesh() {
  const { emissiveNode } = useLocalNodes(({ uniforms, nodes }) => ({
    emissiveNode: nodes.effects.rimLightFn().mul(uniforms.effects.uGlowIntensity),
  }))

  return <meshStandardNodeMaterial emissiveNode={emissiveNode} />
}
```

---

## Supported Input Types

### Primitives

```tsx
const { uNumber, uBool } = useUniforms({
  uNumber: 5.0,
  uBool: true,
})
```

### Strings (Auto-Convert to Color)

```tsx
const { uColor } = useUniforms({
  uColor: '#ff0000', // Becomes THREE.Color
})
```

### Three.js Types

```tsx
import * as THREE from 'three/webgpu'

const uniforms = useUniforms({
  uVec2: new THREE.Vector2(1, 2),
  uVec3: new THREE.Vector3(1, 2, 3),
  uColor: new THREE.Color(0xff0000),
  uMat4: new THREE.Matrix4(),
})
```

### Plain Objects (Auto-Convert to Vectors)

```tsx
// Perfect for Leva controls!
const uniforms = useUniforms({
  uVec2: { x: 1, y: 2 }, // Becomes THREE.Vector2
  uVec3: { x: 1, y: 2, z: 3 }, // Becomes THREE.Vector3
})
```

---

## Leva Integration

Leva controls work seamlessly - component re-renders on change, plain objects auto-convert:

```tsx
import { useControls } from 'leva'
import { useUniforms } from '@react-three/fiber/webgpu'

function ControlledMaterial() {
  const { color, intensity, offset } = useControls({
    color: { x: 1, y: 0.5, z: 0 },
    intensity: { value: 1.0, min: 0, max: 2 },
    offset: { x: 0, y: 1, z: 0 },
  })

  // Plain objects auto-convert to THREE.Vector3
  const { uColor, uIntensity, uOffset } = useUniforms({
    uColor: color,
    uIntensity: intensity,
    uOffset: offset,
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial colorNode={uColor} />
    </mesh>
  )
}
```

---

## Function Syntax

Use function syntax when you need RootState access:

```tsx
// Access viewport/size from RootState
const { uAspect, uPixelRatio } = useUniforms((state) => ({
  uAspect: state.size.width / state.size.height,
  uPixelRatio: state.viewport.dpr,
}))
```

**Note:** For Leva or local state, object syntax is simpler:

```tsx
// ✅ Simpler for Leva/state
const { intensity } = useControls({ intensity: 1.0 })
const { uIntensity } = useUniforms({ uIntensity: intensity })
```

---

## Performance

### Deep Comparison

Function syntax deep-compares output to prevent unnecessary GPU updates:

```tsx
// Function runs every render, but GPU only updates when color changes
const { color } = useControls({ color: '#ff0000' })
const { uColor } = useUniforms(() => ({ uColor: color }))
```

### Imperative Updates

Always update uniform values imperatively in `useFrame`:

```tsx
// ✅ Good: GPU-only update
const { uTime } = useUniforms({ uTime: 0 })
useFrame(({ elapsed }) => {
  uTime.value = elapsed
})

// ✅ Also good: Access from state
useFrame(({ elapsed, uniforms }) => {
  uniforms.uTime.value = elapsed
})
```

---

## Utils

The hook returns `removeUniforms` and `clearUniforms` utils alongside your uniforms. These can be used in event handlers, useEffect cleanup, etc.

### removeUniforms

Remove specific uniforms by name:

```tsx
const { removeUniforms, uTime } = useUniforms({ uTime: 0 })

// Remove single uniform from root
removeUniforms('uTime')

// Remove multiple uniforms from a scope
removeUniforms(['uHealth', 'uMana'], 'player')

// Use in cleanup
useEffect(() => {
  return () => removeUniforms('temporaryUniform')
}, [])
```

### clearUniforms

Clear uniforms by scope or all at once:

```tsx
const { clearUniforms } = useUniforms()

// Clear specific scope
clearUniforms('player')

// Clear only root-level uniforms (preserve scopes)
clearUniforms('root')

// Clear everything (root + all scopes)
clearUniforms()

// Use in cleanup
useEffect(() => {
  return () => clearUniforms('myScope')
}, [])
```

### Deprecated Standalone Functions

The standalone `removeUniforms(set, names, scope)`, `clearScope(set, scope)`, and `clearRootUniforms(set)` functions are deprecated. Use the utils returned from the hook instead.

---

## TypeScript

Full type inference:

```tsx
import * as THREE from 'three/webgpu'

const uniforms = useUniforms({
  uNumber: 0, // UniformNode<number>
  uColor: '#ff0000', // UniformNode<THREE.Color>
  uVec2: { x: 1, y: 2 }, // UniformNode<THREE.Vector2>
  uVec3: new THREE.Vector3(1, 2, 3), // UniformNode<THREE.Vector3>
})
```

---

## Related

- **[useUniform](./useUniform.md)** - Single uniform management
- **[useNodes](./useNodes.md)** - Global TSL node management
- **[Overview](./overview.md)** - Concepts and architecture
