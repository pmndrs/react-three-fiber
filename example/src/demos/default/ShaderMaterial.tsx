import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
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
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  vec3 rainbow = 0.5 + 0.5 * cos(uTime + vUv.xyx + vec3(0.0, 2.0, 4.0));
  gl_FragColor = vec4(mix(rainbow, uColor, 0.6), 1.0);
}
`

function Plane() {
  const material = useRef<THREE.ShaderMaterial>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    material.current.uniforms.uTime.value = state.elapsed
  })

  return (
    <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <planeGeometry args={[2, 2, 64, 64]} />
      <shaderMaterial
        ref={material}
        // The uniforms object has a stable reference so objects can be safely merged in
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('hotpink') },
        }}
        // Individual uniforms can also be safely updated with pierce notation
        uniforms-uColor-value={hovered ? 'royalblue' : 'hotpink'}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
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
