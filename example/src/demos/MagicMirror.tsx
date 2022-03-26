import * as THREE from 'three'
import React, { useRef, useEffect, Suspense, useState } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import { OrbitControls, useGLTF, useFBO, Environment } from '@react-three/drei'
import { useCallback } from 'react'

function MagicMirror({ children, clearColor = 'white', ...props }: any) {
  const ref = useRef<THREE.Mesh>(null!)
  const { events } = useThree()
  const [camera] = useState(() => new THREE.PerspectiveCamera(50, 1, 0.1, 1000))
  const [scene] = useState(() => new THREE.Scene())
  const fbo = useFBO()

  camera.aspect = 4 / 5
  camera.updateProjectionMatrix()

  useFrame((state) => {
    camera.position.copy(state.camera.position)
    camera.rotation.copy(state.camera.rotation)
    camera.scale.copy(state.camera.scale)

    state.gl.clearColor()
    state.gl.setRenderTarget(fbo)
    state.gl.render(scene, camera)
    state.gl.setRenderTarget(null)
  })

  const compute = useCallback((event, state, previous) => {
    if (!previous.raycaster.camera) previous.events.compute(event, previous, previous.previousRoot?.getState())
    const [intersection] = previous.raycaster.intersectObject(ref.current)
    if (!intersection) return false
    const uv = intersection.uv!
    state.raycaster.setFromCamera(state.pointer.set(uv.x * 2 - 1, uv.y * 2 - 1), camera)
  }, [])

  return (
    <>
      <mesh ref={ref} {...props}>
        <planeGeometry args={[4, 5]} />
        <meshBasicMaterial map={fbo.texture} map-encoding={THREE.sRGBEncoding} />
      </mesh>
      {createPortal(children, scene, { camera, events: { compute, priority: events.priority - 1 } })}
    </>
  )
}

function Lights() {
  return (
    <>
      <color attach="background" args={['#f0f0f0']} />
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

function Farm(props: any) {
  const { scene } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/low-poly-farm/model.gltf',
  )
  return <primitive object={scene} {...props} />
}

function Ramen(props: any) {
  const { scene } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/bowl-broth/model.gltf',
  )
  return <primitive object={scene} {...props} />
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
  const [hovered, hover] = useState(false)
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 3, 7] }}>
      <Suspense fallback={null}>
        <group position={[0, -1, 0]}>
          <Lights />
          <MagicMirror position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
            <Lights />
            <Farm scale={10} rotation={[0, 0, 0]} position={[-1, -2, -10]} />
            <Soda scale={5} position={[2, -2, -1.5]} />

            <MagicMirror position={[2, 0, -5]} rotation={[0, 0, 0]}>
              <Lights />
              <Soda scale={8} position={[0, -2, -1.5]} />
              <Environment preset="city" background="only" />
            </MagicMirror>
          </MagicMirror>
          <Ramen scale={4} position={[-2, 0, 2]} />
          <Soda scale={5} position={[1.5, 0, 3]} />
        </group>
      </Suspense>
      <OrbitControls />
    </Canvas>
  )
}
