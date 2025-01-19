import * as THREE from 'three/webgpu'
import { mix, positionLocal, sin, time, vec3 } from 'three/tsl'
import { Canvas, extend } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'

const red = vec3(1, 0, 0)
const blue = vec3(0, 0, 1)
const currentTime = time.mul(0.5)
const colorNode = mix(red, blue, sin(currentTime))
const positionNode = positionLocal.add(vec3(0, sin(currentTime).mul(0.2), 0))

export default function App() {
  return (
    <Canvas
      gl={async (canvas) => {
        extend(THREE)
        const renderer = new THREE.WebGPURenderer({
          canvas,
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
        })
        await renderer.init()
        return renderer
      }}>
      <PerspectiveCamera makeDefault position={[2, 0, 10]} />
      <ambientLight intensity={Math.PI} />
      <mesh scale={5}>
        <planeGeometry />
        <meshBasicNodeMaterial colorNode={colorNode} positionNode={positionNode} />
      </mesh>
    </Canvas>
  )
}
