import { uniform } from 'three/tsl'
import { vectorize, scopedNodeName } from './utils'

/**
 * Creates a TSL uniform node from various input types
 * - Already a UniformNode: returns as-is
 * - TSL nodes (color(), vec3(), float()): passed to uniform() for type casting
 * - Plain objects: converted to vectors via vectorize()
 * - String colors: converted to Color via vectorize()
 * - Raw values: wrapped in uniform()
 */
export function createUniform(inName: string, node: any, scope?: string): UniformNode {
  // Already a UniformNode - return as-is
  if (node.type === 'UniformNode') return node

  // vectorize handles:
  // - TSL nodes: passed through unchanged
  // - Plain objects {x,y,z}: converted to Vector3
  // - String colors: converted to THREE.Color
  // - Other values: passed through unchanged
  const inValue = vectorize(node)
  // See useUniform.tsx: three's uniform() accepts any value at runtime, but its declared
  // overloads are a closed set that R3F's wider (already-normalised) input can't select from.
  const newUniform = (uniform as (value: unknown, type?: string) => UniformNode)(inValue)

  // Set debug name for easier identification in GPU tools.
  // Shares scopedNodeName with the other resource hooks so the separator cannot drift again.
  if (typeof newUniform.setName === 'function') {
    newUniform.setName(scopedNodeName(scope, inName))
  }

  return newUniform
}
