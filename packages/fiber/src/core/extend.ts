import type * as React from 'react'
import type { ThreeElement } from '../../types/three'
import type { Catalogue, ConstructorRepresentation } from '#types'

//* Explicit element registrations ==============================
// `extend()` is for constructors three does not ship: a user's own class, a drei component, a
// three addon. The registry is one global, shared through Symbol.for() so a registration made
// through one copy of fiber is seen by every other (an app on `@react-three/fiber` next to a
// library on `/legacy`). It is consulted first when an element name is resolved; what is not
// registered here is looked up in the three namespace of the root's own renderer (see catalogue.ts).
const R3F_CATALOGUE = Symbol.for('@react-three/fiber.catalogue')
export const catalogue: Catalogue = (globalThis as any)[R3F_CATALOGUE] ?? ((globalThis as any)[R3F_CATALOGUE] = {})

// `extend(SomeClass)` returns a generated element id. The counter behind it has to be shared exactly
// as widely as the catalogue: two copies of fiber each starting at 0 both write `catalogue['0']`, and
// the second registration silently replaces the first.
const R3F_EXTEND_ID = Symbol.for('@react-three/fiber.extendId')
const ids = globalThis as any as { [R3F_EXTEND_ID]?: number }

export const toPascalCase = (type: string): string => `${type[0].toUpperCase()}${type.slice(1)}`

export const isConstructor = (object: unknown): object is ConstructorRepresentation => typeof object === 'function'

export function extend<T extends ConstructorRepresentation>(objects: T): React.ExoticComponent<ThreeElement<T>>
export function extend<T extends Catalogue>(objects: T): void
// A whole module namespace (`extend(THREE)`) carries functions and constants alongside the
// classes, so it is not a `Catalogue`. Accept it as-is: only constructors are registered.
export function extend(objects: Record<string, unknown>): void
export function extend(
  objects: Record<string, unknown> | ConstructorRepresentation,
): React.ExoticComponent<ThreeElement<any>> | void {
  if (isConstructor(objects)) {
    const id = ids[R3F_EXTEND_ID] ?? 0
    ids[R3F_EXTEND_ID] = id + 1
    const Component = `${id}`
    catalogue[Component] = objects
    return Component as any
  } else {
    for (const name in objects) {
      const object = objects[name]
      if (isConstructor(object)) catalogue[name] = object
    }
  }
}
