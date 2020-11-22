import * as React from 'react'
import { Canvas, extend, useFrame, useThree } from '../../../../src/targets/svg'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls })

function Controls() {
  const controls = React.useRef()
  const { camera, gl } = useThree()
  useFrame(() => controls.current.update())
  const args = React.useMemo(() => [camera, gl.domElement], [camera, gl.domElement])

  return <orbitControls ref={controls} args={args} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
}

const args = [10, 3, 100, 16]

function TorusKnot() {
  let ref = React.useRef()
  let t = 0
  useFrame(() => {
    ref.current.rotation.set(t, t, t)
    t += 0.001
  })
  return (
    <mesh ref={ref}>
      <torusKnotGeometry attach="geometry" args={args} />
      <meshBasicMaterial attach="material" color="hotpink" />
    </mesh>
  )
}

const style = { background: '#272730' }
const camera = { position: [0, 0, 50] }

function SVGRenderer() {
  return (
    <Canvas style={style} camera={camera}>
      <TorusKnot />
      <Controls />
    </Canvas>
  )
}

export default React.memo(SVGRenderer)
