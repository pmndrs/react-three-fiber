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

// leva config object
export function getLevaSeaConfig() {
  return {
    uRotationSpeed: { value: 1.0, min: 0, max: 5, step: 0.01 },
    emissiveColor: '#ff0a81',
    emissiveLow: { value: -0.25, min: -1, max: 0, step: 0.01 },
    emissiveHigh: { value: 0.2, min: 0, max: 1, step: 0.01 },
    emissivePower: { value: 7, min: 0, max: 20, step: 0.1 },
    largeWavesFrequency: { value: { x: 3, y: 1 }, step: 0.1 },
    largeWavesSpeed: { value: 1.25, min: 0, max: 5, step: 0.01 },
    largeWavesMultiplier: { value: 0.15, min: 0, max: 1, step: 0.01 },
    smallWavesIterations: { value: 3, min: 0, max: 10, step: 1 },
    smallWavesFrequency: { value: 2, min: 0, max: 10, step: 0.1 },
    smallWavesSpeed: { value: 0.3, min: 0, max: 5, step: 0.01 },
    smallWavesMultiplier: { value: 0.18, min: 0, max: 1, step: 0.01 },
    normalComputeShift: { value: 0.01, min: 0, max: 0.1, step: 0.001 },
  }
}

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

export function makeSeaNodes(inUniforms?: UniformStore | UniformRecord) {
  // Cast to UniformRecord since we only access root-level uniforms by specific names
  const uniforms = (inUniforms ? inUniforms : makeSeaUniforms()) as UniformRecord

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
