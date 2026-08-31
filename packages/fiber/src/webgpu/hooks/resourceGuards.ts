import type { BufferLike, StorageLike } from '#types'

//* Resource Leaf Guards ==============================

/** Distinguishes a resource leaf from a nested resource scope. */
export type ResourceLeafGuard<T> = (value: unknown) => value is T

/** Three's `Fn()` returns a callable node, so node guards must accept functions. */
const isObjectLike = (value: unknown): value is object | ((...args: never[]) => unknown) =>
  value !== null && (typeof value === 'object' || typeof value === 'function')

const hasValidLegacyNodeMarkers = (value: object | ((...args: never[]) => unknown)): boolean => {
  const hasUuid = 'uuid' in value
  const hasNodeType = 'nodeType' in value
  const uuid = Reflect.get(value, 'uuid')
  const nodeType = Reflect.get(value, 'nodeType')

  return (
    (hasUuid || hasNodeType) &&
    (!hasUuid || uuid === undefined || typeof uuid === 'string') &&
    (!hasNodeType || nodeType === undefined || nodeType === null || typeof nodeType === 'string')
  )
}

export const isUniformNode: ResourceLeafGuard<UniformNode> = (value): value is UniformNode =>
  isObjectLike(value) && 'isUniformNode' in value && value.isUniformNode === true

export const isTSLNode: ResourceLeafGuard<TSLNodeType | LegacyTSLNodeLike> = (
  value,
): value is TSLNodeType | LegacyTSLNodeLike =>
  isObjectLike(value) &&
  (Reflect.get(value, 'isNode') === true ||
    (Reflect.get(value, 'shaderNode') !== undefined && typeof Reflect.get(value, 'id') === 'number') ||
    hasValidLegacyNodeMarkers(value))

export const isBufferLike: ResourceLeafGuard<BufferLike> = (value): value is BufferLike =>
  (ArrayBuffer.isView(value) && !(value instanceof DataView)) ||
  (isObjectLike(value) && ('isBufferAttribute' in value || 'isInterleavedBufferAttribute' in value || isTSLNode(value)))

export const isStorageLike: ResourceLeafGuard<StorageLike> = (value): value is StorageLike =>
  isObjectLike(value) && ('isTexture' in value || 'isData3DTexture' in value || isTSLNode(value))
