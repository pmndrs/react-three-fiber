import * as React from 'react'
import { a, useSpring } from '@react-spring/three'
import { Canvas } from 'react-three-fiber'

const clickedScale = [1.9, 1.9, 1.9]
const defaultScale = [1.5, 1.5, 1.5]
const args = [1, 1, 1]

function Box(props) {
  const [hovered, setHover] = React.useState(false)
  const [clicked, setClicked] = React.useState(false)
  const boxProps = useSpring({ scale: clicked ? [1.9, 1.9, 1.9] : [1.5, 1.5, 1.5] })
  const onPointerOver = React.useCallback(function callback(e) {
    setHover(true)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    setHover(false)
  }, [])

  const onClick = React.useCallback(function callback(e) {
    setClicked(function toggle(bool) {
      return !bool
    })
  }, [])

  return (
    <a.mesh
      scale={clicked ? clickedScale : defaultScale}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      {...boxProps}
    >
      <boxBufferGeometry args={args} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </a.mesh>
  )
}

function Box2(props) {
  const [hovered, setHover] = React.useState(false)
  const [clicked, setClicked] = React.useState(false)
  const onPointerOver = React.useCallback(function callback(e) {
    setHover(true)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    setHover(false)
  }, [])
  const onClick = React.useCallback(function callback(e) {
    setClicked(function toggle(bool) {
      return !bool
    })
  }, [])

  return (
    <mesh
      {...props}
      scale={clicked ? clickedScale : defaultScale}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <boxBufferGeometry args={args} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

function Debugging() {
  return (
    <Canvas>
      <ambientLight />
      <Box />
      <Box2 position={args} />
    </Canvas>
  )
}

export default React.memo(Debugging)
