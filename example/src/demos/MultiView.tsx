import * as THREE from 'three'
import React, { useEffect, Suspense, useState } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import { useGLTF, Environment, OrbitControls, TransformControls } from '@react-three/drei'
import { useCallback } from 'react'

function Window({ index = 1, children, clearColor = 'white', placement = 'topright', ...props }: any) {
  const { events, viewport, size } = useThree()
  const [camera] = useState(() => new THREE.PerspectiveCamera(50, 1, 0.1, 1000))
  const [scene] = useState(() => new THREE.Scene())

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
    gl.render(scene, camera)
  }, index)

  const compute = useCallback((event, state, previous) => {
    if (event.target === el) {
      const width = state.size.width / 2
      const height = state.size.height / 2
      state.pointer.set((event.offsetX / width) * 2 - 1, -(event.offsetY / height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    }
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
    console.log('trying to attach', events.connected)
    if (events.connected) {
      const target = events.connected
      target.appendChild(el)
      return () => void target.removeChild(el)
    }
  }, [])

  return (
    <>
      {createPortal(children, scene, {
        camera,
        events: { compute, priority: events.priority - 1, connected: el },
      })}
    </>
  )
}

export default function App() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5] }}>
      <Suspense fallback={null}>
        <Window index={1} placement="bottomleft" clearColor="orange">
          <Scene preset="lobby" />
        </Window>
        <Window index={2} placement="bottomright" clearColor="hotpink">
          <Scene preset="city" />
        </Window>
        <Window index={3} placement="topleft" clearColor="aquamarine">
          <Scene preset="dawn" />
        </Window>
        <Window index={4} placement="topright" clearColor="lightblue">
          <Scene preset="warehouse" />
          <TransformControls scale={3} position={[1, -0.75, -1]}>
            <Soda />
          </TransformControls>
        </Window>
      </Suspense>
    </Canvas>
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

function Scene({ children, preset }: any) {
  return (
    <>
      <ambientLight intensity={1} />
      <pointLight position={[20, 30, 10]} />
      <pointLight position={[-10, -10, -10]} color="blue" />
      <Soda scale={3} position={[-1, -0.75, 1]} />
      <Soda scale={3} position={[1, -0.75, 1]} />
      <Soda scale={3} position={[0, -0.75, 0]} />
      <Suspense fallback={null}>
        <Environment preset={preset} background="only" />
      </Suspense>
      {children}
      <OrbitControls makeDefault />
    </>
  )
}
