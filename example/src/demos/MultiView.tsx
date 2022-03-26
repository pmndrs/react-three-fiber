import * as THREE from 'three'
import React, { useRef, useEffect, Suspense, useState } from 'react'
import { Canvas, useFrame, useThree, createPortal, ReactThreeFiber, Camera, EventManager } from '@react-three/fiber'
import { useGLTF, useFBO, OrbitControls } from '@react-three/drei'
import { useCallback } from 'react'

function Window({ index = 1, children, clearColor = 'white', placement = 'topright', ...props }: any) {
  const ref = useRef<THREE.Mesh>(null!)
  const { scene: defaultScene, camera: defaultCamera, events, viewport, size } = useThree()
  const [camera] = useState(() => new THREE.PerspectiveCamera(50, 1, 0.1, 1000))
  const [scene] = useState(() => new THREE.Scene())
  const fbo = useFBO()

  clearColor = new THREE.Color(clearColor).convertLinearToSRGB()

  useEffect(() => {
    camera.position.set(0, 0, 5)
    camera.aspect = size.width / 2 / (size.height / 2)
    camera.updateProjectionMatrix()
  }, [viewport])

  let coords: any
  switch (placement) {
    case 'topright':
      coords = [0.5, 0.5]
      break
    case 'topleft':
      coords = [0, 0.5]
      break
    case 'bottomright':
      coords = [0.5, 0]
      break
    case 'bottomleft':
      coords = [0, 0]
      break
    default:
      coords = [0, 0]
  }

  useFrame(({ gl }) => {
    const left = Math.floor(size.width * coords[0])
    const bottom = Math.floor(size.height * coords[1])
    const width = Math.floor(size.width * 0.5)
    const height = Math.floor(size.height * 0.5)
    gl.setViewport(left, bottom, width, height)
    gl.setScissor(left, bottom, width, height)
    gl.setScissorTest(true)
    gl.setClearColor(clearColor)
    gl.render(defaultScene, camera)
  }, index)

  const compute = useCallback((event, state, previous) => {
    if (!previous.raycaster.camera) previous.events.compute(event, previous, previous.previousRoot?.getState())
    const [intersection] = previous.raycaster.intersectObject(ref.current)
    if (!intersection) return false
    const uv = intersection.uv!
    state.raycaster.setFromCamera(state.pointer.set(uv.x * 2 - 1, uv.y * 2 - 1), camera)
  }, [])

  const [el] = useState(() => {
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.width = '50%'
    div.style.height = '50%'

    switch (placement) {
      case 'topright':
        div.style.top = '0px'
        div.style.right = '0px'
        break
      case 'topleft':
        div.style.top = '0px'
        div.style.left = '0px'
        break
      case 'bottomright':
        div.style.bottom = '0px'
        div.style.right = '0px'
        break
      case 'bottomleft':
        div.style.bottom = '0px'
        div.style.left = '0px'
        break
    }

    return div
  })

  useEffect(() => {
    if (events.connected) {
      const target = events.connected.parentNode
      target.appendChild(el)
      return () => {
        target.removeChild(el)
      }
    }
  }, [])

  return (
    <>
      {createPortal(
        <>
          <OrbitControls domElement={el} />
          {children}
        </>,
        scene,
        { camera, events: { compute, priority: events.priority - 1 } },
      )}
    </>
  )
}

function Lights() {
  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[20, 30, 10]} />
      <pointLight position={[-10, -10, -10]} color="blue" />
    </>
  )
}

function useHover() {
  const [hovered, hover] = useState(false)
  return [
    hovered,
    {
      onPointerOver: (e: any) => (e.stopPropagation(), hover(true)),
      onPointerOut: () => hover(false),
    },
  ]
}

function Soda(props: any) {
  const [hovered, spread] = useHover()
  const { nodes, materials } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/soda-bottle/model.gltf',
  ) as any
  return (
    <group {...props} {...spread} dispose={null}>
      <mesh geometry={nodes.Mesh_sodaBottle.geometry}>
        <meshStandardMaterial color={hovered ? 'red' : 'green'} />
      </mesh>
      <mesh geometry={nodes.Mesh_sodaBottle_1.geometry} material={materials.red} />
    </group>
  )
}

export default function App() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5] }}>
      <Suspense fallback={null}>
        <Window index={1} placement="bottomleft" clearColor="orange" />
        <Window index={2} placement="bottomright" clearColor="hotpink" />
        <Window index={3} placement="topleft" clearColor="aquamarine" />
        <Window index={4} placement="topright" clearColor="lightblue" />
        <Scene />
      </Suspense>
    </Canvas>
  )
}

function Scene() {
  return (
    <>
      <Lights />
      <Soda scale={2} position={[-1, 0, 1]} />
      <Soda scale={2} position={[1, 0, 1]} />
      <Soda scale={2} position={[0, 0, 0]} />
    </>
  )
}
