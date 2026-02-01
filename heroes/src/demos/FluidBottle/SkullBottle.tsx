import { useFrame, useLocalNodes, useThree, useUniforms } from '@react-three/fiber/webgpu'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three/webgpu'
import { button, useControls } from 'leva'
import { float, uniform, vec4, step, mix, vec3 } from 'three/tsl'
import { TransformControls } from 'three/addons/controls/TransformControls.js'

import { liquidFill, liquidColor, liquidLitColor, liquidEmissive } from './Nodes/LiquidNode'
import { WobblePhysics } from './Nodes/WobblePhysics'

import { useGLTF } from '@react-three/drei'
import { fresnel } from '../../shared/nodes/Fresnel'

const _worldPos = new THREE.Vector3()
const _worldQuat = new THREE.Quaternion()

export function SkullBottle() {
  const groupRef = useRef<THREE.Group>(null)
  const liquidMeshRef = useRef<THREE.Mesh>(null)

  // load the skull model
  const { scene: skullScene } = useGLTF('/assets/SkullBottle.glb')

  const glassShell = useMemo(() => skullScene.children[0].clone(), [skullScene])
  const liquidMesh = useMemo(() => glassShell.children[1], [glassShell])

  const controls = useControls({
    fill: { value: 0.5, min: 0, max: 1, step: 0.01 },
    maxWobble: { value: 0.1, min: 0, max: 0.2, step: 0.001 },
    wobbleSpeed: { value: 1, min: 0.1, max: 5, step: 0.1 },
    recovery: { value: 1, min: 0.1, max: 5, step: 0.1 },
    liquidColor: { value: { r: 15, g: 147, b: 18 } }, //#0f9312
    foamColor: { value: { r: 127, g: 176, b: 33 } }, //#7fb021
    surfaceColor: { value: { r: 181, g: 219, b: 27 } }, //#b5db1b
    rimWidth: { value: 0.05, min: 0.005, max: 0.2, step: 0.005 },
  })

  // I need to get the color values because leva is wack
  useEffect(() => {
    console.log('liquidColor', controls.liquidColor)
    console.log('foamColor', controls.foamColor)
    console.log('surfaceColor', controls.surfaceColor)
  }, [controls.liquidColor, controls.foamColor, controls.surfaceColor])
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
    // add some frenel
    const liquidFrenel = fresnel(4)
    const finalColor = mix(litCol, uniforms.surfaceColor, liquidFrenel)
    const emissive = liquidEmissive(uniforms.surfaceColor)

    const alpha = step(0, fillTest.negate())

    return {
      liquidColorNode: vec4(finalColor, 1),
      liquidAlpha: alpha,
      emissiveNode: emissive,
      uWobbleX,
      uWobbleZ,
      uFillY,
    }
  })

  useFrame(({ delta }) => {
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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ':
          transformCon.setMode(transformCon.mode === 'translate' ? 'rotate' : 'translate')
          break
        case 'Escape':
          transformCon.detach()
          break
      }
    },
    [transformCon],
  )

  useEffect(() => {
    if (!groupRef.current) return
    transformCon.attach(groupRef.current)
    const gizmo = transformCon.getHelper()
    scene.add(gizmo)
    const onDragging = (event: { value: unknown }) => {
      if (orbitControls) orbitControls.enabled = !event.value
    }
    transformCon.addEventListener('dragging-changed', onDragging)

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      transformCon.removeEventListener('dragging-changed', onDragging)
      transformCon.detach()
      scene.remove(gizmo)
    }
  }, [transformCon, scene, orbitControls, handleKeyDown])

  return (
    <group ref={groupRef} rotation={[1.316052, 0, 0]}>
      {/* Glass shell */}
      <primitive object={glassShell} scale={1} position={[0, 0, 0]} rotation={[0, 0, 0]} />

      {/* Liquid */}
      <primitive object={liquidMesh} ref={liquidMeshRef}>
        <meshStandardNodeMaterial
          colorNode={liquidColorNode}
          opacityNode={liquidAlpha}
          emissiveNode={emissiveNode}
          side={THREE.DoubleSide}
          alphaTest={0.5}
        />
      </primitive>
    </group>
  )
}
