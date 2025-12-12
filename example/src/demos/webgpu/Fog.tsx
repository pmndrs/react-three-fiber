import { useThree } from '@react-three/fiber/webgpu'
import { useEffect } from 'react'
import { useControls } from 'leva'
import { useUniforms } from '@react-three/fiber/webgpu'
import { useLocalNodes } from '@react-three/fiber/src/webgpu/hooks/useNodes'
import { uniform, fog, color, float, positionView, triNoise3D, positionWorld, normalWorld } from 'three/tsl'

export const Fog = () => {
  const { scene } = useThree()

  //* Leva Controls ==============================
  const levaUniforms = useControls('Fog', {
    // Colors - Sky gradient and fog color
    skyColor: { value: '#f0f5f5', label: 'Sky Color' },
    groundColor: { value: '#d0dee7', label: 'Fog Color' },

    // Distance Fade - How fog appears based on camera distance
    fogStart: { value: 0, min: 0, max: 100, step: 1, label: 'Fog Start Distance' },
    fogEnd: { value: 50, min: 10, max: 200, step: 1, label: 'Fog End Distance' },

    // Height Fog - Controls vertical fog distribution
    fogHeight: { value: 0, min: -20, max: 20, step: 0.5, label: 'Fog Base Height' },
    fogDensity: { value: 0.85, min: 0, max: 2, step: 0.01, label: 'Fog Density' },
    fogFalloff: { value: 2, min: 0.5, max: 5, step: 0.1, label: 'Height Falloff' },
    fogThickness: { value: 20, min: 1, max: 100, step: 1, label: 'Fog Layer Thickness' },

    // Animated Noise - Adds moving/shifting fog effect
    noiseSpeed: { value: 1.2, min: 0, max: 5, step: 0.1, label: 'Noise Animation Speed' },
    noiseScale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001, label: 'Noise Detail' },
    noiseStrength: { value: 0.2, min: 0, max: 1, step: 0.01, label: 'Noise Strength' },
  })

  //* Apply Uniforms ==============================
  useUniforms(levaUniforms, 'fog')

  //* Create Fog Nodes ==============================
  const { fogNode, backgroundNode } = useLocalNodes(({ uniforms }) => {
    const u = uniforms.fog as UniformRecord

    // Timer for animated noise
    const timer = uniform(0).onFrameUpdate((frame) => frame.time)

    // Colors
    const skyColor = color(u.skyColor)
    const groundColor = color(u.groundColor)

    // Distance-based fog fade (closer = less fog, farther = more fog)
    const distanceFade = positionView.z.negate().smoothstep(u.fogStart, u.fogEnd)

    // Height-based fog calculation
    // Fog is strongest at fogHeight, falls off above and below
    const heightAboveFog = positionWorld.y.sub(u.fogHeight)
    const heightFogAmount = float(u.fogThickness)
      .sub(heightAboveFog)
      .div(u.fogThickness)
      .pow(u.fogFalloff)
      .saturate()
      .mul(u.fogDensity)

    // Animated noise for fog variation (makes it look more natural/volumetric)
    const noiseScaleA = u.noiseScale
    const noiseScaleB = u.noiseScale.mul(2) // Second layer is 2x frequency
    const fogNoiseA = triNoise3D(positionWorld.mul(noiseScaleA), u.noiseStrength, timer)
    const fogNoiseB = triNoise3D(positionWorld.mul(noiseScaleB), u.noiseStrength, timer.mul(u.noiseSpeed))

    const fogNoise = fogNoiseA.add(fogNoiseB).mul(groundColor)

    // Combine distance fade + height fog for final fog amount
    const finalFogAmount = distanceFade.mul(heightFogAmount)

    // Final fog node (color + opacity)
    const fogNode = fog(distanceFade.oneMinus().mix(groundColor, fogNoise), finalFogAmount)

    // Background gradient (horizon to sky)
    const backgroundNode = normalWorld.y.max(0).mix(groundColor, skyColor)

    return {
      fogNode,
      backgroundNode,
    }
  })

  //* Apply to Scene ==============================
  useEffect(() => {
    scene.fogNode = fogNode
    scene.backgroundNode = backgroundNode
  }, [scene, fogNode, backgroundNode])

  return null
}
