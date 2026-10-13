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
   * What TSL's constant constructors return: `int(1)`, `vec2(0, 1)`, `color('red')` and friends
   * wrap a ConstNode in a VarNode. three's `uniform()` unwraps exactly this shape to
   * `UniformNode<TNodeType, TValue>`, and so do the mappings below.
   */
  type TSLConstNode<TNodeType, TValue> = import('three/webgpu').VarNode<
    TNodeType,
    import('three/webgpu').ConstNode<TNodeType, TValue>
  >

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
      : T extends TSLConstNode<infer TNodeType, infer _TValue>
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
                        : T extends import('three/webgpu').Matrix2
                          ? 'mat2'
                          : unknown

  /** Derive the normalized JavaScript value stored by a uniform node. */
  type UniformNodeValue<T> = T extends import('three/webgpu').UniformNode<infer _TNodeType, infer TValue>
    ? TValue
    : T extends import('three/webgpu').InputNode<infer _TNodeType, infer TValue>
      ? TValue
      : T extends TSLConstNode<infer _TNodeType, infer TValue>
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

  //* Loose reads ==============================

  /** Every shader node type three's TSL declarations type separately. */
  type TSLNodeTypeName =
    | 'float'
    | 'int'
    | 'uint'
    | 'bool'
    | 'vec2'
    | 'vec3'
    | 'vec4'
    | 'ivec2'
    | 'ivec3'
    | 'ivec4'
    | 'uvec2'
    | 'uvec3'
    | 'uvec4'
    | 'bvec2'
    | 'bvec3'
    | 'bvec4'
    | 'color'
    | 'mat2'
    | 'mat3'
    | 'mat4'

  /** Every member of every constituent of `T`, each typed `any`. */
  type TSLLooseMembers<T> = { [K in T extends unknown ? keyof T : never]: any }

  /**
   * What an unregistered uniform read is: `useUniforms().uTime`, `useUniforms('fx').blur`,
   * `useUniform('uTime')`, a creator's `uniforms.uTime`, `state.uniforms.uTime` in `useFrame`.
   *
   * Why it is loose: the read goes through a string name, and TypeScript cannot know what a
   * runtime entry under that name holds. three's types only give the operator methods (`.mul`,
   * `.add`, swizzles, `.toVar()`, ...) to a node whose node type is known, so `UniformNode<unknown>`
   * had none of them and every read needed a cast.
   *
   * So this has every member that any of three's uniform nodes has (float, vec3, color, mat4, ...),
   * each typed `any`. Every operator, TSL function and material slot accepts it, and a misspelt member
   * (`.valeu`) is still an error. It is a deliberate simplification: results of its own methods are
   * `any`, and nothing checks that `cross()` gets a vec3.
   *
   * It converts to an exact type with a single `as`, since every member is `any`:
   * `uniforms.uColor as UniformNode<'color', Color>`, or `as Node<'vec3'>`. A node typed as a float
   * uniform would cover the operators with exact result types, but three's node types are not
   * comparable to one another, so it could only be cast through `unknown`.
   *
   * Exact types without casts: register the uniforms (`Register` in `@react-three/tsl`, which also
   * catches typos in the name), or pass a schema to the reader (`useUniforms<{ blur: number }>('fx')`,
   * `useUniform<Color>('uColor')`, `uniforms.scope<{ uHealth: UniformNode<'float', number> }>('player')`).
   */
  interface LooseUniformNode extends TSLLooseMembers<import('three/webgpu').UniformNode<TSLNodeTypeName, any>> {}

  /**
   * A root entry of an unregistered uniform map: a uniform (its members) or a scope of uniforms (any
   * other name), since the type cannot tell which a name holds. `uniforms.uTime.mul(2)` and
   * `uniforms.player.uHealth` both read.
   */
  type LooseUniformEntry = LooseUniformNode & { readonly [name: string]: LooseUniformNode }

  /** An unregistered uniform map read: `state.uniforms`, `useUniforms()`. */
  type LooseUniformStore = Record<string, LooseUniformEntry>

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
   * - Three.js types: Color, Vector2/3/4, Matrix2/3/4
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
    | import('three/webgpu').Matrix2
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
