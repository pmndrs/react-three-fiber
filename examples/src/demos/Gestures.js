import * as React from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useDrag } from 'react-use-gesture'
import { useSpring, a } from 'react-spring/three'

const dodecahedronBufferGeometryArgs = [1.4, 0]

function Obj() {
  const { viewport } = useThree()
  const [spring, set] = useSpring(() => ({
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    config: { mass: 3, friction: 40, tension: 800 },
  }))
  const bind = useDrag(
    ({ offset: [x, y], vxvy: [vx, vy], down, ...props }) => {
      const aspect = viewport().factor
      set({
        position: [x / aspect, -y / aspect, 0],
        rotation: [y / aspect, x / aspect, 0],
      })
    },
    { eventOptions: { pointer: true } }
  )

  return (
    <a.mesh {...spring} {...bind()} castShadow>
      <dodecahedronBufferGeometry attach="geometry" args={dodecahedronBufferGeometryArgs} />
      <meshNormalMaterial attach="material" />
    </a.mesh>
  )
}

const style = { background: 'lightblue' }
const camera = { position: [0, 0, 5] }
const position = [20, 10, 10]
const args = [1000, 1000]

function Gestures() {
  return (
    <Canvas style={style} shadowMap camera={camera}>
      <ambientLight intensity={0.5} />
      <spotLight
        intensity={0.6}
        position={position}
        angle={0.2}
        penumbra={1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        castShadow
      />
      <mesh receiveShadow>
        <planeBufferGeometry attach="geometry" args={args} />
        <meshPhongMaterial attach="material" color="#272727" />
      </mesh>
      <Obj />
    </Canvas>
  )
}

export default React.memo(Gestures)
