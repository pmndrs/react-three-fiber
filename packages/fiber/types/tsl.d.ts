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

  /**
   * ShaderCallable - the return type of Fn()
   * A callable shader function node that can be invoked with parameters.
   * The function returns a ShaderNodeObject when called.
   *
   * @example
   * ```tsx
   * // Define a shader function
   * const blendColorFn = Fn(([color1, color2, factor]) => {
   *   return mix(color1, color2, factor)
   * })
   *
   * // Type when retrieving from nodes store
   * const { blendColorFn } = nodes as { blendColorFn: ShaderCallable }
   *
   * // Or with specific return type
   * const { myFn } = nodes as { myFn: ShaderCallable<THREE.Node> }
   * ```
   */
  type ShaderCallable<R extends Node = Node> = ((...params: unknown[]) => ShaderNodeObject<R>) & Node

  /**
   * ShaderNodeRef - a ShaderNodeObject wrapper around a Node
   * This is the common return type for TSL operations (add, mul, sin, etc.)
   *
   * @example
   * ```tsx
   * const { wobble } = nodes as { wobble: ShaderNodeRef }
   * ```
   */
  type ShaderNodeRef<T extends Node = Node> = ShaderNodeObject<T>

  /**
   * TSLNodeType - Union of all common TSL node types
   * Used by ScopedStore to properly type node access from the store.
   *
   * Includes:
   * - Node: base Three.js node type
   * - ShaderCallable: function nodes created with Fn()
   * - ShaderNodeObject: wrapped nodes from TSL operations (sin, mul, mix, etc.)
   *
   * @example
   * ```tsx
   * // In useLocalNodes, nodes are typed as TSLNodeType
   * const { positionNode, blendColorFn } = useLocalNodes(({ nodes }) => ({
   *   positionNode: nodes.myPosition,      // Works - Node is in union
   *   blendColorFn: nodes.myFn,            // Works - ShaderCallable is in union
   * }))
   *
   * // Can narrow with type guard or assertion when needed
   * if (typeof blendColorFn === 'function') {
   *   blendColorFn(someColor, 0.5)
   * }
   * ```
   */
  type TSLNodeType = Node | ShaderCallable<Node> | ShaderNodeObject<Node>

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
   * Supports:
   * - Primitives: number, string (color), boolean
   * - Three.js types: Color, Vector2/3/4, Matrix3/4, Euler, Quaternion
   * - Plain objects: { x, y, z, w } converted to vectors
   * - TSL nodes: color(), vec3(), float() for type casting
   * - UniformNode: existing uniforms (reused as-is)
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
    | Node // TSL nodes like color(), vec3(), float() for type casting
    | UniformNode

  /** Input record for useUniforms - accepts raw values or UniformNodes */
  type UniformInputRecord = Record<string, UniformValue>
}

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
