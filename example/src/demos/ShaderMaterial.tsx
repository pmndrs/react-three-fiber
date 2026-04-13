import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

const vertexShader = `
uniform float uTime;
varying vec2 vUv;

void main() {
  vUv = uv;

  vec3 transformed = position;
  transformed.z += sin((position.x + uTime) * 4.0) * 0.1;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
varying vec2 vUv;

void main() {
  vec3 color = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(color, 1.0);
}
`

function Plane() {
  const material = useRef<THREE.ShaderMaterial>(null!)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame(({ clock }) => {
    material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2, 64, 64]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 2.5] }}>
      <Plane />
    </Canvas>
  )
}
