/**
 * WebGPU Fog
 *
 * A ground plane and a field of blocks receding into a procedural TSL fog. The fog itself is
 * `<Fog />`: scoped `useUniforms` driven by Leva, composed into `fogNode` and `backgroundNode`
 * through `useLocalNodes` with a typed `uniforms.scope<FogUniformSchema>('fog')` read.
 *
 * Based on three.js example: webgpu_custom_fog.html
 */

import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
import { Fog } from './Fog'

//* Scene ==============================

/** A deterministic scatter so Fast Refresh and reloads keep the same layout. */
function scatter(count: number) {
  const blocks: { position: [number, number, number]; scale: [number, number, number] }[] = []
  let seed = 7
  const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < count; i++) {
    const height = 1 + next() * 5
    blocks.push({
      position: [(next() - 0.5) * 90, height / 2, (next() - 0.5) * 90],
      scale: [1 + next() * 2, height, 1 + next() * 2],
    })
  }
  return blocks
}

function Blocks() {
  const blocks = useMemo(() => scatter(120), [])
  return (
    <>
      {blocks.map((block, index) => (
        <mesh key={index} position={block.position} scale={block.scale}>
          <boxGeometry />
          <meshStandardNodeMaterial color="#c8b9a6" roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}

function Scene() {
  return (
    <>
      <Fog />
      <hemisphereLight args={['#f0f5f5', '#4a5d5d', 2]} />
      <directionalLight position={[20, 30, 10]} intensity={2} />
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[300, 300]} />
        <meshStandardNodeMaterial color="#5e6d6b" roughness={1} />
      </mesh>
      <Blocks />
    </>
  )
}

//* App ==============================

export default function App() {
  return (
    <Canvas renderer camera={{ position: [0, 8, 28], fov: 60, far: 300 }}>
      <Scene />
      <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />
    </Canvas>
  )
}
