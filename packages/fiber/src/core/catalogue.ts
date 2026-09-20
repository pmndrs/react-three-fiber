import type { ConstructorRepresentation, RootStore } from '#types'
import { catalogue } from './extend'

// Explicit extend() registrations are shared across bundles and take precedence over the root's namespace.
export const isConstructor = (object: unknown): object is ConstructorRepresentation => typeof object === 'function'

/** Resolve an explicit registration or a constructor from the root entry. */
export function resolveConstructor(name: string, root: RootStore): ConstructorRepresentation | undefined {
  if (Object.prototype.hasOwnProperty.call(catalogue, name)) return catalogue[name]
  const object = root.getState().internal.namespace?.[name]
  return isConstructor(object) ? object : undefined
}
