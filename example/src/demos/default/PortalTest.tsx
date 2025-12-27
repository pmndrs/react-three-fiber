import { Canvas, createPortal, useThree } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { Mesh, Group } from 'three'

export default function App() {
  return (
    <Canvas renderer>
      <ambientLight intensity={Math.PI} />
      <Suspense fallback={null}>
        <PortalTestScene />
      </Suspense>
    </Canvas>
  )
}

function PortalTestScene() {
  const { camera } = useThree()
  // console.log('original camera', camera)
  const cubeRef = useRef<Mesh>(null)
  // console.log('cubeRef', cubeRef.current)
  const groupRef = useRef<Group>(null)
  // console.log('groupRef', groupRef.current)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  // console.log('portal camera', cameraRef.current)

  return (
    <>
      {/* Main scene content */}
      <color attach="background" args={['#1e1e1e']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <mesh position={[0, 0, -5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* Camera setup */}
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 2]} fov={75} />

      <OrbitControls />

      {/* Cube bound to camera - createPortal now accepts refs directly! */}
      {createPortal(
        <mesh position={[0, 0, -2]} scale={0.2} ref={cubeRef}>
          <boxGeometry />
          <meshStandardMaterial color="hotpink" side={THREE.DoubleSide} />
        </mesh>,
        camera,
      )}
    </>
  )
}
