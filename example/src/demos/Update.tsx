import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import {
  Canvas,
  FixedStage,
  Stage,
  StandardStages as Standard,
  useFrame,
  useThree,
  useUpdate,
  Stages as StandardStages,
} from '@react-three/fiber'
import { a, useSpring } from '@react-spring/three'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const colorA = new THREE.Color('#6246ea')
const colorB = new THREE.Color('#e45858')

const InputStage = new Stage('input')
const PhysicsStage = new FixedStage('physics', { fixedStep: 1 / 30 })
const HudStage = new Stage('hud')
const stages = [
  Standard.Early,
  InputStage,
  Standard.Fixed,
  PhysicsStage,
  Standard.Update,
  Standard.Late,
  Standard.Render,
  HudStage,
  Standard.After,
]

enum CustomStages {
  Input = 'input',
  Physics = 'physics',
  Hud = 'hud',
}

// TS workaround for extending an enum
type Stages = StandardStages | CustomStages
const Stages = { ...StandardStages, ...CustomStages }

// Quick and dirty HUD implementation.
function useHud() {
  const size = useThree((state) => state.size)
  const hud = useMemo(() => {
    const hudCanvas = document.createElement('canvas')
    hudCanvas.width = size.width
    hudCanvas.height = size.height
    const hudBitmap = hudCanvas.getContext('2d')!
    hudBitmap.font = '600 40px Inter'
    hudBitmap.textAlign = 'center'
    hudBitmap.fillStyle = 'rgba(245,10,10,0.75)'
    hudBitmap.fillText('Canvas drawn HUD', size.width / 2, size.height / 2)
    return hudCanvas
  }, [size.height, size.width])

  const camera = useMemo(
    () => new THREE.OrthographicCamera(-size.width / 2, size.width / 2, size.height / 2, -size.height / 2, 0, 30),
    [size.height, size.width],
  )
  const [scene] = useState(() => new THREE.Scene())
  const texture = useMemo(() => new THREE.CanvasTexture(hud), [hud])
  const material = useMemo(() => new THREE.MeshBasicMaterial({ map: texture, transparent: true }), [texture])
  const mesh = useMemo(
    () => new THREE.Mesh(new THREE.PlaneBufferGeometry(size.width, size.height), material),
    [material, size.height, size.width],
  )

  useLayoutEffect(() => {
    scene.add(mesh)
  }, [scene, mesh])

  return { scene, camera }
}

function Update() {
  const groupRef = useRef<THREE.Group>(null!)
  const matRef = useRef<THREE.MeshBasicMaterial>(null!)
  const [fixed] = useState(() => ({ scale: new THREE.Vector3(), color: new THREE.Color() }))
  const [prev] = useState(() => ({ scale: new THREE.Vector3(), color: new THREE.Color() }))

  const interpolate = true
  const [active, setActive] = useState(0)
  const getStage = useThree((state) => state.getStage)
  const fixedStage = useMemo(() => getStage('fixed') as FixedStage, [getStage])

  const { scene: sceneHud, camera: cameraHud } = useHud()

  // create a common spring that will be used later to interpolate other values
  const { spring } = useSpring({
    spring: active,
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 },
  })
  // interpolate values from common spring
  const scale = spring.to([0, 1], [1, 2])
  const rotation = spring.to([0, 1], [0, Math.PI])

  useUpdate(({ clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime()
      const scalar = (Math.sin(t) + 2) / 2
      prev.scale.copy(fixed.scale)
      fixed.scale.set(scalar, scalar, scalar)
    }

    if (matRef.current) {
      const t = clock.getElapsedTime()
      const alpha = Math.sin(t) + 1
      prev.color.copy(fixed.color)
      fixed.color.lerpColors(colorA, colorB, alpha)
    }
  }, Stages.Fixed)

  useUpdate((state) => {
    // With interpolation of the fixed stage
    const alpha = fixedStage.get().alpha

    // Can also get from inside the loop using state
    // const alpha = (state.getStage('fixed') as FixedStage).get().alpha

    if (interpolate) {
      groupRef.current.scale.lerpVectors(prev.scale, fixed.scale, alpha)
      matRef.current.color.lerpColors(prev.color, fixed.color, alpha)
    } else {
      groupRef.current.scale.copy(fixed.scale)
      matRef.current.color.copy(fixed.color)
    }
  })

  // For backwards compatability, useFrame gets executed in the update stage
  // A positive priority switches rendering to manual
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.x = groupRef.current.rotation.y += 0.005
    }
  })

  // Use our own render function by setting render to 'manual'
  useUpdate(({ gl, scene, camera }) => {
    if (gl.autoClear) gl.autoClear = false
    gl.clear()
    gl.render(scene, camera)
  }, Stages.Render)

  useUpdate(({ gl }) => {
    gl.clearDepth()
    gl.render(sceneHud, cameraHud)
  }, Stages.Hud)

  // Modify the fixed stage's step at runtime.
  useEffect(() => {
    fixedStage.set({ fixedStep: 1 / 15 })
  }, [fixedStage])

  return (
    <group ref={groupRef}>
      <a.mesh rotation-y={rotation} scale-x={scale} scale-z={scale} onClick={() => setActive(Number(!active))}>
        <boxBufferGeometry />
        <meshBasicMaterial ref={matRef} color="#6246ea" />
      </a.mesh>
      <OrbitControls />
    </group>
  )
}

export default function App() {
  return (
    <Canvas stages={stages} render="manual">
      <Update />
    </Canvas>
  )
}
