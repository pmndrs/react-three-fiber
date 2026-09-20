import type * as React from 'react'
import type { ConstructorRepresentation, Catalogue, ThreeElement } from '#types'
import { global, CATALOGUE, EXTEND_ID } from './utils/global'

export const catalogue = (global[CATALOGUE] ??= {})

export function toPascalCase(type: string): string {
  return `${type[0].toUpperCase()}${type.slice(1)}`
}

function isConstructor(object: unknown): object is ConstructorRepresentation {
  return typeof object === 'function'
}

export function extend<T extends ConstructorRepresentation>(objects: T): React.ExoticComponent<ThreeElement<T>>
export function extend<T extends Catalogue>(objects: T): void
// A whole module namespace (`extend(THREE)`) carries functions and constants alongside the
// classes, so it is not a `Catalogue`. Accept it as-is: only constructors are registered.
export function extend(objects: Record<string, unknown>): void
export function extend(objects: Record<string, unknown> | ConstructorRepresentation): unknown {
  if (isConstructor(objects)) {
    // Generated element ids draw from one shared counter so factory calls never collide across bundles.
    const id = global[EXTEND_ID] ?? 0
    global[EXTEND_ID] = id + 1
    catalogue[id] = objects
    return `${id}`
  }

  for (const name in objects) {
    const object = objects[name]
    if (isConstructor(object)) catalogue[name] = object
  }
}
