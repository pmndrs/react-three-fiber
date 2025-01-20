import { useState, useMemo } from 'react'
import * as THREE from 'three/webgpu'
import { mix, positionLocal, sin, time, vec3, uniform, color } from 'three/tsl'
import { ThreeElement, Canvas, extend, useFrame, ConstructorRepresentation } from '@react-three/fiber'
import { easing } from 'maath'

type ThreeExports = typeof THREE
type ThreeElementsImpl = {
  [K in keyof ThreeExports as Uncapitalize<K>]: ThreeExports[K] extends ConstructorRepresentation
    ? ThreeElement<ThreeExports[K]>
    : never
}

declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeElementsImpl {}
}

export default function App() {
  return (
    <Canvas
      gl={(props) => {
        extend(THREE as any)
        const renderer = new THREE.WebGPURenderer(props as any)
        return renderer.init().then(() => renderer)
      }}>
      <ambientLight intensity={Math.PI} />
      <Plane scale={1.5} position={[-1.5, 2.5, -3]} />
      <Plane scale={1.5} position={[-1.3, 0, 0]} />
      <Plane scale={1.5} position={[0.6, 0, 2]} />
    </Canvas>
  )
}

function Plane(props: any) {
  const [hovered, hover] = useState(false)
  const { key, uHovered, colorNode, positionNode } = useMemo(() => {
    const uHovered = uniform(0.0)
    const col1 = color('orange')
    const col2 = color('hotpink')
    const col3 = color('aquamarine')
    const currentTime = time.mul(2)
    const colorNode = mix(mix(col1, col2, sin(currentTime).add(1).div(2)), col3, uHovered)
    const positionNode = positionLocal.add(vec3(0, sin(currentTime).mul(0.05), 0))
    return { key: uHovered.uuid, uHovered, colorNode, positionNode }
  }, [])

  useFrame((state, delta) => {
    easing.damp(uHovered, 'value', hovered ? 1 : 0, 0.1, delta)
  })

  return (
    <mesh onPointerOver={() => hover(true)} onPointerOut={() => hover(false)} {...props}>
      <planeGeometry />
      <meshBasicNodeMaterial key={key} colorNode={colorNode} positionNode={positionNode} />
    </mesh>
  )
}
