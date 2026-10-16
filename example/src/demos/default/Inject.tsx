import { Canvas, createPortal, getRootState, type ThreeElements, useThree } from '@react-three/fiber'
import { useEffect, useReducer, useRef, useState } from 'react'
import * as THREE from 'three'

type CubeProps = ThreeElements['mesh'] & { color: string }

const customCamera1 = new THREE.PerspectiveCamera()
const customCamera2 = new THREE.PerspectiveCamera()

export default function App() {
  const [scene1] = useState(() => new THREE.Scene())
  const [scene2] = useState(() => new THREE.Scene())
  const [mounted, mount] = useReducer(() => true, false)

  useEffect(() => {
    const timeout = setTimeout(mount, 1000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <Canvas>
      <Cube position={[-0.5, 0, 0]} color="hotpink" />
      {createPortal(
        <group>
          {mounted && <Cube position={[0, 0.5, 0]} color="lightblue" />}
          {createPortal(<Cube position={[0.5, 0, 0]} color="aquamarine" />, scene2, { camera: customCamera2 })}
        </group>,
        scene1,
        { camera: customCamera1 },
      )}
      <primitive object={scene1} />
      <primitive object={scene2} />
    </Canvas>
  )
}

function Cube({ color, ...props }: CubeProps) {
  const camera = useThree((state) => state.camera)
  const ref = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    console.log(`from within ${color}.useEffect`, getRootState(ref.current)?.camera, 'camera', camera.uuid)
  }, [])

  return (
    <mesh ref={ref} {...props}>
      <boxGeometry />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}
