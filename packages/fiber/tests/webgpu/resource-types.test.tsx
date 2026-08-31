import { Color, InterleavedBuffer, InterleavedBufferAttribute, Vector2, type MeshBasicNodeMaterial } from 'three/webgpu'
import { color, mix } from 'three/tsl'
import {
  useBuffers,
  useNodes,
  useUniform,
  useUniforms,
  type NodeProps,
  type TSLNode,
  type TSLNodeLike,
} from '../../src/webgpu'

type Assert<T extends true> = T
type MaterialNodeProps = NodeProps<MeshBasicNodeMaterial>
type SelectsWebGPUNodeProp = Assert<'colorNode' extends keyof MaterialNodeProps ? true : false>
type ExcludesOrdinaryObjectProp = Assert<'userData' extends keyof MaterialNodeProps ? false : true>

const selectsWebGPUNodeProp: SelectsWebGPUNodeProp = true
const excludesOrdinaryObjectProp: ExcludesOrdinaryObjectProp = true

void selectsWebGPUNodeProp
void excludesOrdinaryObjectProp

function typeAssertions() {
  const speed = useUniform('speed', 1)
  const tint = useUniform('tint', '#ff0000')
  const offset = useUniform('offset', new Vector2(1, 2))
  const existingSpeed = useUniform<number>('speed')

  speed.mul(2)
  mix(color('white'), tint, speed)
  offset.x.add(offset.y)
  existingSpeed.mul(2)

  const values = useUniforms({
    speed: 1,
    tint: new Color('white'),
    offset: new Vector2(1, 2),
  })

  values.speed.mul(2)
  mix(color('black'), values.tint, values.speed)
  values.offset.x.add(values.offset.y)

  // @ts-expect-error mapped returns must reject unknown keys.
  values.missing

  const legacyNode = { uuid: 'legacy-node', nodeType: 'float' } satisfies TSLNodeLike
  const nodes = useNodes(() => ({ legacyNode }))
  const legacyAlias: TSLNode = legacyNode
  const rootNodes = useNodes()
  const legacyRootEntry: (typeof rootNodes)['legacyNode'] = legacyNode
  const interleavedBuffer = new InterleavedBuffer(new Float32Array(6), 3)
  const attribute = new InterleavedBufferAttribute(interleavedBuffer, 3, 0)
  const buffers = useBuffers(() => ({ attribute }))

  nodes.legacyNode.nodeType
  buffers.attribute.data
  void legacyAlias
  void legacyRootEntry
  // @ts-expect-error creator inference must reject unknown keys.
  nodes.missing
}

void typeAssertions

describe('WebGPU resource declarations', () => {
  it('compile through source declarations', () => {
    expect(true).toBe(true)
  })
})
