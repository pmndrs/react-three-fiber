/**
 * @fileoverview Typed uniforms by registration (the TanStack Router `Register` pattern).
 *
 * Nothing registered: every type below falls back to the loose shapes the hooks have always had.
 * Registered once, anywhere in the app:
 *
 * ```ts
 * export const globalUniforms = { uTime: 0, uColor: new Color('hotpink') }
 * export const playerUniforms = { uHealth: 1 }
 *
 * declare module '@react-three/tsl' {
 *   interface Register {
 *     uniforms: typeof globalUniforms
 *     scopes: { player: typeof playerUniforms }
 *     // strict: false  // unregistered root keys become loose instead of errors
 *   }
 * }
 *
 * configureTSL({ uniforms: globalUniforms, scopes: { player: playerUniforms } })
 * ```
 *
 * then `useUniforms().uTime`, `useUniforms('player').uHealth`, `useUniform('uTime')`,
 * `useFrame(({ uniforms }) => uniforms.uTime)`, `useThree((s) => s.uniforms.uTime)` and a creator's
 * `({ uniforms }) => uniforms.uTime` are typed by name, with no generics.
 */

import type { ScopedStoreMethods, ScopedStoreType } from './internal/ScopedStore'

//* Register ==============================

/**
 * Augment this to type uniforms by name. Recognised keys:
 * - `uniforms`: the root-level uniform inputs (e.g. `typeof globalUniforms`)
 * - `scopes`: named scopes and their inputs (e.g. `{ player: typeof playerUniforms }`)
 * - `strict`: `false` makes unregistered root keys loose instead of errors (default: strict)
 */
export interface Register {}

/** The registered root-level uniform inputs, or `{}` when nothing is registered. */
export type RegisteredUniforms = Register extends { uniforms: infer U extends UniformInputRecord } ? U : {}

/** The registered scopes and their inputs, or `{}` when nothing is registered. */
export type RegisteredScopes = Register extends { scopes: infer S extends Record<string, UniformInputRecord> } ? S : {}

type IsRegistered = Register extends { uniforms: any } | { scopes: any } ? true : false
type IsStrict = Register extends { strict: false } ? false : true

type TypedUniforms = UniformNodesFor<RegisteredUniforms> & {
  [K in keyof RegisteredScopes]: UniformNodesFor<RegisteredScopes[K]>
}

/**
 * What `state.uniforms` and `useUniforms()` are: the registered shape (strict by default, so a typo
 * is an error), or today's loose `UniformStore` when nothing is registered.
 */
export type AppUniforms = IsRegistered extends true
  ? IsStrict extends true
    ? TypedUniforms
    : TypedUniforms & UniformStore
  : UniformStore

/** Creator input at root level: new keys are free, registered keys must keep their registered type. */
export type RootUniformInput = Partial<RegisteredUniforms> & UniformInputRecord

/** Creator input for scope `S`: checked against the registered scope, free for any other scope. */
export type ScopeUniformInput<S extends string> = S extends keyof RegisteredScopes
  ? Partial<RegisteredScopes[S]>
  : unknown

/** A registered scope's uniform nodes. */
export type RegisteredScopeUniforms<S extends keyof RegisteredScopes> = UniformNodesFor<RegisteredScopes[S]>

/** A registered root uniform's node. */
export type RegisteredUniform<K extends keyof RegisteredUniforms> = UniformNodesFor<RegisteredUniforms>[K]

//* Creators ==============================

/**
 * `uniforms` in a creator (`useNodes(({ uniforms }) => ...)`). Unregistered: any name is a
 * `UniformNode`, as before. Registered: typed by name like `state.uniforms`, and `.scope(name)` is
 * typed for registered scopes.
 */
export type CreatorUniforms = IsRegistered extends true
  ? {
      scope<S extends keyof RegisteredScopes & string>(key: S): ScopedStoreType<UniformNode, RegisteredScopeUniforms<S>>
    } & Readonly<AppUniforms> &
      ScopedStoreMethods<UniformNode>
  : ScopedStoreType<UniformNode>
