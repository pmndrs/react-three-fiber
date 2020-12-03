import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, extend, useFrame, useThree } from '../../../../src/targets/svg'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls })

function Controls() {
  const controls = useRef()
  const { scene, camera, gl } = useThree()
  useFrame(() => controls.current.update())
  return (
    <orbitControls ref={controls} args={[camera, gl.domElement]} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
  )
}

function TorusKnot() {
  let ref = useRef()
  let t = 0
  useFrame(() => {
    ref.current.rotation.set(t, t, t)
    t += 0.001
  })
  return (
    <mesh ref={ref}>
      <torusKnotGeometry attach="geometry" args={[10, 3, 100, 16]} />
      <meshBasicMaterial attach="material" color="hotpink" />
    </mesh>
  )
}

export default function () {
  return (
    <Canvas style={{ background: '#272730' }} camera={{ position: [0, 0, 50] }}>
      <TorusKnot />
      <Controls />
    </Canvas>
  )
}
