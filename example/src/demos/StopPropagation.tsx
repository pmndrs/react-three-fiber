import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Canvas, createPortal, type ThreeElements, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useCallback, useState } from 'react'
import * as THREE from 'three'

function useHover() {
  const [hovered, setHovered] = useState(false)
  const props = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: () => setHovered(false),
  }
  return [hovered, props] as const
}

function Soda(props: ThreeElements['group']) {
  const [hovered, spread] = useHover()
  const { meshes, materials } = useGLTF('/bottle.gltf')

  return (
    <group {...props} {...spread} dispose={null}>
      <mesh geometry={meshes.Mesh_sodaBottle.geometry}>
        <meshStandardMaterial color={hovered ? 'red' : 'green'} metalness={0.6} roughness={0} />
      </mesh>
      <mesh geometry={meshes.Mesh_sodaBottle_1.geometry} material={materials.red} />
    </group>
  )
}

function Hud({ priority = 1, children }: { priority?: number; children: React.ReactNode }) {
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

function Plane({
  stop = false,
  color,
  position,
}: {
  stop?: boolean
  color: string
  position: [number, number, number]
}) {
  const [hovered, setHovered] = useState(false)

  const onPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (stop) e.stopPropagation()
    setHovered(true)
  }, [])

  const onPointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (stop) e.stopPropagation()
    setHovered(false)
  }, [])

  return (
    <mesh name={color} position={position} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <planeGeometry />
      <meshPhysicalMaterial color={hovered ? 'orange' : color} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function App() {
  return (
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
}
