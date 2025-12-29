# useUniform Hook

Simple single-uniform hook with create/get/update semantics.

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

Returns a `UniformNode<T>` - a Three.js TSL uniform node that can be used in shader code.

**UniformNode Properties:**

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

### Create and Use

```tsx
import { useUniform } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal } from 'three/tsl'

function DisplacedSphere() {
  // Create uniform with initial value
  const uDisplacement = useUniform('uDisplacement', 0.5)

  // Update every frame
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

### Get Existing Uniform

```tsx
function Consumer() {
  // Get uniform created elsewhere (throws if not found)
  const uDisplacement = useUniform('uDisplacement')

  // Can update it
  useFrame(() => {
    uDisplacement.value += 0.01
  })
}
```

---

## Examples

### Animated Displacement

```tsx
import { useUniform } from '@react-three/fiber/webgpu'
import { positionLocal, normalLocal, sin, time } from 'three/tsl'

function WavingSphere() {
  const uAmplitude = useUniform('uAmplitude', 0.3)
  const uFrequency = useUniform('uFrequency', 2.0)

  // Use directly in TSL expressions
  const displacement = sin(positionLocal.y.mul(uFrequency).add(time)).mul(uAmplitude)

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(displacement))} />
    </mesh>
  )
}
```

### Color Transition

```tsx
import * as THREE from 'three/webgpu'
import { useUniform } from '@react-three/fiber/webgpu'
import { color, mix } from 'three/tsl'

function ColorTransition() {
  const uProgress = useUniform('uProgress', 0)
  const uColorA = useUniform('uColorA', new THREE.Color('#ff0000'))
  const uColorB = useUniform('uColorB', new THREE.Color('#0000ff'))

  useFrame((state, delta) => {
    // Ping-pong between 0 and 1
    const progress = (Math.sin(state.elapsed) + 1) * 0.5
    uProgress.value = progress
  })

  // Mix colors in TSL
  const finalColor = mix(uColorA, uColorB, uProgress)

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={finalColor} />
    </mesh>
  )
}
```

### Matrix Transform

```tsx
import * as THREE from 'three/webgpu'
import { useUniform } from '@react-three/fiber/webgpu'
import { positionLocal } from 'three/tsl'

function TransformedMesh() {
  const uTransform = useUniform('uTransform', new THREE.Matrix4())

  useFrame((state) => {
    // Update matrix
    uTransform.value.makeRotationY(state.elapsed)
  })

  return (
    <mesh>
      <boxGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.mul(uTransform)} />
    </mesh>
  )
}
```

### Shared Between Components

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
function ConsumerA() {
  const uGlobalTime = useUniform('uGlobalTime')

  return (
    <mesh position={[-2, 0, 0]}>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={sin(uGlobalTime).mul(0.5).add(0.5)} />
    </mesh>
  )
}

// Component C also uses it
function ConsumerB() {
  const uGlobalTime = useUniform('uGlobalTime')

  return (
    <mesh position={[2, 0, 0]}>
      <boxGeometry />
      <meshBasicNodeMaterial colorNode={cos(uGlobalTime).mul(0.5).add(0.5)} />
    </mesh>
  )
}
```

---

## Behavior

### Create Mode

When called with a `value` parameter:

```tsx
const uTime = useUniform('uTime', 0)
```

- If uniform doesn't exist: Creates new uniform
- If uniform exists: Returns existing uniform AND updates its value

This means you can safely call with a value to ensure it's set:

```tsx
// First render: creates with value 0
const uTime = useUniform('uTime', 0)

// Later render: gets existing and updates to 5
const uTime = useUniform('uTime', 5)
```

### Get Mode

When called without a `value` parameter:

```tsx
const uTime = useUniform('uTime')
```

- If uniform doesn't exist: Throws error
- If uniform exists: Returns existing uniform

Use this when you know the uniform should already exist (created elsewhere).

### Update Pattern

Updates happen imperatively via `.value`:

```tsx
const uTime = useUniform('uTime', 0)

// GPU-only update - no React re-render
useFrame((state) => {
  uTime.value = state.clock.elapsedTime
})
```

---

## When to Use vs useUniforms

### Use `useUniform` when:

- You need ONE uniform
- Simple create/get/update semantics
- Quick prototyping or examples

```tsx
const uTime = useUniform('uTime', 0)
```

### Use `useUniforms` when:

- You need MULTIPLE uniforms
- Want scoping to avoid naming conflicts
- Need reactive values from Leva or state
- Want plain object auto-conversion
- Building complex shaders

```tsx
const { uTime, uColor, uScale } = useUniforms(
  {
    uTime: 0,
    uColor: '#ff0000',
    uScale: 1.0,
  },
  'myFeature',
)
```

---

## Best Practices

### 1. Descriptive Names

Use clear, descriptive names for your uniforms:

```tsx
// ✅ Good
const uDisplacementAmount = useUniform('uDisplacementAmount', 0.5)
const uRippleSpeed = useUniform('uRippleSpeed', 2.0)

// ❌ Bad
const u1 = useUniform('u1', 0.5)
const u2 = useUniform('u2', 2.0)
```

### 2. Imperative Updates in useFrame

Always update uniform values in `useFrame` for GPU-only updates:

```tsx
// ✅ Good: GPU-only update with destructuring
const uTime = useUniform('uTime', 0)
useFrame(({ elapsed }) => {
  uTime.value = elapsed
})

// ✅ Also good: Access from state.uniforms
useFrame(({ elapsed, uniforms }) => {
  uniforms.uTime.value = elapsed
})

// ❌ Bad: Triggers React render every frame
const [time, setTime] = useState(0)
useFrame(({ elapsed }) => {
  setTime(elapsed)
})
const uTime = useUniform('uTime', time)
```

### 3. Initialize Once, Update Many

Create the uniform once (usually at component mount), then update its value:

```tsx
// ✅ Good: Create once, update imperatively
const uValue = useUniform('uValue', 0)
useFrame((state) => {
  uValue.value = state.elapsed // Update value
})
```

### 4. Prefer useUniforms for Multiple

If you need more than 2-3 uniforms, switch to `useUniforms`:

```tsx
// ❌ Verbose
const uTime = useUniform('uTime', 0)
const uColor = useUniform('uColor', new THREE.Color())
const uScale = useUniform('uScale', 1.0)
const uOffset = useUniform('uOffset', new THREE.Vector3())

// ✅ Better
const { uTime, uColor, uScale, uOffset } = useUniforms({
  uTime: 0,
  uColor: new THREE.Color(),
  uScale: 1.0,
  uOffset: new THREE.Vector3(),
})
```

---

## Error Handling

### Uniform Not Found

```tsx
// Throws if uniform doesn't exist
const uTime = useUniform('uTime') // Error: Uniform "uTime" not found

// Create it first
const uTime = useUniform('uTime', 0) // OK
```

---

## TypeScript

Full type inference based on value:

```tsx
import * as THREE from 'three/webgpu'

const uNumber = useUniform('uNumber', 0) // UniformNode<number>
const uBool = useUniform('uBool', true) // UniformNode<boolean>
const uVec3 = useUniform(
  'uVec3', // UniformNode<THREE.Vector3>
  new THREE.Vector3(1, 2, 3),
)
const uColor = useUniform(
  'uColor', // UniformNode<THREE.Color>
  new THREE.Color('#ff0000'),
)

// Manual type annotation if needed
const uValue = useUniform<number>('uValue', 0)
```

---

## Related Documentation

- **[useUniforms](./useUniforms.md)** - Batch uniform management with scoping
- **[useNodes](./useNodes.md)** - Global TSL node management
- **[Overview](./overview.md)** - WebGPU hooks architecture and patterns
