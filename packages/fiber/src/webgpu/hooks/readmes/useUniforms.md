# useUniforms Hook

Batch uniform management with scoping and create-if-not-exists pattern. Optimized for performance with deep-comparison and automatic Three.js type conversion.

## API

```tsx
// Create/update uniforms at root level
const uniforms = useUniforms({ uTime: 0, uColor: '#ff0000' })

// Create/update uniforms in a scope
const uniforms = useUniforms({ uHealth: 100 }, 'player')

// Function syntax for reactive values
const uniforms = useUniforms(() => ({ uTime: time }))
const uniforms = useUniforms((state) => ({ uAspect: state.size.width / state.size.height }), 'viewport')

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

### UniformCreator Function

```typescript
type UniformCreator<T> = (state: RootState) => T
```

- Receives full RootState (camera, scene, uniforms, nodes, etc.)
- Returns object with uniform definitions
- Executes every render but deep-compares output for GPU updates

### Return Value

Returns `UniformRecord` - an object mapping uniform names to UniformNodes:

```typescript
{
  uTime: UniformNode<number>
  uColor: UniformNode<THREE.Color>
  // ... etc
}
```

---

## Basic Usage

### Object Syntax

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

### Function Syntax (for accessing RootState)

Function syntax is useful when you need to access RootState values:

```tsx
import { useUniforms } from '@react-three/fiber/webgpu'
import { cameraPosition } from 'three/tsl'

function Material() {
  // Function receives RootState - useful for viewport, size, custom data
  const { uAspect, uPixelRatio } = useUniforms((state) => ({
    uAspect: state.size.width / state.size.height,
    uPixelRatio: state.viewport.dpr,
  }))

  // These update when viewport changes

  return (
    <mesh>
      <sphereGeometry />
      {/* Note: For camera use TSL's cameraPosition, not state.camera */}
      <meshBasicNodeMaterial colorNode={length(cameraPosition).mul(uAspect)} />
    </mesh>
  )
}
```

**Note:** For Leva or local state, object syntax is simpler:

```tsx
// ✅ Simpler for Leva/state
const { intensity } = useControls({ intensity: 1.0 })
const { uIntensity } = useUniforms({ uIntensity: intensity })

// ⚠️ Function syntax works but no benefit here
const { uIntensity } = useUniforms(() => ({ uIntensity: intensity }))
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
  uVec4: new THREE.Vector4(1, 2, 3, 4),
  uColor: new THREE.Color(0xff0000),
  uMat3: new THREE.Matrix3(),
  uMat4: new THREE.Matrix4(),
})
```

### Plain Objects (Auto-Convert to Vectors)

```tsx
// Perfect for Leva controls!
const uniforms = useUniforms({
  uVec2: { x: 1, y: 2 }, // Becomes THREE.Vector2
  uVec3: { x: 1, y: 2, z: 3 }, // Becomes THREE.Vector3
  uVec4: { x: 1, y: 2, z: 3, w: 4 }, // Becomes THREE.Vector4
})
```

### Existing UniformNodes

```tsx
import { uniform, float } from 'three/tsl'

const uniforms = useUniforms({
  uCustom: uniform(float(5.0)), // Pass through as-is
})
```

---

## Reactive Values from Leva

Leva controls work with object syntax - component re-renders on change:

```tsx
import { useControls } from 'leva'
import { useUniforms } from '@react-three/fiber/webgpu'

function ControlledMaterial() {
  // Leva returns plain objects
  const { color, intensity, offset } = useControls({
    color: { x: 1, y: 0.5, z: 0 },
    intensity: { value: 1.0, min: 0, max: 2 },
    offset: { x: 0, y: 1, z: 0 },
  })

  // Direct object syntax works - Leva causes re-render on change
  // Plain objects auto-convert to THREE.Vector3
  const { uColor, uIntensity, uOffset } = useUniforms({
    uColor: color, // Converted to Vector3
    uIntensity: intensity,
    uOffset: offset, // Converted to Vector3
  })

  // Function syntax also works (same result)
  // const { uColor, uIntensity, uOffset } = useUniforms(() => ({
  //   uColor: color,
  //   uIntensity: intensity,
  //   uOffset: offset
  // }))

  // Use in material...
}
```

---

## Deep Comparison Optimization

`useUniforms` deep-compares output values to prevent unnecessary GPU updates:

```tsx
// Component re-renders on every parent update
function Material({ parentState }) {
  // Function runs every render
  const { uColor } = useUniforms(() => ({
    uColor: '#ff0000', // Always same value
  }))

  // GPU only updates when color actually changes!
  // No GPU update spam
}
```

This makes function syntax safe to use without `useCallback`:

```tsx
// ✅ Good: No useCallback needed
const { time } = useControls({ time: 0 })
const { uTime } = useUniforms(() => ({ uTime: time }))

// ❌ Don't need this:
const creator = useCallback(() => ({ uTime: time }), [time])
const { uTime } = useUniforms(creator)
```

---

## Examples

### Global Time System

```tsx
function GlobalTime() {
  const { uTime, uDelta } = useUniforms(
    {
      uTime: 0,
      uDelta: 0,
    },
    'global',
  )

  useFrame(({ elapsed }, delta) => {
    uTime.value = elapsed
    uDelta.value = delta
  })

  return null
}

// Use global time anywhere - Method 1: Get from hook
function AnimatedMesh() {
  const { uTime } = useUniforms('global')

  return (
    <mesh>
      <sphereGeometry />
      <meshBasicNodeMaterial colorNode={sin(uTime).mul(0.5).add(0.5)} />
    </mesh>
  )
}

// Method 2: Access from state in useFrame
function AnotherMesh() {
  useFrame(({ uniforms }) => {
    // Access scoped uniforms from state
    const globalTime = uniforms.global.uTime.value
    // Use for logic...
  })

  return <mesh>...</mesh>
}
```

### Material Properties

```tsx
import * as THREE from 'three/webgpu'
import { useUniforms } from '@react-three/fiber/webgpu'
import { mix, color } from 'three/tsl'

function CustomMaterial() {
  const { uColor1, uColor2, uMix, uRoughness } = useUniforms({
    uColor1: new THREE.Color('#ff0000'),
    uColor2: new THREE.Color('#0000ff'),
    uMix: 0.5,
    uRoughness: 0.5,
  })

  const finalColor = mix(uColor1, uColor2, uMix)

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial colorNode={finalColor} roughness={uRoughness.value} />
    </mesh>
  )
}
```

### Particle System

```tsx
function ParticleSystem() {
  const { uTime, uSpeed, uSpread, uColor } = useUniforms(
    {
      uTime: 0,
      uSpeed: 1.0,
      uSpread: 2.0,
      uColor: '#ffaa00',
    },
    'particles',
  )

  useFrame((state, delta) => {
    uTime.value += delta * uSpeed.value
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={1000} array={new Float32Array(3000)} itemSize={3} />
      </bufferGeometry>
      <pointsNodeMaterial colorNode={uColor} size={0.1} />
    </points>
  )
}
```

### Viewport-Reactive Shader

```tsx
import { cameraPosition } from 'three/tsl'

function ViewportReactiveShader() {
  // Access viewport/size from RootState
  const { uViewportHeight, uAspect } = useUniforms((state) => ({
    uViewportHeight: state.viewport.height,
    uAspect: state.size.width / state.size.height,
  }))

  // Uniforms update when viewport resizes

  return (
    <mesh>
      <sphereGeometry />
      {/* Use TSL's cameraPosition for camera data */}
      <meshBasicNodeMaterial colorNode={length(cameraPosition).mul(uAspect).div(uViewportHeight)} />
    </mesh>
  )
}
```

---

## API Modes

### Create/Update Mode (Object)

```tsx
const { uTime } = useUniforms({ uTime: 0 })
// First call: creates uniform
// Subsequent calls: reuses uniform, updates value if different
```

### Create/Update Mode (Function)

```tsx
const { uTime } = useUniforms(() => ({ uTime: time }))
// Function executes every render
// Deep-compares output
// GPU only updates when values actually change
```

### Read Mode (All)

```tsx
const allUniforms = useUniforms()
// Returns: { uTime, uColor, player: { uHealth }, enemy: { uHealth }, ... }
```

### Read Mode (Scope)

```tsx
const playerUniforms = useUniforms('player')
// Returns: { uHealth, uMana, uSpeed }
```

---

## Utility Functions

### removeUniforms

Remove uniforms by name:

```tsx
import { removeUniforms } from '@react-three/fiber/webgpu'

const store = useStore()

// Remove from root
removeUniforms(store.setState, ['uTime', 'uColor'])

// Remove from scope
removeUniforms(store.setState, ['uHealth'], 'player')
```

### clearScope

Remove entire scope:

```tsx
import { clearScope } from '@react-three/fiber/webgpu'

const store = useStore()
clearScope(store.setState, 'player')
```

### clearRootUniforms

Clear all root-level uniforms (keeps scopes):

```tsx
import { clearRootUniforms } from '@react-three/fiber/webgpu'

const store = useStore()
clearRootUniforms(store.setState)
```

---

## Performance

### Deep Comparison

Function syntax uses deep-comparison to detect actual value changes:

```tsx
// Efficient: Only updates GPU when color string changes
const { color } = useControls({ color: '#ff0000' })
const { uColor } = useUniforms(() => ({ uColor: color }))
```

Without deep-comparison, this would update GPU every render even when `color === '#ff0000'`.

### Vectorization

Plain objects are automatically converted to Three.js types only once:

```tsx
const { uVec } = useUniforms({
  uVec: { x: 1, y: 2, z: 3 }, // Converted to Vector3 once
})
```

### Equality Checking

Three.js types use native `.equals()` methods for efficient comparison:

```tsx
const { uColor } = useUniforms(() => ({
  uColor: new THREE.Color(r, g, b),
}))
// Uses THREE.Color.equals() for comparison
// Only updates GPU if colors actually differ
```

---

## Best Practices

### 1. Use Scopes for Features

Organize uniforms by feature or component:

```tsx
// ✅ Good: Scoped by feature
const playerUniforms = useUniforms({ uHealth: 100, uMana: 50 }, 'player')
const enemyUniforms = useUniforms({ uHealth: 75 }, 'enemy')

// ❌ Bad: All root-level with name prefixes
const uniforms = useUniforms({
  playerHealth: 100,
  playerMana: 50,
  enemyHealth: 75,
})
```

### 2. Object Syntax for Leva/State

Leva controls cause re-renders, so object syntax works fine:

```tsx
// ✅ Good: Object syntax (Leva re-renders component)
const { intensity } = useControls({ intensity: 1.0 })
const { uIntensity } = useUniforms({ uIntensity: intensity })

// ✅ Function syntax for viewport/size from RootState
const { uAspect } = useUniforms((state) => ({
  uAspect: state.size.width / state.size.height,
}))
```

### 3. Plain Objects for Leva

Leva returns plain objects - perfect for auto-conversion:

```tsx
// ✅ Good: Direct object syntax (Leva re-renders on change)
const { color } = useControls({ color: { x: 1, y: 0, z: 0 } })
const { uColor } = useUniforms({ uColor: color }) // Auto-converts to Vector3

// ❌ Bad: Manual conversion
const { color } = useControls({ color: { x: 1, y: 0, z: 0 } })
const [vec] = useState(() => new THREE.Vector3())
useEffect(() => {
  vec.set(color.x, color.y, color.z)
}, [color, vec])
const { uColor } = useUniforms({ uColor: vec })
```

### 4. Imperative Updates in useFrame

Update uniform values imperatively:

```tsx
// ✅ Good: Imperative update
const { uTime } = useUniforms({ uTime: 0 })
useFrame(({ elapsed }) => {
  uTime.value = elapsed
})

// ❌ Bad: Causes deep-comparison overhead
useFrame(({ elapsed }) => {
  useUniforms(() => ({ uTime: elapsed }))
})
```

---

## TypeScript

Full type inference:

```tsx
import * as THREE from 'three/webgpu'

const uniforms = useUniforms({
  uNumber: 0, // UniformNode<number>
  uBool: true, // UniformNode<boolean>
  uColor: '#ff0000', // UniformNode<THREE.Color>
  uVec2: { x: 1, y: 2 }, // UniformNode<THREE.Vector2>
  uVec3: new THREE.Vector3(1, 2, 3), // UniformNode<THREE.Vector3>
  uMat4: new THREE.Matrix4(), // UniformNode<THREE.Matrix4>
})

// Access with proper types
uniforms.uNumber.value = 5.0 // number
uniforms.uColor.value = new THREE.Color() // THREE.Color
```

---

## Related Documentation

- **[useUniform](./useUniform.md)** - Single uniform management
- **[useNodes](./useNodes.md)** - Global TSL node management
- **[useLocalNodes](./useLocalNodes.md)** - Component-local nodes
- **[Overview](./overview.md)** - WebGPU hooks architecture and patterns
