import type * as React from 'react'
import type { ThreeElement } from '../../types/three'
import type { Catalogue, ConstructorRepresentation, RootStore } from '#types'

//* Explicit element registrations ==============================
// `extend()` is for constructors three does not ship: a user's own class, a drei component, a
// three addon. The registry is one global, shared through Symbol.for() so a registration made
// through one copy of fiber is seen by every other (an app on `@react-three/fiber` next to a
// library on `/legacy`). It is consulted first when an element name is resolved; what is not
// registered here is looked up in the three namespace of the root's own renderer (see resolveConstructor below).
const R3F_CATALOGUE = Symbol.for('@react-three/fiber.catalogue')
const catalogue: Catalogue = (globalThis as any)[R3F_CATALOGUE] ?? ((globalThis as any)[R3F_CATALOGUE] = {})

// `extend(SomeClass)` returns a generated element id. The counter behind it has to be shared exactly
// as widely as the catalogue: two copies of fiber each starting at 0 both write `catalogue['0']`, and
// the second registration silently replaces the first.
const R3F_EXTEND_ID = Symbol.for('@react-three/fiber.extendId')
const ids = globalThis as any as { [R3F_EXTEND_ID]?: number }

export const toPascalCase = (type: string): string => `${type[0].toUpperCase()}${type.slice(1)}`

const isConstructor = (object: unknown): object is ConstructorRepresentation => typeof object === 'function'

/**
 * Registers constructors so they can be rendered as JSX elements.
 *
 * - `extend({ OrbitControls })` makes each constructor available under its camelCased key
 *   (`<orbitControls />`). Values that are not constructors are skipped, so a whole module
 *   namespace can be passed.
 * - `extend(MyClass)` registers one constructor and returns a component to render it with.
 *
 * Registrations are global, shared by every copy and entry of fiber, and are checked before the
 * three namespace of a root's renderer when an element name is resolved.
 *
 * @example
 * import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
 * extend({ OrbitControls })
 * // <orbitControls args={[camera, gl.domElement]} />
 *
 * @example
 * const Controls = extend(OrbitControls)
 * // <Controls args={[camera, gl.domElement]} />
 *
 * @see https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively
 */
export function extend<T extends ConstructorRepresentation>(objects: T): React.ExoticComponent<ThreeElement<T>>
/** Registers each constructor in `objects` under its key; see the first overload. */
export function extend<T extends Catalogue>(objects: T): void
// A whole module namespace (`extend(THREE)`) carries functions and constants alongside the
// classes, so it is not a `Catalogue`. Accept it as-is: only constructors are registered.
/** Registers every constructor in a module namespace, skipping other exports; see the first overload. */
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

//* Element name resolution ==============================
// An element name (`Mesh`, `MeshBasicNodeMaterial`, a user's `CustomThing`) resolves in two steps:
//
// 1. Explicit `extend()` registrations, shared across every copy of fiber. These win whenever they
//    were made, so `extend({ Mesh: MyMesh })` overrides three's Mesh on every root.
// 2. The three namespace of the renderer *this root* loaded (`state.internal.support.three`). A
//    WebGPU root sees node materials; a WebGL root does not, and gets the same "not part of the THREE
//    namespace" error it always did instead of a class that would fail at render.
//
// There is no `extend(THREE)` at import time any more. That call is what forced every entry to carry
// a whole three namespace in its eager graph, renderer included.

/** Resolve an element name to the constructor this root would instantiate for it, if any. */
export function resolveConstructor(name: string, root: RootStore): ConstructorRepresentation | undefined {
  if (Object.prototype.hasOwnProperty.call(catalogue, name)) return catalogue[name]
  const object = root.getState().internal.support?.three[name as keyof RendererNamespace]
  return isConstructor(object) ? object : undefined
}

type RendererNamespace = NonNullable<ReturnType<RootStore['getState']>['internal']['support']>['three']
