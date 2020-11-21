import * as React from 'react'
import { Canvas } from 'react-three-fiber'

const clickedScale = [1.5, 1.5, 1.5]
const defaultScale = [1, 1, 1]

function Box(props) {
  const [hovered, setHovered] = React.useState(false)
  const [clicked, setClicked] = React.useState(false)

  const onPointerOver = React.useCallback(function callback(e) {
    setHovered(true)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    setHovered(false)
  }, [])

  const onClick = React.useCallback(function callback(e) {
    setClicked(function toggle(bool) {
      return !bool
    })
  }, [])

  return (
    <mesh
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
      scale={clicked ? clickedScale : defaultScale}
      {...props}
    >
      <boxBufferGeometry />
      <meshBasicMaterial color={hovered ? 'hotpink' : 'green'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Box />
    </Canvas>
  )
}
