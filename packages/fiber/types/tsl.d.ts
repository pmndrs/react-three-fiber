/**
 * TSL (Three.js Shading Language) Type Augmentations
 *
 * Fixes incomplete/incorrect typings in @types/three for TSL's Fn function.
 * The upstream types expect NodeBuilder as first param, but runtime passes node arrays.
 *
 * Can be removed once @types/three properly types the Fn overloads.
 */

import type { Node, ShaderNodeObject } from 'three/webgpu'

//* Global Types ==============================

declare global {
  /** Uniform node type - a Node with a value property (matches Three.js UniformNode) */
  interface UniformNode<T = unknown> extends Node {
    value: T
  }

  /** Flat record of uniform nodes (no nested scopes) */
  type UniformRecord<T extends UniformNode = UniformNode> = Record<string, T>

  /**
   * Uniform store that can contain both root-level uniforms and scoped uniform objects
   * Used by state.uniforms which has structure like:
   * { uTime: UniformNode, player: { uHealth: UniformNode }, enemy: { uHealth: UniformNode } }
   */
  type UniformStore = Record<string, UniformNode | UniformRecord>

  /**
   * Helper to safely access a uniform node from the store.
   * Use this when accessing state.uniforms to get proper typing.
   * @example
   * const uTime = uniforms.uTime as UniformNode<number>
   * const uColor = uniforms.uColor as UniformNode<import('three/webgpu').Color>
   */
  type GetUniform<T = unknown> = UniformNode<T>

  /**
   * Acceptable input values for useUniforms - raw values that get converted to UniformNodes
   * Supports: primitives, Three.js types, plain objects (converted to vectors), and UniformNodes
   */
  type UniformValue =
    | number
    | string
    | boolean
    | import('three/webgpu').Color
    | import('three/webgpu').Vector2
    | import('three/webgpu').Vector3
    | import('three/webgpu').Vector4
    | import('three/webgpu').Matrix3
    | import('three/webgpu').Matrix4
    | import('three/webgpu').Euler
    | import('three/webgpu').Quaternion
    | { x: number; y?: number; z?: number; w?: number } // Plain objects converted to vectors
    | UniformNode

  /** Input record for useUniforms - accepts raw values or UniformNodes */
  type UniformInputRecord = Record<string, UniformValue>
}

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
