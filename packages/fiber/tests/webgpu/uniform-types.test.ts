import type {
  Color,
  InputNode as ThreeInputNode,
  Matrix3,
  Matrix4,
  UniformNode as ThreeUniformNode,
  Vector2,
  Vector3,
  Vector4,
} from 'three/webgpu'

type Equal<TLeft, TRight> =
  (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
    ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
      ? true
      : false
    : false

type Expect<T extends true> = T

type ExistingUniform = ThreeUniformNode<'vec2', Vector2>
type ExistingInput = ThreeInputNode<'vec2', Vector2>
type RGBInput = { r: number; g: number; b: number }

type PreservesExistingUniform = Expect<Equal<UniformNodeFor<ExistingUniform>, ExistingUniform>>
type PreservesExistingInput = Expect<Equal<UniformNodeFor<ExistingInput>, ExistingUniform>>
type MapsDirectColor = Expect<Equal<UniformNodeFor<Color>, ThreeUniformNode<'color', Color>>>
type MapsRGBInput = Expect<Equal<UniformNodeFor<RGBInput>, ThreeUniformNode<'color', Color>>>
type MapsVector3 = Expect<Equal<UniformNodeFor<Vector3>, ThreeUniformNode<'vec3', Vector3>>>
type MapsVector4 = Expect<Equal<UniformNodeFor<Vector4>, ThreeUniformNode<'vec4', Vector4>>>
type MapsMatrix3 = Expect<Equal<UniformNodeFor<Matrix3>, ThreeUniformNode<'mat3', Matrix3>>>
type MapsMatrix4 = Expect<Equal<UniformNodeFor<Matrix4>, ThreeUniformNode<'mat4', Matrix4>>>

/**
 * Compile-only assertions for the ambient uniform mappings in `types/tsl.d.ts`.
 *
 * Both assignment directions matter: they ensure the aliases retain Three's exact shader and
 * value generics rather than merely producing a structurally compatible broad node.
 */
function rawUniformTypeAssertions(
  numberNode: ThreeUniformNode<'float', number>,
  booleanNode: ThreeUniformNode<'bool', boolean>,
  stringNode: ThreeUniformNode<'color', Color>,
  vectorNode: ThreeUniformNode<'vec2', Vector2>,
) {
  const mappedNumber: UniformNodeFor<number> = numberNode
  const exactNumber: ThreeUniformNode<'float', number> = mappedNumber

  const mappedBoolean: UniformNodeFor<boolean> = booleanNode
  const exactBoolean: ThreeUniformNode<'bool', boolean> = mappedBoolean

  const mappedString: UniformNodeFor<string> = stringNode
  const exactString: ThreeUniformNode<'color', Color> = mappedString

  const mappedVector: UniformNodeFor<{ x: number; y: number }> = vectorNode
  const exactVector: ThreeUniformNode<'vec2', Vector2> = mappedVector

  // @ts-expect-error Number inputs must produce float nodes, not bool nodes.
  const wrongNumber: ThreeUniformNode<'bool', boolean> = mappedNumber
  // @ts-expect-error Boolean inputs must produce bool nodes, not float nodes.
  const wrongBoolean: ThreeUniformNode<'float', number> = mappedBoolean
  // @ts-expect-error String inputs normalize to Color-backed color nodes.
  const wrongString: ThreeUniformNode<'float', number> = mappedString
  // @ts-expect-error Two-component inputs must not widen to vec3.
  const wrongVector: ThreeUniformNode<'vec3', Vector3> = mappedVector

  void [exactNumber, exactBoolean, exactString, exactVector, wrongNumber, wrongBoolean, wrongString, wrongVector]
}

function existingNodeTypeAssertions(
  uniformNode: ThreeUniformNode<'vec2', Vector2>,
  inputNode: ThreeInputNode<'vec2', Vector2>,
  mappedInput: UniformNodeFor<ThreeInputNode<'vec2', Vector2>>,
  preservesUniform: PreservesExistingUniform,
  preservesInput: PreservesExistingInput,
) {
  const mappedUniform: UniformNodeFor<typeof uniformNode> = uniformNode
  const exactUniform: ThreeUniformNode<'vec2', Vector2> = mappedUniform
  const exactInput: ThreeUniformNode<'vec2', Vector2> = mappedInput

  // The input value is used only as type evidence for the mapping.
  void [inputNode, preservesUniform, preservesInput]

  // @ts-expect-error Existing uniform shader generics must not be erased to vec3.
  const wrongUniform: ThreeUniformNode<'vec3', Vector3> = mappedUniform
  // @ts-expect-error Existing InputNode shader generics must remain vec2.
  const wrongInput: ThreeUniformNode<'vec3', Vector3> = mappedInput

  void [exactUniform, exactInput, wrongUniform, wrongInput]
}

function extendedRawUniformTypeAssertions(
  directColor: MapsDirectColor,
  rgbInput: MapsRGBInput,
  vector3: MapsVector3,
  vector4: MapsVector4,
  matrix3: MapsMatrix3,
  matrix4: MapsMatrix4,
) {
  void [directColor, rgbInput, vector3, vector4, matrix3, matrix4]
}

void rawUniformTypeAssertions
void existingNodeTypeAssertions
void extendedRawUniformTypeAssertions

describe('canonical uniform type mappings', () => {
  it('are enforced by the TypeScript fixture', () => {
    expect(true).toBe(true)
  })
})
