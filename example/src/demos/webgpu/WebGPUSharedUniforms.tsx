import { easing } from 'maath'
import { useState } from 'react'
import { mix, positionLocal, sin, time, vec3 } from 'three/tsl'
import { Canvas, useFrame, useNodes, useUniform, useUniforms, type ThreeElements } from '@react-three/fiber/webgpu'

function Scene() {
  const [hovered, setHovered] = useState(false)
  const speed = useUniform('speed', 1.5)
  const hover = useUniform('hover', 0)
  const { uBaseColor, uAccentColor, uHoverColor } = useUniforms(() => ({
    uBaseColor: 'orange',
    uAccentColor: 'hotpink',
    uHoverColor: 'aquamarine',
  }))

  const { colorNode, positionNode } = useNodes(() => {
    const wave = sin(time.mul(speed))
    return {
      colorNode: mix(mix(uBaseColor, uAccentColor, wave.add(1).div(2)), uHoverColor, hover),
      positionNode: positionLocal.add(vec3(0, wave.mul(0.06), 0)),
    }
  })

  useFrame((_, delta) => easing.damp(hover, 'value', hovered ? 1 : 0, 0.1, delta))

  return (
    <group onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <Shape colorNode={colorNode} positionNode={positionNode} position={[-2, 0, 0]}>
        <circleGeometry args={[0.75, 64]} />
      </Shape>
      <Shape colorNode={colorNode} positionNode={positionNode} position={[0, 0, 0]}>
        <ringGeometry args={[0.35, 0.75, 64]} />
      </Shape>
      <Shape colorNode={colorNode} positionNode={positionNode} position={[2, 0, 0]} rotation-z={Math.PI / 4}>
        <planeGeometry args={[1.15, 1.15]} />
      </Shape>
    </group>
  )
}

type ShapeProps = ThreeElements['mesh'] & Pick<ThreeElements['meshBasicNodeMaterial'], 'colorNode' | 'positionNode'>

function Shape({ children, colorNode, positionNode, ...props }: ShapeProps) {
  return (
    <mesh {...props}>
      {children}
      <meshBasicNodeMaterial colorNode={colorNode} positionNode={positionNode} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas renderer camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={['#271442']} />
      <Scene />
    </Canvas>
  )
}
