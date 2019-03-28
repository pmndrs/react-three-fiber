import * as THREE from 'three'
import React, { useState, useRef, useMemo, useContext, useEffect, useCallback } from 'react'
import { useSpring, animated } from 'react-spring/three'
import { Canvas, useRender, useThree } from 'react-three-fiber'

function Thing() {
  const [active, setActive] = useState(false)
  const [hovered, setHover] = useState(false)
  const vertices = [[-1, 0, 0], [0, 1, 0], [1, 0, 0], [0, -1, 0], [-1, 0, 0]]
  // We can tap into the eco system, this uses react-spring for animation
  const { color, pos, ...props } = useSpring({
    color: active ? 'hotpink' : 'white',
    pos: active ? [0, 0, 2] : [0, 0, 0],
    'material-opacity': hovered ? 0.6 : 0.25,
    scale: active ? [1.5, 1.5, 1.5] : [1, 1, 1],
    rotation: active ? [THREE.Math.degToRad(180), 0, THREE.Math.degToRad(45)] : [0, 0, 0],
    config: { mass: 10, tension: 1000, friction: 300, precision: 0.00001 },
  })

  return (
    <group>
      <animated.line position={pos}>
        <geometry name="geometry" vertices={vertices.map(v => new THREE.Vector3(...v))} />
        <animated.lineBasicMaterial name="material" color={color} />
      </animated.line>
      <animated.mesh
        onClick={e => setActive(!active)}
        onMouseEnter={e => setHover(true)}
        onMouseLeave={e => setHover(false)}
        {...props}>
        <octahedronGeometry name="geometry" />
        <meshStandardMaterial name="material" color="grey" transparent />
      </animated.mesh>
    </group>
  )
}

function Stars() {
  let group = useRef()
  let theta = 0
  useRender(() => {
    // Some things maybe shouldn't be declarative, we're in the render-loop here with full access to the instance
    const r = 5 * Math.sin(THREE.Math.degToRad((theta += 0.01)))
    const s = Math.cos(THREE.Math.degToRad(theta * 2))
    group.current.rotation.set(r, r, r)
    group.current.scale.set(s, s, s)
  })

  const [geo, mat, coords] = useMemo(() => {
    const geo = new THREE.SphereBufferGeometry(1, 10, 10)
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightpink') })
    const coords = new Array(1000)
      .fill()
      .map(i => [Math.random() * 800 - 400, Math.random() * 800 - 400, Math.random() * 800 - 400])
    return [geo, mat, coords]
  }, [])

  return (
    <group ref={group}>
      {coords.map(([p1, p2, p3], i) => (
        <mesh key={i} geometry={geo} material={mat} position={[p1, p2, p3]} />
      ))}
    </group>
  )
}

export default function App() {
  return (
    <>
      <Canvas style={{ background: '#272727' }}>
        <ambientLight color="lightblue" />
        <pointLight color="white" intensity={1} position={[10, 10, 10]} />
        <Stars />
        <Thing />
      </Canvas>
    </>
  )
}
