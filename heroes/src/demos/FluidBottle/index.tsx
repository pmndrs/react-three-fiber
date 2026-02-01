/**
 * Demo: Fluid Bottle
 * Features: useLocalNodes, useUniforms, TSL Fn nodes
 *
 * Port of the classic Unity fake-liquid shader effect.
 * Wobble physics simulate liquid responding to motion.
 */

import { Canvas, useFrame, useLocalNodes, useThree, useUniforms } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'
import { button, useControls } from 'leva'
import { float, uniform, vec4, step } from 'three/tsl'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

import { liquidFill, liquidColor, liquidLitColor, liquidEmissive } from './Nodes/LiquidNode'
import { WobblePhysics } from './Nodes/WobblePhysics'

const _worldPos = new THREE.Vector3()
const _worldQuat = new THREE.Quaternion()

function LiquidBottle() {
  const groupRef = useRef<THREE.Group>(null)
  const liquidMeshRef = useRef<THREE.Mesh>(null)

  const controls = useControls({
    fill: { value: 0.5, min: 0, max: 1, step: 0.01 },
    maxWobble: { value: 0.03, min: 0, max: 0.2, step: 0.001 },
    wobbleSpeed: { value: 1, min: 0.1, max: 5, step: 0.1 },
    recovery: { value: 1, min: 0.1, max: 5, step: 0.1 },
    liquidColor: { value: { r: 255, g: 107, b: 53 } },
    foamColor: { value: { r: 255, g: 220, b: 180 } },
    surfaceColor: { value: { r: 255, g: 140, b: 80 } },
    rimWidth: { value: 0.05, min: 0.005, max: 0.2, step: 0.005 },
  })
  useUniforms(controls)

  const wobble = useMemo(() => new WobblePhysics(), [])

  const { liquidColorNode, liquidAlpha, uWobbleX, uWobbleZ, uFillY, emissiveNode } = useLocalNodes(({ uniforms }) => {
    const uWobbleX = uniform(float(0))
    const uWobbleZ = uniform(float(0))
    const uFillY = uniform(float(0))

    const fillTest = liquidFill(uWobbleX, uWobbleZ, uFillY)

    const liqCol = liquidColor(fillTest, uniforms.liquidColor, uniforms.foamColor, uniforms.rimWidth)

    // Front faces: lit via colorNode, back faces: unlit via emissiveNode
    const litCol = liquidLitColor(liqCol)
    const emissive = liquidEmissive(uniforms.surfaceColor)

    const alpha = step(0, fillTest.negate())

    return {
      liquidColorNode: vec4(litCol, 1),
      liquidAlpha: alpha,
      emissiveNode: emissive,
      uWobbleX,
      uWobbleZ,
      uFillY,
    }
  })

  useFrame(({ delta, elapsed }) => {
    if (!groupRef.current) return

    // allways do
    groupRef.current.getWorldPosition(_worldPos)
    groupRef.current.getWorldQuaternion(_worldQuat)

    wobble.maxWobble = controls.maxWobble
    wobble.wobbleSpeed = controls.wobbleSpeed
    wobble.recovery = controls.recovery
    wobble.fillAmount = controls.fill
    wobble.update(_worldPos, _worldQuat, delta)

    // Compute fill position with mesh-based shape compensation
    if (liquidMeshRef.current) {
      wobble.computeFillPosition(liquidMeshRef.current, delta)
    }

    if (uWobbleX) uWobbleX.value = wobble.wobbleX
    if (uWobbleZ) uWobbleZ.value = wobble.wobbleZ
    if (uFillY) uFillY.value = wobble.fillOffset.y
  })

  const { camera, renderer, scene } = useThree()
  const transformCon = useMemo(() => new TransformControls(camera, renderer.domElement), [camera, renderer])
  const orbitControls = useThree((s) => s.controls) as any

  useControls({
    switchTransformMode: button(() => {
      transformCon.setMode(transformCon.mode === 'translate' ? 'rotate' : 'translate')
    }),
  })

  useEffect(() => {
    if (!groupRef.current) return
    transformCon.attach(groupRef.current)
    const gizmo = transformCon.getHelper()
    scene.add(gizmo)
    const onDragging = (event: { value: unknown }) => {
      if (orbitControls) orbitControls.enabled = !event.value
    }
    transformCon.addEventListener('dragging-changed', onDragging)

    window.addEventListener('keydown', (event) => {
      switch (event.key) {
        case ' ':
          transformCon.setMode(transformCon.mode === 'translate' ? 'rotate' : 'translate')
          break
        case 'Escape':
          transformCon.detach()
          break
      }
    })
    return () => {
      window.removeEventListener('keydown', (event) => {
        switch (event.key) {
          case ' ':
            transformCon.setMode(transformCon.mode === 'translate' ? 'rotate' : 'translate')
            break
          case 'Escape':
            transformCon.detach()
            break
        }
      })
      transformCon.removeEventListener('dragging-changed', onDragging)
      transformCon.detach()
      scene.remove(gizmo)
    }
  }, [transformCon, scene, orbitControls])

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
      <mesh ref={liquidMeshRef}>
        <capsuleGeometry args={[0.48, 1.18, 16, 32]} />
        <meshStandardNodeMaterial
          colorNode={liquidColorNode}
          opacityNode={liquidAlpha}
          emissiveNode={emissiveNode}
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
    <Canvas renderer camera={{ position: [3, 2, 4], fov: 45 }} background="#3F0C5B" shadows>
      <Scene />
    </Canvas>
  )
}
