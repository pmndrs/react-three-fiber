import {
  Color,
  InterleavedBuffer,
  InterleavedBufferAttribute,
  Matrix2,
  Storage3DTexture,
  StorageArrayTexture,
  Vector2,
  type MeshBasicNodeMaterial,
} from 'three/webgpu'
import { color, float, Fn, mix } from 'three/tsl'
import {
  useBuffers,
  useGPUStorage,
  useNodes,
  useUniform,
  useUniforms,
  type NodeProps,
  type NodeRecord,
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

  // The hook's NodeRecord is the store's own type, so a creator result is a valid store entry.
  const record: NodeRecord = { legacyNode }
  void record

  // Matrix2 is part of three's uniform() overload table
  const projection = useUniform('projection', new Matrix2())
  const projectionValue: Matrix2 = projection.value
  void projectionValue

  // Every WebGPU storage texture class is a storage leaf
  const storage = useGPUStorage(() => ({
    volume: new Storage3DTexture(4, 4, 4),
    layers: new StorageArrayTexture(4, 4, 2),
  }))
  storage.volume.wrapR
  storage.layers.isStorageTexture

  // Reader-mode calls accept an explicit schema, so a value registered elsewhere keeps its type
  const readUniforms = useUniforms<{ blurAmount: number; tint: Color }>()
  readUniforms.blurAmount.mul(2)
  mix(color('black'), readUniforms.tint, readUniforms.blurAmount)
  const scopedUniforms = useUniforms<{ density: number }>('fog')
  scopedUniforms.density.mul(2)
  const readNodes = useNodes<{ wobble: ReturnType<typeof float> }>('fx')
  readNodes.wobble.mul(2)
  const readBuffers = useBuffers<{ attribute: InterleavedBufferAttribute }>()
  readBuffers.attribute.data
  const readStorage = useGPUStorage<{ volume: Storage3DTexture }>('terrain')
  readStorage.volume.wrapR
  // @ts-expect-error a schema reader rejects keys outside the schema.
  readUniforms.missing

  // three's own Fn overloads are intact: nothing in R3F augments `three/tsl` any more, so the
  // statement-call form compute kernels rely on still typechecks.
  const kernel = Fn(() => {
    float(1)
  }, 'void')
  void kernel
}

void typeAssertions

describe('WebGPU resource declarations', () => {
  it('compile through source declarations', () => {
    expect(true).toBe(true)
  })
})
