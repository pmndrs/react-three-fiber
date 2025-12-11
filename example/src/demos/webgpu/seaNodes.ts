// holds the basic sea nodes that we can input from elsewhere
import InputNode from 'three/src/nodes/core/InputNode.js'
import {
  Fn,
  mx_noise_float,
  mul,
  sin,
  time,
  vec2,
  vec3,
  Loop,
  float,
  positionLocal,
  transformNormalToView,
  uniform,
  color,
} from 'three/tsl'
// Standard uniforms

function makeSeaUniforms() {
  return {
    emissiveColor: uniform(color('#ff0a81')),
    emissiveLow: uniform(-0.25),
    emissiveHigh: uniform(0.2),
    emissivePower: uniform(7),
    largeWavesFrequency: uniform(vec2(3, 1)),
    largeWavesSpeed: uniform(1.25),
    largeWavesMultiplier: uniform(0.15),
    smallWavesIterations: uniform(3),
    smallWavesFrequency: uniform(2),
    smallWavesSpeed: uniform(0.3),
    smallWavesMultiplier: uniform(0.18),
    normalComputeShift: uniform(0.01),
  }
}

export function makeSeaNodes(inUniforms?: Record<string, InputNode<any>>) {
  const uniforms = inUniforms ? inUniforms : makeSeaUniforms()

  const wavesElevation = Fn(([position]) => {
    const {
      largeWavesFrequency,
      largeWavesSpeed,
      largeWavesMultiplier,
      smallWavesFrequency,
      smallWavesSpeed,
      smallWavesMultiplier,
      smallWavesIterations,
    } = uniforms
    // large waves

    const elevation = mul(
      sin(position.x.mul(largeWavesFrequency.x).add(time.mul(largeWavesSpeed))),
      sin(position.z.mul(largeWavesFrequency.y).add(time.mul(largeWavesSpeed))),
      largeWavesMultiplier,
    ).toVar()

    Loop({ start: float(1), end: smallWavesIterations.add(1) }, ({ i }) => {
      const noiseInput = vec3(
        position.xz
          .add(2) // avoids a-hole pattern
          .mul(smallWavesFrequency)
          .mul(i),
        time.mul(smallWavesSpeed),
      )

      const wave = mx_noise_float(noiseInput, 1, 0).mul(smallWavesMultiplier).div(i).abs()

      elevation.subAssign(wave)
    })

    return elevation
  })
  const elevation = wavesElevation(positionLocal)
  const positionNode = positionLocal.add(vec3(0, elevation, 0))

  const normalsNode = Fn(() => {
    const basePosition = positionNode
    let positionA = positionLocal.add(vec3(uniforms.normalComputeShift, 0, 0))
    let positionB = positionLocal.add(vec3(0, 0, uniforms.normalComputeShift.negate()))

    positionA = positionA.add(vec3(0, wavesElevation(positionA), 0))
    positionB = positionB.add(vec3(0, wavesElevation(positionB), 0))

    const toA = positionA.sub(basePosition).normalize()
    const toB = positionB.sub(basePosition).normalize()
    const normal = toA.cross(toB)

    return transformNormalToView(normal)
  })

  const emissive = elevation.remap(uniforms.emissiveHigh, uniforms.emissiveLow).pow(uniforms.emissivePower)
  const emissiveNode = uniforms.emissiveColor.mul(emissive)

  return {
    positionNode,
    normalsNode,
    emissiveNode,
  }
}
