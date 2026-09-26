/**
 * @fileoverview Extension entry - for packages that build on fiber, not for app code
 *
 * Every other entry bundles its own full copy of core, so an extension package that imported
 * from `@react-three/fiber/webgpu` would ship a second copy of core to apps that import `Canvas`
 * from `@react-three/fiber` (and vice versa). This entry contains only the three-free pieces an
 * extension needs. They work under a Canvas from any entry: the React context and the extension
 * registry are shared through Symbol.for().
 *
 * Apps keep importing from `@react-three/fiber`, `/webgpu` or `/legacy`.
 *
 * Usage (in an extension package):
 *   import { registerRootExtension, useStore, useThree, useFrame } from '@react-three/fiber/extension'
 */

export { context } from './core/context'
export { useStore, useThree } from './core/hooks/useStore'
export { useFrame } from './core/hooks/useFrame'
export { registerRootExtension, setRenderOverride, type RootExtension } from './core/extensions'

// The shared state and frame types -- deliberately not the whole #types barrel, which carries the
// global JSX element augmentation. Each app entry declares its own; an extension must not add a
// second, conflicting one (e.g. next to /legacy).
export type * from '../types/store'
export type * from '../types/events'
export type * from '../types/scheduler'
export type * from '../types/utils'
