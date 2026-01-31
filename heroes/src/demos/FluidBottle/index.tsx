/**
 * Demo: Fluid Bottle
 * Features: useLocalNodes, useUniforms, TSL Fn nodes
 *
 * Port of the classic Unity fake-liquid shader effect.
 * Wobble physics simulate liquid responding to motion.
 */

import { Canvas, useFrame, useLocalNodes, useUniforms } from '@react-three/fiber/webgpu'
import { OrbitControls, PivotControls, TransformControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'
import { useControls } from 'leva'
import { float, uniform, vec4, step } from 'three/tsl'

import { liquidFill, liquidColor, liquidSurface } from './Nodes/LiquidNode'
import { WobblePhysics } from './Nodes/WobblePhysics'

const _worldPos = new THREE.Vector3()
const _worldQuat = new THREE.Quaternion()

function LiquidBottle() {
  const groupRef = useRef<THREE.Group>(null)

  const controls = useControls({
    fill: { value: 0.5, min: 0, max: 1, step: 0.01 },
    maxWobble: { value: 0.03, min: 0, max: 0.2, step: 0.005 },
    wobbleSpeed: { value: 1, min: 0.1, max: 5, step: 0.1 },
    recovery: { value: 1, min: 0.1, max: 5, step: 0.1 },
    liquidColor: { value: { r: 255, g: 107, b: 53 } },
    foamColor: { value: { r: 255, g: 220, b: 180 } },
    surfaceColor: { value: { r: 255, g: 140, b: 80 } },
    rimWidth: { value: 0.05, min: 0.005, max: 0.2, step: 0.005 },
  })
  useUniforms(controls)

  const wobble = useMemo(() => new WobblePhysics(), [])

  const { liquidColorNode, liquidAlpha, uWobbleX, uWobbleZ, uFillY } = useLocalNodes(({ uniforms }) => {
    const uWobbleX = uniform(float(0))
    const uWobbleZ = uniform(float(0))
    const uFillY = uniform(float(0))

    const fillTest = liquidFill(uWobbleX, uWobbleZ, uFillY)

    const liqCol = liquidColor(fillTest, uniforms.liquidColor, uniforms.foamColor, uniforms.rimWidth)
    const finalCol = liquidSurface(uniforms.surfaceColor, liqCol)

    // Below surface (fillTest < 0) = visible, above = clipped
    // step(edge, x) returns 1 when x >= edge, so step(0, fillTest.negate()) = 1 when fillTest <= 0
    const alpha = step(0, fillTest.negate())

    return {
      liquidColorNode: vec4(finalCol, 1),
      liquidAlpha: alpha,
      uWobbleX,
      uWobbleZ,
      uFillY,
    }
  })

  useFrame(({ delta }) => {
    if (!groupRef.current) return

    groupRef.current.getWorldPosition(_worldPos)
    groupRef.current.getWorldQuaternion(_worldQuat)

    wobble.maxWobble = controls.maxWobble
    wobble.wobbleSpeed = controls.wobbleSpeed
    wobble.recovery = controls.recovery
    wobble.update(_worldPos, _worldQuat, delta)

    if (uWobbleX) uWobbleX.value = wobble.wobbleX
    if (uWobbleZ) uWobbleZ.value = wobble.wobbleZ
    // Remap fill [0,1] to local Y range [-1.07, 1.07] (capsule half-extent)
    const halfExtent = 1.07
    if (uFillY) uFillY.value = THREE.MathUtils.lerp(-halfExtent, halfExtent, controls.fill)
  })

  return (
    <group ref={groupRef}>
      {/* Glass shell */}
      <mesh>
        <capsuleGeometry args={[0.5, 1.2, 16, 32]} />
        <meshPhysicalMaterial
          color="#88ccff"
          transparent
          opacity={0.15}
          roughness={0.05}
          metalness={0}
          transmission={0.95}
          thickness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Liquid */}
      <mesh>
        <capsuleGeometry args={[0.48, 1.18, 16, 32]} />
        <meshStandardNodeMaterial
          colorNode={liquidColorNode}
          opacityNode={liquidAlpha}
          side={THREE.DoubleSide}
          alphaTest={0.5}
        />
      </mesh>

      {/* Cork */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.25, 16]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#ffd700" />

      <LiquidBottle />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>

      <OrbitControls enablePan={false} minDistance={3} maxDistance={8} makeDefault />
    </>
  )
}

export default function FluidBottle() {
  return (
    <Canvas renderer camera={{ position: [3, 2, 4], fov: 45 }} shadows>
      <Scene />
    </Canvas>
  )
}
