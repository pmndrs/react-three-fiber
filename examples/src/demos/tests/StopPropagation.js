import * as React from 'react'
import { Canvas } from 'react-three-fiber'

const args = [1, 1, 1]

function Box({ stop = false, color, position }) {
  const [hovered, set] = React.useState(false)

  const onPointerOver = React.useCallback(
    function callback(e) {
      if (stop) e.stopPropagation()
      set(true)
      console.log(`Box${color} pointerOver`)
    },
    [stop, color]
  )

  const onPointerOut = React.useCallback(
    function callback(e) {
      if (stop) e.stopPropagation()
      set(false)
      console.log(`Box${color} pointerOut`)
    },
    [stop, color]
  )

  return (
    <mesh name={color} position={position} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <boxBufferGeometry args={args} />
      <meshPhysicalMaterial color={hovered ? 'hotpink' : color} />
    </mesh>
  )
}

const camera = { zoom: 150, fov: 75, position: [0, 0, 25] }
const pointLightPosition = [10, 10, 10]
const box1position = [0.5, 0, -2]
const box2position = [0, 0, -1]
const box3position = [-0.5, 0, 0]

function StopPropagation() {
  return (
    <Canvas orthographic camera={camera}>
      <ambientLight />
      <pointLight position={pointLightPosition} />
      <Box color="blue" position={box1position} />
      <Box stop color="green" position={box2position} />
      <Box color="red" position={box3position} />
    </Canvas>
  )
}

export default React.memo(StopPropagation)
