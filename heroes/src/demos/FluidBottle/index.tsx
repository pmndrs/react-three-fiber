/**
 * Demo: Fluid Bottle
 * Features: useLocalNodes, useUniforms, TSL Fn nodes
 *
 * Port of the classic Unity fake-liquid shader effect.
 * Wobble physics simulate liquid responding to motion.
 */

import { Canvas, Environment } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
//import { LiquidBottle } from './LiquidBottle'
import { SkullBottle } from './SkullBottle'

export default function FluidBottle() {
  return (
    <Canvas renderer camera={{ position: [3, 2, 4], fov: 45 }} background="#3F0C5B" shadows>
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#ffd700" />
      <SkullBottle />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>

      <OrbitControls enablePan={false} minDistance={3} maxDistance={38} makeDefault />
    </Canvas>
  )
}
