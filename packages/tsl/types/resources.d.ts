import type * as THREE from 'three/webgpu'
import type { Node, StorageTexture, Storage3DTexture, StorageArrayTexture, Data3DTexture } from 'three/webgpu'

//* Buffer Types (useBuffers) ========================================

/**
 * Buffer-like types for GPU compute and storage operations.
 * Includes raw CPU arrays, Three.js buffer attributes, and TSL buffer nodes.
 *
 * @example
 * ```tsx
 * const { positions, velocities } = useBuffers(() => ({
 *   positions: instancedArray(count, 'vec3'),       // StorageBufferNode
 *   velocities: new Float32Array(count * 3),        // TypedArray
 * }), 'particles')
 * ```
 */
export type BufferLike =
  | Float32Array
  | Uint32Array
  | Int32Array
  | Float64Array
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | THREE.BufferAttribute // Base class for all buffer attributes
  | THREE.InterleavedBufferAttribute
  | Node // TSL buffer nodes (instancedArray, storage)

/** Flat record of buffer-like values (no nested scopes) */
export type BufferRecord = Record<string, BufferLike>

/**
 * Buffer store that can contain both root-level buffers and scoped buffer objects.
 * Structure: { positions: Float32Array, particles: { vel: StorageBufferNode } }
 */
export type BufferStore = Record<string, BufferLike | BufferRecord>

//* Node Types (useNodes) ========================================

/**
 * Every node representation `useNodes` accepts and `state.nodes` holds: three's real `Node`,
 * the callable proxy `Fn()` returns, and the legacy structural shape (`uuid`/`nodeType`) older
 * code passes through. Creators are constrained to this same type, so the shape a creator returns
 * and the shape the store holds are one type by construction.
 */
export type NodeLike = TSLNodeType | LegacyTSLNodeLike

/** Flat record of TSL nodes (no nested scopes) */
export type NodeRecord<T extends NodeLike = NodeLike> = Record<string, T>

/**
 * Node store that can contain both root-level nodes and scoped node objects.
 * Structure: { wobble: OperatorNode, fx: { blur: ShaderCallable } }
 */
export type NodeStore = Record<string, NodeLike | NodeRecord>

//* Storage Types (useGPUStorage) ========================================

/**
 * GPU storage types for texture-based storage operations.
 * Includes Three.js storage textures and TSL storage texture nodes.
 *
 * @example
 * ```tsx
 * const { heightMap } = useGPUStorage(() => ({
 *   heightMap: new StorageTexture(512, 512),
 * }), 'terrain')
 * ```
 */
export type StorageLike =
  | StorageTexture // 2D GPU storage texture
  | Storage3DTexture // 3D GPU storage texture (volumes, fluid grids)
  | StorageArrayTexture // 2D-array GPU storage texture
  | Data3DTexture // 3D texture (can be used as storage)
  | Node // TSL storage texture nodes (storageTexture)

/** Flat record of storage-like values (no nested scopes) */
export type StorageRecord = Record<string, StorageLike>

/**
 * Storage store that can contain both root-level storage and scoped storage objects.
 * Structure: { heightMap: StorageTexture, terrain: { normal: StorageTextureNode } }
 */
export type StorageStore = Record<string, StorageLike | StorageRecord>
