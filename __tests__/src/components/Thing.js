import * as THREE from 'three'
import React, { useState } from 'react'
import { useSpring, animated } from 'react-spring/three'
import { Canvas } from 'react-three-fiber'

function Thing({
  vertices: v = [[-1, 0, 0], [0, 1, 0], [1, 0, 0], [0, -1, 0], [-1, 0, 0]],
  position: p = { active: [0, 0, 2], inactive: [0, 0, 0] },
  color: c = { active: 'pink', inactive: 'grey' },
}) {
  const [active, setActive] = useState(false)
  const vertices = v
  // We can tap into the eco system, this uses react-spring for animation
  const { color, pos, ...props } = useSpring({
    color: active ? c.active : c.inactive,
    pos: active ? p.active : p.inactive,
    'material-opacity': 1,
    scale: active ? [2.5, 2.5, 2.5] : [1, 1, 1],
    rotation: active ? [THREE.Math.degToRad(180), 0, THREE.Math.degToRad(45)] : [0, 0, 0],
    config: { mass: 1, tension: 10000, friction: 100, precision: 0.00001 },
  })

  return (
    <group>
      <animated.line position={pos}>
        <geometry name="geometry" vertices={vertices.map(v => new THREE.Vector3(...v))} />
        <animated.lineBasicMaterial name="material" color={color} />
      </animated.line>
      <animated.mesh onClick={e => setActive(!active)} position={pos} {...props}>
        <octahedronGeometry name="geometry" />
        <meshStandardMaterial name="material" color={color} transparent />
      </animated.mesh>
    </group>
  )
}

export default function App() {
  return (
    <>
      <Canvas style={{ background: '#272727' }}>
        <ambientLight color="lightblue" />
        <pointLight color="white" intensity={1} position={[10, 10, 10]} />
        <Thing />
      </Canvas>
    </>
  )
}
