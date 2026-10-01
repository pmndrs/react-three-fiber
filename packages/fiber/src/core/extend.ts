/** Constructor registration and lookup for JSX elements. */
import type * as React from 'react'
import type { ThreeElement } from '../three-types'

export type ConstructorRepresentation<T = any> = new (...args: any[]) => T

export interface Catalogue {
  [name: string]: ConstructorRepresentation
}

const catalogue: Catalogue = {}
let i = 0

export const toPascalCase = (type: string): string => `${type[0].toUpperCase()}${type.slice(1)}`

export function hasConstructor(name: string): boolean {
  return name in catalogue
}

export function resolveConstructor(name: string): ConstructorRepresentation | undefined {
  return catalogue[name]
}

export function extend<T extends ConstructorRepresentation>(objects: T): React.ExoticComponent<ThreeElement<T>>
export function extend<T extends Catalogue>(objects: T): void
export function extend<T extends Catalogue | ConstructorRepresentation>(
  objects: T,
): React.ExoticComponent<ThreeElement<any>> | void {
  if (typeof objects === 'function') {
    const Component = `${i++}`
    catalogue[Component] = objects
    return Component as any
  } else {
    Object.assign(catalogue, objects)
  }
}
