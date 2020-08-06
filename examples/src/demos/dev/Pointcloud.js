import React, { useMemo, useRef, useCallback } from 'react'
import { Canvas, extend, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls })

function Particles({ pointCount }) {
  const [positions, colors] = useMemo(() => {
    let positions = [],
      colors = []
    for (let i = 0; i < pointCount; i++) {
      positions.push(5 - Math.random() * 10)
      positions.push(5 - Math.random() * 10)
      positions.push(5 - Math.random() * 10)
      colors.push(1)
      colors.push(0.5)
      colors.push(0.5)
    }
    return [new Float32Array(positions), new Float32Array(colors)]
  }, [pointCount])

  const attrib = useRef()
  const hover = useCallback((e) => {
    e.stopPropagation()
    attrib.current.array[e.index * 3] = 1
    attrib.current.array[e.index * 3 + 1] = 1
    attrib.current.array[e.index * 3 + 2] = 1
    attrib.current.needsUpdate = true
  }, [])

  const unhover = useCallback((e) => {
    attrib.current.array[e.index * 3] = 1
    attrib.current.array[e.index * 3 + 1] = 0.5
    attrib.current.array[e.index * 3 + 2] = 0.5
    attrib.current.needsUpdate = true
  }, [])

  return (
    <points onPointerOver={hover} onPointerOut={unhover}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          ref={attrib}
          attachObject={['attributes', 'color']}
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial attach="material" vertexColors size={10} sizeAttenuation={false} />
    </points>
  )
}

function Controls() {
  const controls = useRef()
  const { camera, gl } = useThree()
  useFrame(() => controls.current.update())
  return (
    <orbitControls ref={controls} args={[camera, gl.domElement]} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
  )
}

export default function App() {
  return (
    <Canvas orthographic camera={{ zoom: 60 }} raycaster={{ params: { Points: { threshold: 0.2 } } }}>
      <Particles pointCount={100} />
      <Controls />
    </Canvas>
  )
}
