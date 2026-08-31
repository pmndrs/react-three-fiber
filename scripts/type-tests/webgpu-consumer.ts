import { useLocalNodes, useUniform, useUniforms } from '../../packages/fiber/dist/webgpu/index'
import { Color, Vector2 } from 'three/webgpu'
import { color, mix } from 'three/tsl'

function uniformTypeAssertions() {
  const speed = useUniform('speed', 1)
  const enabled = useUniform('enabled', true)
  const tint = useUniform('tint', '#ff0000')
  const offset = useUniform('offset', new Vector2(1, 2))

  speed.mul(2)
  enabled.not()
  mix(color('white'), tint, speed)
  offset.x.add(offset.y)

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

void uniformTypeAssertions
