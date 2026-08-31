//* Global TSL Types ==============================

declare global {
  /**
   * Broad callable-node fallback for dynamic store readers.
   * Creator hooks preserve the exact function signatures inferred from Three's `Fn`.
   */
  type CallableTSLNode = ((...params: never[]) => unknown) & {
    readonly shaderNode: unknown
    readonly id: number
  }

  /** Legacy structural node accepted when at least one historical marker exists. */
  type LegacyTSLNodeLike = {
    label?: ((label: string) => unknown) | string
    setName?: (name: string) => unknown
  } & ({ uuid: string | undefined; nodeType?: string | null } | { uuid?: string; nodeType: string | null | undefined })

  /** Node type accepted by broad dynamic node-store readers. */
  type TSLNodeType = import('three/webgpu').Node | CallableTSLNode

  /**
   * Derive Three's shader node type from an existing node or a supported raw input.
   * Existing InputNode generics take precedence over structural value normalization.
   * Both generics must be inferred because Three's UniformNode intersects an unknown-typed
   * InputNode base with its concrete InputNode specialization.
   */
  type UniformNodeType<T> = T extends import('three/webgpu').UniformNode<infer TNodeType, infer _TValue>
    ? TNodeType
    : T extends import('three/webgpu').InputNode<infer TNodeType, infer _TValue>
      ? TNodeType
      : T extends number
        ? 'float'
        : T extends boolean
          ? 'bool'
          : T extends string | import('three/webgpu').Color | { r: number; g: number; b: number }
            ? 'color'
            : T extends import('three/webgpu').Vector4 | { x: number; y: number; z: number; w: number }
              ? 'vec4'
              : T extends import('three/webgpu').Vector3 | { x: number; y: number; z: number }
                ? 'vec3'
                : T extends import('three/webgpu').Vector2 | { x: number; y: number }
                  ? 'vec2'
                  : T extends import('three/webgpu').Matrix4
                    ? 'mat4'
                    : T extends import('three/webgpu').Matrix3
                      ? 'mat3'
                      : unknown

  /** Derive the normalized JavaScript value stored by a uniform node. */
  type UniformNodeValue<T> = T extends import('three/webgpu').UniformNode<infer _TNodeType, infer TValue>
    ? TValue
    : T extends import('three/webgpu').InputNode<infer _TNodeType, infer TValue>
      ? TValue
      : T extends string | { r: number; g: number; b: number }
        ? import('three/webgpu').Color
        : T extends { x: number; y: number; z: number; w: number }
          ? import('three/webgpu').Vector4
          : T extends { x: number; y: number; z: number }
            ? import('three/webgpu').Vector3
            : T extends { x: number; y: number }
              ? import('three/webgpu').Vector2
              : T extends number
                ? number
                : T extends boolean
                  ? boolean
                  : T

  /** Three's exact UniformNode with shader and value generics derived from an input. */
  type UniformNodeFor<T> = import('three/webgpu').UniformNode<UniformNodeType<T>, UniformNodeValue<T>>

  /** Preserve every input key while mapping values to exact Three uniform nodes. */
  type UniformNodesFor<T extends UniformInputRecord> = {
    [K in keyof T]: UniformNodeFor<T[K]>
  }

  /** Backward-compatible single-parameter uniform alias. */
  type UniformNode<T = unknown> = UniformNodeFor<T>

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
   * - Three.js types: Color, Vector2/3/4, Matrix3/4
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
    | { x: number; y: number }
    | { x: number; y: number; z: number }
    | { x: number; y: number; z: number; w: number }
    | { r: number; g: number; b: number; a?: number } // Plain objects converted to Color
    | import('three/webgpu').Node // TSL nodes like color(), vec3(), float() for type casting
    | UniformNode

  /** Input record for useUniforms - accepts raw values or UniformNodes */
  type UniformInputRecord = Record<string, UniformValue>
}

export {}
