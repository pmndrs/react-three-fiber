/**
 * Demo: HL2 Fluid Bottle
 * Features: useBuffers, useNodes, TSL Compute
 *
 * Classic Half-Life 2 fluid simulation in a bottle.
 * Tilt the bottle, fluid responds with satisfying physics.
 */

import { Canvas, once, useFrame, useLocalNodes, useNodes, useUniform, useUniforms } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'
import { useControls } from 'leva'
import {
  color,
  Fn,
  float,
  mix,
  mx_fractal_noise_vec3,
  mx_worley_noise_float,
  mx_worley_noise_vec2,
  mx_worley_noise_vec3,
  normalLocal,
  positionLocal,
  positionWorld,
  remap,
  rotate,
  rotateUV,
  select,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { voronoiTexture } from './specialNodes/VoronoiTexture'
import { splashMaterial } from './specialNodes/SplashMaterial'
import { worleyNoise } from './specialNodes/RoadmapWorley'
import { objectSpacePosition } from './specialNodes/utils'
import { softLight, softLightClamped } from './specialNodes/SoftLight'
import { colorRamp, colorRampConstant } from './specialNodes/ColorRamp'
function mappingOffset(coord: any, loc: any) {
  return vec3(coord).add(vec3(loc))
}
function invert(c: any) {
  return float(1.0).sub(float(c))
}
const tempVector = new THREE.Vector3(0, 0, 0)
const SharedNodes = () => {
  const mainUniforms = useControls({
    uSplashDriver: { x: 0, y: 0, z: 0 },
    uheightLow: { value: 0.25, min: 0, max: 2, step: 0.01 },
    uheightHigh: { value: 0.77, min: 0, max: 2, step: 0.01 },
    uMixFactor1: { value: 0.62, min: 0, max: 1, step: 0.01 },
    uMixFactor2: { value: 0.34, min: 0, max: 1, step: 0.01 },
    uMixFactor3: { value: 0.2, min: 0, max: 1, step: 0.01 },
    uOutColorRamp1: { value: 0.271, min: 0, max: 1, step: 0.01 },
    uTopColorRamp1: { value: 0.19, min: 0, max: 1, step: 0.01 },

    uVpower: { value: 0.57, min: 0, max: 1, step: 0.01 },
    uDeformStrength: { value: 0.43, min: 0, max: 1, step: 0.01 },
    uSplashSpeed: { value: 1, min: 0, max: 3, step: 0.01 },

    // ripples
    uRippleSpeed: { value: 1, min: 0, max: 3, step: 0.01 },
    uRippleOuterRadius: { value: 0.56, min: 0, max: 3, step: 0.01 },
    uRippleInnerRadius: { value: 0, min: 0, max: 3, step: 0.01 },
    uRippleWobble: { value: 0.15, min: 0, max: 1, step: 0.01 },
    uRippleWaveSize: { value: 6, min: 0, max: 10, step: 0.01 },
    uRippleVorMix: { value: 0.37, min: 0, max: 1, step: 0.01 },
    uRippleEdgeMix: { value: 0.79, min: 0, max: 1, step: 0.01 },
    uFinalColorRamp: { value: 0.094, min: 0, max: 1, step: 0.01 },
  })
  useUniforms(mainUniforms)

  useUniform('uDeformDriver', new THREE.Vector3(0, 0, 0))
  useFrame(({ elapsed, uniforms }) => {
    tempVector.set(Math.sin(elapsed) * 0.5, Math.cos(elapsed) * 0.5, 0)
    uniforms.uDeformDriver.value.copy(tempVector)
  })

  useNodes(({ uniforms }) => {
    console.log('uniforms', uniforms)
    // for the cloud its likely a fractal noise, we can use mx
    const cloudNoise = mx_fractal_noise_vec3(uniforms.uSplashDriver, 0.01, 0.5)

    return {
      uCloudNoise: cloudNoise,
    }
  })
  return null
}

function Foam({
  position = [0, 0, 0],
  ...props
}: { position?: [number, number, number] | THREE.Vector3 } & Record<string, unknown>) {
  const boundsRef = useRef<THREE.Box3>(new THREE.Box3())
  const { finalPosition, finalColor, finalAlpha, uBoundsMin, uBoundsMax } = useLocalNodes(({ uniforms }) => {
    const uBoundsMin = uniform(vec3(0))
    const uBoundsMax = uniform(vec3(1))
    const objectPosition = objectSpacePosition(uBoundsMin, uBoundsMax)

    // take the bounds data and the remap uniforms to adjust the height factor
    const normalizedHeight = objectPosition.y
    const heightFactor = remap(normalizedHeight, uniforms.uheightLow, uniforms.uheightHigh, 0, 1)

    // scale 10 voronoi
    const raw = mx_worley_noise_float(objectPosition.mul(vec3(3, 1, 1)).mul(10))
    const voronoiTen = raw.div(0.87).pow(uniforms.uVpower)

    const voronoiThree = float(1).sub(
      mx_worley_noise_float(objectPosition.add(vec3(1, time.mul(uniforms.uSplashSpeed).negate(), 1)).mul(3))
        .div(0.87)
        .pow(uniforms.uVpower),
    )

    const voronoiFive = mx_worley_noise_float(objectPosition.mul(5))
    const topColorRamp = colorRamp(voronoiFive, vec3(0), vec3(1), 0.05, 1)

    // first mix is the larger voronoi and the height factor fade
    const firstMix = mix(voronoiThree, heightFactor, float(uniforms.uMixFactor1))
    // this adds the edges using the smaller voronoi as a detail value
    const secondMix = softLightClamped(firstMix, voronoiTen, float(uniforms.uMixFactor2))

    // constant color ramp: sets to black or white
    const colorRamp1 = colorRampConstant(secondMix, vec3(0), vec3(1), 0, uniforms.uOutColorRamp1)

    const topMix = mix(secondMix, topColorRamp, float(uniforms.uMixFactor3))
    // blue
    const blueRamp = colorRampConstant(topMix, vec3(0.298, 0.691, 0.838), vec3(0.637, 0.91, 0.996), 0, 0.227)

    // position is dispalcement along the vertex normal, sampled from a cloud noise, multiplied by strength
    // and offset by a vec3 driver
    const deformation = mx_fractal_noise_vec3(positionLocal.mul(2).mul(uniforms.uDeformDriver)).saturate()
    const finalPosition = positionLocal.add(deformation.mul(uniforms.uDeformStrength).mul(normalLocal))
    return {
      finalPosition,
      finalColor: blueRamp,
      finalAlpha: colorRamp1.lessThan(0.5),
      uBoundsMin,
      uBoundsMax,
    }
  })

  // todo: replace with curve
  const points = useMemo(() => {
    const pts: THREE.Vector2[] = []
    // Bowl section: rounded bottom curving out
    const bowlSegs = 14
    for (let i = 0; i <= bowlSegs; i++) {
      const t = i / bowlSegs
      const y = t * 2.5 - 1.5 // -1.5 to 1.0
      const r = 1.6 * Math.sqrt(t)
      pts.push(new THREE.Vector2(r, y))
    }
    // Lip: flare outward a bit
    pts.push(new THREE.Vector2(1.75, 1.15))
    pts.push(new THREE.Vector2(1.85, 1.3))
    // Straight up to finish perpendicular
    pts.push(new THREE.Vector2(1.85, 1.45))
    pts.push(new THREE.Vector2(1.85, 1.6))
    return pts
  }, [])

  const meshRef = useRef<THREE.Mesh>(null)

  // when the position changes get the bounds and set the min/max so we can get a normalized height factor
  useEffect(() => {
    if (meshRef.current && uBoundsMin && uBoundsMax) {
      boundsRef.current.setFromObject(meshRef.current)
      uBoundsMin.value.copy(boundsRef.current.min)
      uBoundsMax.value.copy(boundsRef.current.max)
    }
  }, [position, uBoundsMin, uBoundsMax])

  return (
    // In Blender they use a Displacement Modifier with a cloud texture
    <mesh position={position} {...props} ref={meshRef}>
      <latheGeometry args={[points]} />
      <meshStandardNodeMaterial
        positionNode={finalPosition}
        opacityNode={finalAlpha}
        colorNode={vec3(0)}
        emissiveNode={finalColor}
        side={THREE.DoubleSide}
        alphaTest={0.5}
      />
    </mesh>
  )
}

function Ripple({
  position = [0, 0, 0] as [number, number, number],
  size = 6,
  ...props
}: { position?: [number, number, number]; size?: number } & Record<string, unknown>) {
  const { finalColor, finalAlpha } = useLocalNodes(({ uniforms }) => {
    // Center UVs so (0.5, 0.5) becomes origin
    const centered = uv().sub(vec2(0.5))
    const radius = centered.length()
    const angle = centered.y.atan(centered.x).abs()

    // Polar coords — radius is primary axis (rings), angle is secondary (variation)
    const speed = uniforms.uSplashSpeed
    const radial = radius.mul(10).sub(time.mul(uniforms.uRippleSpeed))
    const polarCoord = vec3(radial, angle.mul(1.5), 0)

    // Two slightly offset Voronoi — subtraction isolates thin cell edges
    const rippleA = mx_worley_noise_float(polarCoord.mul(2))
    const radialGradient = radius.smoothstep(uniforms.uRippleOuterRadius, uniforms.uRippleInnerRadius)

    // this is so stupid
    const colorRampGradient = colorRamp(radialGradient, vec3(0), vec3(1), 0.118, 0.236)
    const distortion = mx_worley_noise_float(vec3(centered.mul(3), 0))
    // EXPENSIVE
    const cloudNoise = mx_fractal_noise_vec3(vec3(centered.mul(8), time.mul(0.2))).x
    const waveDistFn = Fn(([r, d, c, wobble, waveSize]: any) => {
      return r.add(d.mul(wobble)).add(c.mul(0.3)).mul(waveSize).sin().mul(0.5).add(0.5).pow(8).clamp(0, 1)
    })
    const waveDist = waveDistFn(radial, distortion, cloudNoise, uniforms.uRippleWobble, uniforms.uRippleWaveSize)

    const waveVorMix = mix(rippleA, waveDist, uniforms.uRippleVorMix)

    const mulMix = mix(waveVorMix, waveVorMix.mul(colorRampGradient), uniforms.uRippleEdgeMix)

    const finalColorRamp = colorRampConstant(mulMix, vec3(0), vec3(1), 0, uniforms.uFinalColorRamp)

    const finalColor = select(mulMix.lessThan(0.5), vec4(1, 1, 1, 0), finalColorRamp)
    return {
      finalColor: vec3(mulMix),
      finalAlpha: float(1),
    }
  })

  return (
    <mesh position={position} {...props}>
      <planeGeometry args={[size, size]} rotateX={once(-Math.PI / 2)} />
      <nodeMaterial
        colorNode={finalColor}
        opacityNode={finalAlpha}
        side={THREE.DoubleSide}
        alphaTest={0.5}
        transparent
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ffd700" />
      <SharedNodes />

      {/*}
      <group>
        <Foam />
        <Foam position={[0, 0.8, 0]} scale={[2, 1.4, 2]} />
        <Foam position={[0, -0.5, 0]} scale={[0.5, 0.5, 0.5]} />
      </group>
      */}

      <Ripple position={[0, 0.01, 0]} />

      {/* Ground */}
      <mesh position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} rotateX={once(-Math.PI / 2)} />
        <meshStandardMaterial color="#00E2FF" />
      </mesh>

      <OrbitControls enablePan={false} minDistance={3} maxDistance={18} />
    </>
  )
}

export default function SplashScene() {
  return (
    <Canvas renderer camera={{ position: [3, 2, 4], fov: 45 }} shadows>
      <Scene />
    </Canvas>
  )
}
