import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { SVGRenderer } from 'three-stdlib'

function TorusKnot() {
  const [hovered, setHovered] = useState(false)
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime / 2
    ref.current.rotation.set(t, t, t)
  })

  return (
    <mesh ref={ref} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <torusKnotGeometry args={[10, 3, 128, 16]} />
      <meshBasicMaterial color={hovered ? 'orange' : 'hotpink'} />
    </mesh>
  )
}

const gl = new SVGRenderer()
gl.domElement.style.position = 'absolute'
gl.domElement.style.top = '0'
gl.domElement.style.left = '0'

export default function () {
  useEffect(() => {
    document.body.appendChild(gl.domElement)
    return () => void document.body.removeChild(gl.domElement)
  }, [])

  return (
    <Canvas gl={gl} camera={{ position: [0, 0, 50] }} eventSource={gl.domElement as unknown as HTMLElement}>
      <color attach="background" args={['#dedddf']} />
      <TorusKnot />
    </Canvas>
  )
}
