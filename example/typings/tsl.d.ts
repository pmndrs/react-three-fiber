/**
 * TSL (Three.js Shading Language) Type Augmentations
 *
 * Fixes incomplete/incorrect typings in @types/three for TSL's Fn function.
 * The upstream types expect NodeBuilder as first param, but runtime passes node arrays.
 *
 * Can be removed once @types/three properly types the Fn overloads.
 */

import type { Node, ShaderNodeObject } from 'three/webgpu'

//* Fn Return Type ==============================

/** The return type of Fn() - a callable shader function node */
type ShaderCallable<R extends Node = Node> = ((...params: unknown[]) => ShaderNodeObject<R>) & Node

//* Module Augmentation ==============================

declare module 'three/tsl' {
  /**
   * Fn with array parameter destructuring
   * @example Fn(([uv, skew]) => { ... })
   */
  export function Fn<R extends Node = Node>(
    jsFunc: (inputs: ShaderNodeObject<Node>[]) => ShaderNodeObject<R>,
  ): ShaderCallable<R>

  /**
   * Fn with object parameter destructuring
   * @example Fn(({ color, intensity }) => { ... })
   */
  export function Fn<T extends Record<string, unknown>, R extends Node = Node>(
    jsFunc: (inputs: T) => ShaderNodeObject<R>,
  ): ShaderCallable<R>

  /**
   * Fn with array params + layout
   * @example Fn(([a, b]) => { ... }, { layout: [...] })
   */
  export function Fn<R extends Node = Node>(
    jsFunc: (inputs: ShaderNodeObject<Node>[]) => ShaderNodeObject<R>,
    layout: { layout?: unknown },
  ): ShaderCallable<R>

  /**
   * Fn with object params + layout
   */
  export function Fn<T extends Record<string, unknown>, R extends Node = Node>(
    jsFunc: (inputs: T) => ShaderNodeObject<R>,
    layout: { layout?: unknown },
  ): ShaderCallable<R>
}
