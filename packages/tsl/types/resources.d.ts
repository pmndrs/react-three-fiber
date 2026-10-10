import type * as THREE from 'three/webgpu'
import type { Node, StorageTexture, Storage3DTexture, StorageArrayTexture, Data3DTexture } from 'three/webgpu'
import type { Fn } from 'three/tsl'

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

/** What `Fn()` returns (its members are what matters here, not its signature). */
type FnNodeLike = ReturnType<typeof Fn>

/**
 * What an unregistered node read is: `useNodes().wobble`, `useNodes('fx').blur`, a creator's
 * `nodes.wobble`, `state.nodes.wobble` in `useFrame`.
 *
 * Why it is loose: the read goes through a string name, and TypeScript cannot know what the entry
 * under that name holds: a float, a vec3, a texture sample, or an `Fn()` to call. three's types
 * only give operator methods to a node whose node type is known, and only an `Fn()` can be called,
 * so the broad `NodeLike` allowed neither and every read needed a cast.
 *
 * So this has every member that any of three's nodes or an `Fn()` has, each typed `any`, and can
 * be called. `nodes.wobble.mul(2)`, `material.colorNode = nodes.wobble` and `nodes.rimLightFn()`
 * compile, and a misspelt member is still an error. It is a deliberate simplification: results of
 * its own methods and calls are `any`.
 *
 * A single `as` gives it an exact type: `nodes.wobble as Node<'vec3'>`, `nodes.fn as typeof fn`.
 * For exact types without casts, register the nodes (`nodes` / `nodeScopes` in `Register`) or pass
 * a schema to the reader: `useNodes<{ blur: Node<'vec4'> }>('fx')`, `nodes.scope<Schema>('fx')`.
 */
export interface LooseNode extends TSLLooseMembers<Node<TSLNodeTypeName> | FnNodeLike> {
  (...args: any[]): any
}

/**
 * A root entry of an unregistered node map: a node (its members) or a scope of nodes (any other
 * name), since the type cannot tell which a name holds.
 */
export type LooseNodeEntry = LooseNode & { readonly [name: string]: LooseNode }

/** An unregistered node map read: `state.nodes`, `useNodes()`. */
export type LooseNodeStore = Record<string, LooseNodeEntry>

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
