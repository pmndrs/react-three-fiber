/** Three apple cores spinning at the same speed with different FPS limits. */

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const APPLE_URL = '/models/apple.gltf'

interface AppleProps {
  label: string
  position: [number, number, number]
  fps?: number
}

function Label({ children }: { children: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 128

    const context = canvas.getContext('2d')!
    context.fillStyle = '#404040'
    context.font = '600 56px Inter var, system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(children, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    return texture
  }, [children])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0, -1.75, 0]}>
      <planeGeometry args={[2, 0.5]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  )
}

function Apple({ label, position, fps }: AppleProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const { scene } = useGLTF(APPLE_URL)

  const object = useMemo(() => {
    const object = scene.clone()
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      const material = (child.material as THREE.MeshStandardMaterial).clone()
      material.metalness = 0
      child.material = material
    })
    return object
  }, [scene])

  useEffect(
    () => () =>
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) child.material.dispose()
      }),
    [object],
  )

  useFrame(
    (_, delta) => {
      groupRef.current.rotation.y += delta * 1.2
    },
    { fps },
  )

  return (
    <group position={position}>
      <group ref={groupRef}>
        <primitive object={object} position={[-0.5, -0.95, 0]} scale={10} />
      </group>
      <Label>{label}</Label>
    </group>
  )
}

export default function useFrameFPS() {
  return (
    <Canvas renderer={{ toneMapping: THREE.NoToneMapping }} camera={{ position: [0, 1, 8], fov: 50 }}>
      <ambientLight intensity={Math.PI * 0.6} />
      <directionalLight intensity={Math.PI * 0.4} position={[5, 10, 5]} />

      <Suspense fallback={null}>
        <Apple label="unlimited" position={[-2.5, 0, 0]} />
        <Apple label="15 fps" position={[0, 0, 0]} fps={15} />
        <Apple label="5 fps" position={[2.5, 0, 0]} fps={5} />
      </Suspense>
    </Canvas>
  )
}

useGLTF.preload(APPLE_URL)
