// holds the basic sea nodes that we can input from elsewhere
import { useEffect, useRef } from 'react'
import { PlaneGeometry } from 'three/webgpu'
import { folder } from 'leva'
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

// leva config object
export function getLevaSeaConfig() {
  return {
    emissive: folder({
      emissiveColor: '#ff0a81',
      emissiveLow: { value: -0.25, min: -1, max: 0, step: 0.01, label: 'Low' },
      emissiveHigh: { value: 0.2, min: 0, max: 1, step: 0.01, label: 'High' },
      emissivePower: { value: 7, min: 0, max: 20, step: 0.1, label: 'Power' },
    }),
    largeWaves: folder({
      largeWavesFrequency: { value: { x: 3, y: 1 }, step: 0.1, label: 'Frequency' },
      largeWavesSpeed: { value: 1.25, min: 0, max: 5, step: 0.01, label: 'Speed' },
      largeWavesMultiplier: { value: 0.15, min: 0, max: 1, step: 0.01, label: 'Multiplier' },
    }),
    smallWaves: folder({
      smallWavesIterations: { value: 3, min: 0, max: 10, step: 1, label: 'Iterations' },
      smallWavesFrequency: { value: 2, min: 0.1, max: 10, step: 0.1, label: 'Frequency' },
      smallWavesSpeed: { value: 0.3, min: 0.001, max: 5, step: 0.01, label: 'Speed' },
      smallWavesMultiplier: { value: 0.18, min: 0.001, max: 1, step: 0.01, label: 'Multiplier' },
    }),
    normalComputeShift: { value: 0.01, min: 0.01, max: 1, step: 0.001, label: 'Normal Compute Shift' },
  }
}

export function makeSeaNodes(inUniforms?: UniformStore | UniformRecord) {
  const uniforms = (inUniforms ? inUniforms : makeSeaUniforms()) as UniformRecord
  const u = uniforms // abreviated for readability

  const wavesElevation = Fn(([position]) => {
    const elevation = mul(
      sin(position.x.mul(u.largeWavesFrequency.x).add(time.mul(u.largeWavesSpeed))),
      sin(position.z.mul(u.largeWavesFrequency.y).add(time.mul(u.largeWavesSpeed))),
      u.largeWavesMultiplier,
    ).toVar()

    Loop({ start: float(1), end: u.smallWavesIterations.add(1) }, ({ i }) => {
      const noiseInput = vec3(
        position.xz
          .add(2) // avoids a-hole pattern
          .mul(u.smallWavesFrequency)
          .mul(i),
        time.mul(u.smallWavesSpeed),
      )

      const wave = mx_noise_float(noiseInput, 1, 0).mul(u.smallWavesMultiplier).div(i).abs()
      elevation.subAssign(wave)
    })

    return elevation
  })

  const elevation = wavesElevation(positionLocal)
  const positionNode = positionLocal.add(vec3(0, elevation, 0))

  const normalNode = Fn(() => {
    let positionA = positionLocal.add(vec3(uniforms.normalComputeShift, 0, 0))
    let positionB = positionLocal.add(vec3(0, 0, uniforms.normalComputeShift.negate()))

    positionA = positionA.add(vec3(0, wavesElevation(positionA), 0))
    positionB = positionB.add(vec3(0, wavesElevation(positionB), 0))

    const toA = positionA.sub(positionNode).normalize()
    const toB = positionB.sub(positionNode).normalize()
    const normal = toA.cross(toB)

    return transformNormalToView(normal)
  })

  const emissive = elevation.remap(uniforms.emissiveHigh, uniforms.emissiveLow).pow(uniforms.emissivePower)
  const emissiveNode = uniforms.emissiveColor.mul(emissive)

  return {
    positionNode,
    normalNode: normalNode(),
    emissiveNode,
  }
}

// if you dont pass this will generate for you
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

export const TerrainGeometry = () => {
  const geometryRef = useRef<PlaneGeometry>(null)
  useEffect(() => {
    if (geometryRef.current) {
      geometryRef.current.rotateX(-Math.PI / 2)
    }
  }, [])

  return <planeGeometry args={[2, 2, 256, 256]} ref={geometryRef} />
}
