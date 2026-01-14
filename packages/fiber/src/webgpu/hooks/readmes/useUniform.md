# useUniform Hook

Simple single-uniform hook with create/get/update semantics.

> For concepts like build-time vs run-time and TSL built-ins, see the [Overview](./overview.md).

## API

```tsx
// Create uniform (or get existing + update value)
const uName = useUniform(name, value)

// Get existing uniform (throws if not found)
const uName = useUniform(name)
```

### Parameters

| Parameter | Type           | Description                                   |
| --------- | -------------- | --------------------------------------------- |
| `name`    | `string`       | Unique identifier for the uniform             |
| `value`   | `UniformValue` | Optional. Initial value or value to update to |

### Return Value

Returns a `UniformNode<T>` - a Three.js TSL uniform node.

| Property | Type     | Description                                   |
| -------- | -------- | --------------------------------------------- |
| `value`  | `T`      | Current uniform value (get/set)               |
| `uuid`   | `string` | Three.js UUID                                 |
| `name`   | `string` | Debug name (set automatically from parameter) |

### Supported Types

```typescript
type UniformValue = number | boolean | Vector2 | Vector3 | Vector4 | Color | Matrix3 | Matrix4
```

---

## Basic Usage

```tsx
import { useUniform } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal } from 'three/tsl'

function DisplacedSphere() {
  const uDisplacement = useUniform('uDisplacement', 0.5)

  useFrame((state) => {
    uDisplacement.value = Math.sin(state.elapsed) * 0.5
  })

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(uDisplacement))} />
    </mesh>
  )
}
```

---

## Behavior

### Create Mode (with value)

```tsx
const uTime = useUniform('uTime', 0)
```

- If uniform doesn't exist: Creates new uniform
- If uniform exists: Returns existing uniform AND updates its value

### Get Mode (without value)

```tsx
const uTime = useUniform('uTime')
```

- If uniform doesn't exist: Throws error
- If uniform exists: Returns existing uniform

### Shared Across Components

```tsx
// Component A creates it
function Creator() {
  const uGlobalTime = useUniform('uGlobalTime', 0)
  useFrame((state) => {
    uGlobalTime.value = state.elapsed
  })
  return null
}

// Component B uses it
function Consumer() {
  const uGlobalTime = useUniform('uGlobalTime')
  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={sin(uGlobalTime).mul(0.5).add(0.5)} />
    </mesh>
  )
}
```

---

## When to Use vs useUniforms

### Use `useUniform` when:

- You need ONE uniform
- Simple create/get/update semantics
- Quick prototyping

### Use `useUniforms` when:

- You need MULTIPLE uniforms
- Want scoping to avoid naming conflicts
- Need Leva integration with auto-conversion
- Building complex shaders

```tsx
// One uniform: useUniform
const uTime = useUniform('uTime', 0)

// Multiple uniforms: useUniforms
const { uTime, uColor, uScale } = useUniforms({
  uTime: 0,
  uColor: '#ff0000',
  uScale: 1.0,
})
```

---

## Best Practices

### Imperative Updates in useFrame

```tsx
// ✅ Good: GPU-only update
const uTime = useUniform('uTime', 0)
useFrame(({ elapsed }) => {
  uTime.value = elapsed
})

// ❌ Bad: Triggers React render every frame
const [time, setTime] = useState(0)
useFrame(({ elapsed }) => {
  setTime(elapsed)
})
const uTime = useUniform('uTime', time)
```

### Descriptive Names

```tsx
// ✅ Good
const uDisplacementAmount = useUniform('uDisplacementAmount', 0.5)

// ❌ Bad
const u1 = useUniform('u1', 0.5)
```

---

## TypeScript

Full type inference based on value:

```tsx
import * as THREE from 'three/webgpu'

const uNumber = useUniform('uNumber', 0) // UniformNode<number>
const uVec3 = useUniform('uVec3', new THREE.Vector3(1, 2, 3)) // UniformNode<THREE.Vector3>
const uColor = useUniform('uColor', new THREE.Color('#ff0000')) // UniformNode<THREE.Color>

// Manual type annotation if needed
const uValue = useUniform<number>('uValue', 0)
```

---

## Related

- **[useUniforms](./useUniforms.md)** - Batch uniform management with scoping
- **[Overview](./overview.md)** - Concepts and architecture
