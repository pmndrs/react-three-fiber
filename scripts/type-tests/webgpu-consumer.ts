import { Canvas, useGPUStorage, useLocalNodes, useUniform, useUniforms } from '../../packages/fiber/dist/webgpu/index'
import { createElement } from 'react'
import { Color, Matrix2, Storage3DTexture, Vector2 } from 'three/webgpu'
import { color, float, Fn, mix } from 'three/tsl'

function uniformTypeAssertions() {
  const speed = useUniform('speed', 1)
  const enabled = useUniform('enabled', true)
  const tint = useUniform('tint', '#ff0000')
  const offset = useUniform('offset', new Vector2(1, 2))
  const projection = useUniform('projection', new Matrix2())

  speed.mul(2)
  enabled.not()
  mix(color('white'), tint, speed)
  offset.x.add(offset.y)
  const projectionValue: Matrix2 = projection.value
  void projectionValue

  const fog = useUniforms(
    {
      density: 0.5,
      tint: new Color('white'),
      wind: new Vector2(1, 0),
    },
    'fog',
  )

  type FogUniformSchema = UniformNodesFor<{
    density: number
    tint: Color
    wind: Vector2
  }>

  fog.density.mul(2)
  mix(color('black'), fog.tint, fog.density)
  fog.wind.x.add(fog.wind.y)

  // @ts-expect-error useUniforms must preserve exact keys.
  fog.missing

  useLocalNodes(({ uniforms }) => {
    const scoped = uniforms.scope<FogUniformSchema>('fog')

    return {
      densityNode: scoped.density.mul(2),
      tintNode: mix(color('black'), scoped.tint, scoped.density),
    }
  })
}

function entryTypeAssertions() {
  // The /webgpu Canvas hands onCreated WebGPU-narrowed state: no instanceof narrow needed
  createElement(Canvas, { onCreated: (state) => void state.renderer.compute })

  // Every WebGPU storage texture class is accepted by useGPUStorage
  const storage = useGPUStorage(() => ({ volume: new Storage3DTexture(4, 4, 4) }))
  storage.volume.wrapR

  // three's own Fn overloads stay reachable: nothing in the published declarations augments
  // `three/tsl`, so the statement-call form compute kernels rely on typechecks.
  const kernel = Fn(() => {
    float(1)
  }, 'void')
  void kernel
}

void uniformTypeAssertions
void entryTypeAssertions
