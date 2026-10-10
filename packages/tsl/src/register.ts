/**
 * @fileoverview Typed uniforms and nodes by registration (the TanStack Router `Register` pattern).
 *
 * Nothing registered: every type below falls back to loose reads (`LooseUniformNode`, `LooseNode`).
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
 * `({ uniforms }) => uniforms.uTime` are typed by name, with no generics. Nodes register the same
 * way, by their node types: `nodes: { wobble: Node<'float'>; rimLight: typeof rimLightFn }` and
 * `nodeScopes: { fx: { blur: Node<'vec4'> } }`.
 *
 * Unregistered reads are loose: `LooseUniformNode` / `LooseNode`, which every operator accepts and
 * a single `as` makes exact (see those types for why).
 */

import type { ScopedStoreMethods, ScopedStoreType } from './internal/ScopedStore'
import type { LooseNode, LooseNodeStore, NodeLike, NodeRecord } from '../types'

//* Register ==============================

/**
 * Augment this to type uniforms and nodes by name. Recognised keys:
 * - `uniforms`: the root-level uniform inputs (e.g. `typeof globalUniforms`)
 * - `scopes`: named uniform scopes and their inputs (e.g. `{ player: typeof playerUniforms }`)
 * - `nodes`: the root-level nodes by node type (e.g. `{ wobble: Node<'float'>; rim: typeof rimFn }`)
 * - `nodeScopes`: named node scopes and their nodes (e.g. `{ fx: { blur: Node<'vec4'> } }`)
 * - `strict`: `false` makes unregistered root keys loose instead of errors (default: strict), for
 *   uniforms and nodes alike
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
 * is an error), or the loose `LooseUniformStore` when nothing is registered. With `strict: false`
 * an unregistered root key reads loose too. A loose read is a `LooseUniformNode`: every operator and
 * material slot accepts it, and a single `as` gives it an exact type (see that type for why).
 */
export type AppUniforms = IsRegistered extends true
  ? IsStrict extends true
    ? TypedUniforms
    : TypedUniforms & LooseUniformStore
  : LooseUniformStore

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
 * `uniforms` in a creator (`useNodes(({ uniforms }) => ...)`). Unregistered: any name reads as a
 * `LooseUniformNode` (or, by dot access, a scope of them), and `.scope(name)` as a record of them
 * unless given a schema. Registered: typed by name like `state.uniforms`, and `.scope(name)` is
 * typed for registered scopes.
 */
export type CreatorUniforms = IsRegistered extends true
  ? {
      scope<S extends keyof RegisteredScopes & string>(
        key: S,
      ): ScopedStoreType<UniformNode, RegisteredScopeUniforms<S>, LooseUniformNode>
    } & Readonly<AppUniforms> &
      ScopedStoreMethods<UniformNode, LooseUniformNode>
  : ScopedStoreType<UniformNode, LooseUniformStore, LooseUniformNode>

//* Nodes ==============================

/** The registered root-level nodes, or `{}` when none are registered. */
export type RegisteredNodes = Register extends { nodes: infer N extends NodeRecord } ? N : {}

/** The registered node scopes and their nodes, or `{}` when none are registered. */
export type RegisteredNodeScopes = Register extends { nodeScopes: infer S extends Record<string, NodeRecord> } ? S : {}

type IsNodesRegistered = Register extends { nodes: any } | { nodeScopes: any } ? true : false

type TypedNodes = RegisteredNodes & RegisteredNodeScopes

/**
 * What `state.nodes` and `useNodes()` are: the registered shape (strict by default, so a typo is an
 * error), or the loose `LooseNodeStore` when no nodes are registered. With `strict: false` an
 * unregistered root key reads loose too.
 */
export type AppNodes = IsNodesRegistered extends true
  ? IsStrict extends true
    ? TypedNodes
    : TypedNodes & LooseNodeStore
  : LooseNodeStore

/** Creator output at root level: new keys are free, registered keys must keep their registered type. */
export type RootNodeInput = Partial<RegisteredNodes> & NodeRecord

/** Creator output for scope `S`: checked against the registered scope, free for any other scope. */
export type ScopeNodeInput<S extends string> = S extends keyof RegisteredNodeScopes
  ? Partial<RegisteredNodeScopes[S]>
  : unknown

/**
 * `nodes` in a creator. Unregistered: any name reads as a `LooseNode` (or, by dot access, a scope of
 * them). Registered: typed by name like `state.nodes`, and `.scope(name)` is typed for registered
 * scopes.
 */
export type CreatorNodes = IsNodesRegistered extends true
  ? {
      scope<S extends keyof RegisteredNodeScopes & string>(
        key: S,
      ): ScopedStoreType<NodeLike, RegisteredNodeScopes[S], LooseNode>
    } & Readonly<AppNodes> &
      ScopedStoreMethods<NodeLike, LooseNode>
  : ScopedStoreType<NodeLike, LooseNodeStore, LooseNode>

/** A node reader's result for an explicit schema `T`, or loose nodes when none was given. */
export type ReadNodes<T extends NodeRecord> = NodeRecord extends T ? Record<string, LooseNode> : T

//* Readers ==============================

/**
 * A reader's result for an explicit schema `T`, or loose uniforms when none was given (`T` is then
 * its constraint, `UniformInputRecord`): `useUniforms<{ blur: number }>('fx')` vs `useUniforms('fx')`.
 */
export type ReadUniforms<T extends UniformInputRecord> = UniformInputRecord extends T
  ? Record<string, LooseUniformNode>
  : UniformNodesFor<T>
