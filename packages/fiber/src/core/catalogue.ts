import type { ConstructorRepresentation, RootStore } from '#types'
import { catalogue, isConstructor } from './extend'

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
