import * as React from 'react'
import { Canvas, useFrame } from 'react-three-fiber'

const CanvasStyle = {
  width: '100%',
  height: '50%',
}

const args = [1, 1, 1]

const Obj = () => {
  const meshRef = React.useRef()
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.03
    }
  })
  return (
    <mesh ref={meshRef}>
      <boxBufferGeometry attach="geometry" args={args} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}
const SpinningScene = () => (
  <div style={CanvasStyle}>
    <Canvas>
      <Obj />
    </Canvas>
  </div>
)

const StaticScene = () => (
  <div style={CanvasStyle}>
    <Canvas>
      <mesh>
        <boxBufferGeometry attach="geometry" args={args} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </Canvas>
  </div>
)

const style = { width: '100%', height: '100%' }
/** Main component */
function MultiRenderer() {
  const [secondScene, setSecondScene] = React.useState(false)

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setSecondScene(true), 2000)
    return () => { window.clearTimeout(timeout) }
  }, [])

  return (
    <div style={style}>
      <SpinningScene />
      {secondScene && <StaticScene />}
    </div>
  )
}

export default React.memo(MultiRenderer)
