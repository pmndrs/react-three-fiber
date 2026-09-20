import type * as React from 'react'
import type { Catalogue, RootStore } from '#types'

// Cross-bundle state lives on globalThis under Symbol.for keys so every
// copy of a module sees one value.
export const CONTEXT = Symbol.for('@react-three/fiber.context')
export const CATALOGUE = Symbol.for('@react-three/fiber.catalogue')
export const EXTEND_ID = Symbol.for('@react-three/fiber.extendId')

export const global = globalThis as typeof globalThis & {
  [CONTEXT]?: React.Context<RootStore>
  [CATALOGUE]?: Catalogue
  [EXTEND_ID]?: number
}
