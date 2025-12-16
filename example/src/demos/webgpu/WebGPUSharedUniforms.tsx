import { Canvas, extend, type ThreeToJSXElements, useFrame, type ThreeElements } from '@react-three/fiber'
import { easing } from 'maath'
import { useMemo, useState } from 'react'
import { color, mix, positionLocal, sin, time, uniform, vec2, vec3 } from 'three/tsl'
import * as THREE from 'three/webgpu'
import { useUniforms, useNodes, useUniform, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn } from 'three/tsl'
import type { UniformNode } from '@react-three/fiber/webgpu'

// single setup of nodes for the app
const Builder = () => {
  useUniform('uRotationSpeed', 1.0)
  useUniforms(() => {
    return {
      uBaseColor: uniform(new THREE.Color('red')),
      uRipplePoint: uniform(new THREE.Vector3(0, 0, 0)),
    }
  })

  useNodes(({ uniforms }) => {
    // temp casting until I fix types
    const baseColor = uniforms.uBaseColor as UniformNode<THREE.Color>

    // Local only unshared nodes.
    const col1 = color('orange')
    const currentTime = time.mul(2)

    const blendColorFn = Fn(([color2, isHovered]) => {
      // this node is private to this FN
      const rootColor = mix(col1, color2, sin(currentTime).add(1).div(2))
      return mix(rootColor, baseColor, isHovered)
    })
    return {
      positionNode: positionLocal.add(vec3(0, sin(currentTime).mul(0.05), 0)),
      blendColorFn: blendColorFn,
    }
  })

  return null
}

function Box(props: ThreeElements['mesh']) {
  const { colorNode } = useNodes()
  console.log('colorNode', colorNode)
  return (
    <mesh {...props} rotation-x={Math.PI / 2}>
      <boxGeometry />
      <meshBasicNodeMaterial colorNode={colorNode} />
    </mesh>
  )
}

function Plane(props: ThreeElements['mesh']) {
  const [hovered, hover] = useState(false)

  useFrame((state, delta) => {
    easing.damp(uHovered, 'value', hovered ? 1 : 0, 0.1, delta)
  })

  const { uHovered, ...matNodes } = useLocalNodes(({ uniforms, nodes }) => {
    const uHovered = uniform(0.0)
    const { blendColorFn } = nodes

    const col3 = color('aquamarine')

    return { colorNode: blendColorFn(col3, uHovered), positionNode: nodes.positionNode, uHovered }
  })

  return (
    <mesh onPointerOver={() => hover(true)} onPointerOut={() => hover(false)} {...props}>
      <planeGeometry />
      <meshBasicNodeMaterial key={uHovered.uuid} {...matNodes} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas renderer>
      <ambientLight intensity={Math.PI} />
      <Builder />
      <Plane scale={1.5} position={[-1.5, 2.5, -3]} />
      <Plane scale={1.5} position={[-1.3, 0, 0]} />
      <Plane scale={1.5} position={[0.6, 0, 2]} />
    </Canvas>
  )
}
