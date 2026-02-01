# useBuffers & useGPUStorage Hooks

Global storage management for GPU compute operations. These hooks follow the same pattern as `useNodes` and `useUniforms`.

> For concepts like build-time vs run-time and TSL built-ins, see the [Overview](./overview.md).

---

## useBuffers

Manages buffer data: CPU arrays, GPU buffer attributes, and TSL buffer nodes.

### API

```tsx
// Create/get buffers at root level
const buffers = useBuffers(() => ({
  positions: instancedArray(count, 'vec3'),
  velocities: new Float32Array(count * 3),
}))

// Create/get buffers in a scope
const buffers = useBuffers(
  () => ({
    particlePos: new StorageBufferAttribute(count, 4),
  }),
  'particles',
)

// Read all buffers
const allBuffers = useBuffers()

// Read buffers from a scope
const particleBuffers = useBuffers('particles')
```

### Parameters

| Parameter | Type                      | Description                                  |
| --------- | ------------------------- | -------------------------------------------- |
| `creator` | `BufferCreator \| string` | Function that returns buffers, or scope name |
| `scope`   | `string`                  | Optional scope name for organization         |

### Return Value

Returns `BuffersWithUtils<BufferRecord>` - object mapping names to buffers, plus utility functions.

### What Can Be Stored

```tsx
useBuffers(() => ({
  // TypedArrays (CPU-side data)
  cpuData: new Float32Array(count * 3),
  indices: new Uint32Array(count),

  // Three.js Buffer Attributes
  storageAttr: new StorageBufferAttribute(count, 4),
  instancedAttr: new StorageInstancedBufferAttribute(count, 4),
  indirectAttr: new IndirectStorageBufferAttribute(data, 1),

  // TSL Buffer Nodes
  positions: instancedArray(count, 'vec3'),
  velocities: instancedArray(Float32Array, structNode),
  custom: storage(bufferAttribute, 'vec4', count),
}))
```

---

## useGPUStorage

Manages GPU storage textures for compute operations.

### API

```tsx
// Create/get storage at root level
const storage = useGPUStorage(() => ({
  heightMap: new StorageTexture(512, 512),
}))

// Create/get storage in a scope
const storage = useGPUStorage(
  () => ({
    normalMap: new StorageTexture(1024, 1024),
  }),
  'terrain',
)

// Read all storage
const allStorage = useGPUStorage()

// Read storage from a scope
const terrainStorage = useGPUStorage('terrain')
```

### Parameters

| Parameter | Type                       | Description                                  |
| --------- | -------------------------- | -------------------------------------------- |
| `creator` | `StorageCreator \| string` | Function that returns storage, or scope name |
| `scope`   | `string`                   | Optional scope name for organization         |

### Return Value

Returns `StorageWithUtils<StorageRecord>` - object mapping names to storage objects, plus utility functions.

### What Can Be Stored

```tsx
useGPUStorage(() => ({
  // Three.js Storage Textures
  heightMap: new StorageTexture(512, 512),
  voxelData: new Storage3DTexture(64, 64, 64),

  // TSL Storage Texture Nodes
  storageNode: storageTexture(texture, uvNode, storeNode),
}))
```

---

## Accessing in Node Creators

Both hooks expose their data to `useNodes` and `useLocalNodes` via the creator state:

```tsx
// Create buffers and storage
const { positions } = useBuffers(
  () => ({
    positions: instancedArray(count, 'vec3'),
  }),
  'particles',
)

const { heightMap } = useGPUStorage(
  () => ({
    heightMap: new StorageTexture(512, 512),
  }),
  'terrain',
)

// Access in node creators
const { positionNode, heightNode } = useNodes(({ buffers, gpuStorage }) => ({
  // Access scoped buffers
  positionNode: buffers.scope('particles').positions.element(instanceIndex),
  // Access scoped storage
  heightNode: texture(gpuStorage.scope('terrain').heightMap),
}))
```

Or with `useLocalNodes`:

```tsx
const { computeNode } = useLocalNodes(({ buffers, gpuStorage, uniforms }) => ({
  computeNode: Fn(() => {
    const pos = buffers.particles.positions.element(instanceIndex)
    const height = texture(gpuStorage.terrain.heightMap, uv())
    return pos.add(vec3(0, height, 0))
  })(),
}))
```

---

## Utility Functions

Both hooks return utility functions alongside your data:

### useBuffers Utils

```tsx
const { positions, removeBuffers, clearBuffers, rebuildBuffers, disposeBuffers } = useBuffers(() => ({
  positions: instancedArray(count, 'vec3'),
}))

// Remove specific buffers
removeBuffers('positions') // From root
removeBuffers(['pos', 'vel'], 'particles') // From scope

// Clear buffers
clearBuffers('particles') // Clear specific scope
clearBuffers('root') // Clear root only (preserve scopes)
clearBuffers() // Clear everything

// Rebuild (clears + triggers re-creation via HMR version bump)
rebuildBuffers() // Rebuild all
rebuildBuffers('particles') // Rebuild specific scope

// Dispose (releases GPU resources + removes from store)
disposeBuffers('positions') // Single buffer
disposeBuffers(['pos', 'vel'], 'particles') // Multiple from scope
```

### useGPUStorage Utils

```tsx
const { heightMap, removeStorage, clearStorage, rebuildStorage, disposeStorage } = useGPUStorage(() => ({
  heightMap: new StorageTexture(512, 512),
}))

// Same pattern as useBuffers
removeStorage('heightMap')
clearStorage('terrain')
rebuildStorage()
disposeStorage('heightMap') // Releases GPU texture memory
```

---

## Complete Example: Particle System

```tsx
import { useBuffers, useGPUStorage, useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { instancedArray, storage, Fn, vec3, float, instanceIndex } from 'three/tsl'
import { StorageTexture } from 'three/webgpu'

const PARTICLE_COUNT = 10000

function ParticleSystem() {
  // 1. Create buffer storage for particle data
  const { positions, velocities } = useBuffers(
    () => ({
      positions: instancedArray(PARTICLE_COUNT, 'vec3'),
      velocities: instancedArray(PARTICLE_COUNT, 'vec3'),
    }),
    'particles',
  )

  // 2. Create texture storage for force field
  const { forceField } = useGPUStorage(
    () => ({
      forceField: new StorageTexture(256, 256),
    }),
    'particles',
  )

  // 3. Create compute shader nodes
  const { updateParticles } = useNodes(
    ({ buffers, gpuStorage }) => ({
      updateParticles: Fn(() => {
        const pos = buffers.scope('particles').positions.element(instanceIndex)
        const vel = buffers.scope('particles').velocities.element(instanceIndex)

        // Sample force from texture
        const uv = pos.xz.div(100).add(0.5)
        const force = texture(gpuStorage.scope('particles').forceField, uv).xyz

        // Update velocity and position
        vel.addAssign(force.mul(0.01))
        pos.addAssign(vel)
      })(),
    }),
    'compute',
  )

  // 4. Use in material
  const { positionNode } = useLocalNodes(({ buffers }) => ({
    positionNode: buffers.particles.positions.element(instanceIndex),
  }))

  return (
    <instancedMesh args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshBasicNodeMaterial positionNode={positionNode} />
    </instancedMesh>
  )
}
```

---

## Best Practices

### Use Scopes for Systems

```tsx
// Particle system buffers
useBuffers(
  () => ({
    positions: instancedArray(count, 'vec3'),
    velocities: instancedArray(count, 'vec3'),
  }),
  'particles',
)

// Terrain system storage
useGPUStorage(
  () => ({
    heightMap: new StorageTexture(1024, 1024),
    normalMap: new StorageTexture(1024, 1024),
  }),
  'terrain',
)
```

### Dispose When Done

```tsx
function TemporaryEffect() {
  const { disposeBuffers } = useBuffers(
    () => ({
      tempData: instancedArray(1000, 'vec4'),
    }),
    'temp',
  )

  useEffect(() => {
    return () => disposeBuffers('tempData', 'temp')
  }, [disposeBuffers])

  return <EffectMesh />
}
```

### Access via Scope Method for Safety

```tsx
// Safe - returns empty wrapper if scope doesn't exist
const { node } = useLocalNodes(({ buffers }) => ({
  node: buffers.scope('maybeExists').data,
}))

// Direct access works when you know the scope exists
const { node } = useLocalNodes(({ buffers }) => ({
  node: buffers.particles.positions,
}))
```

---

## Related

- **[useNodes](./useNodes.md)** - Global TSL node management
- **[useLocalNodes](./useLocalNodes.md)** - Component-local node creation
- **[useUniforms](./useUniforms.md)** - Global uniform management
- **[Overview](./overview.md)** - Concepts and architecture
