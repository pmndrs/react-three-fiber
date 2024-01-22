import * as THREE from 'three'
import React, { Suspense, useState, useCallback } from 'react'
import { Canvas, createPortal, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, OrbitControls } from '@react-three/drei'

function Soda(props: any) {
  const [hovered, spread] = useHover()
  const { nodes, materials } = useGLTF('/bottle.gltf') as any
  return (
    <group {...props} {...spread} dispose={null}>
      <mesh geometry={nodes.Mesh_sodaBottle.geometry}>
        <meshStandardMaterial color={hovered ? 'red' : 'green'} metalness={0.6} roughness={0} />
      </mesh>
      <mesh geometry={nodes.Mesh_sodaBottle_1.geometry} material={materials.red} />
    </group>
  )
}

function useHover() {
  const [hovered, hover] = useState(false)
  return [hovered, { onPointerOver: (e: any) => (e.stopPropagation(), hover(true)), onPointerOut: () => hover(false) }]
}

function Hud({ priority = 1, children }: any) {
  const { gl, scene: defaultScene, camera: defaultCamera } = useThree()
  const [scene] = useState(() => new THREE.Scene())
  useFrame(() => {
    if (priority === 1) {
      gl.autoClear = true
      gl.render(defaultScene, defaultCamera)
      gl.autoClear = false
    }
    gl.clearDepth()
    gl.render(scene, defaultCamera)
  }, priority)
  return <>{createPortal(children, scene, { events: { priority: priority + 1 } })}</>
}

function Plane({ stop = false, color, position }: any) {
  const [hovered, set] = useState(false)
  const onPointerOver = useCallback((e) => {
    if (stop) e.stopPropagation()
    set(true)
  }, [])
  const onPointerOut = useCallback((e) => {
    if (stop) e.stopPropagation()
    set(false)
  }, [])
  return (
    <mesh name={color} position={position} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <planeGeometry />
      <meshPhysicalMaterial color={hovered ? 'orange' : color} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

const App = () => (
  <Canvas camera={{ fov: 75, position: [0, 0, -2.25] }}>
    <Suspense fallback={null}>
      <ambientLight intensity={Math.PI} />
      <pointLight decay={0} position={[10, 10, 10]} />
      <Plane color="lightblue" position={[0.5, 0, -1]} />
      <Plane stop color="aquamarine" position={[0, 0, -0.5]} />
      <Plane color="hotpink" position={[-0.5, 0, 0]} />
      <Hud priority={1}>
        <Soda position={[0, -0.5, 0]} scale={2} />
        <Environment preset="warehouse" />
      </Hud>
      <Hud priority={2}>
        <Soda position={[0, -0.5, 0]} scale={1.5} />
        <Environment preset="dawn" />
      </Hud>
    </Suspense>
    <OrbitControls />
  </Canvas>
)

export default App
