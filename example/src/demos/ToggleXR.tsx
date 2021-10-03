import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

function MovingMesh({ xr }) {
  const mesh = useRef<THREE.Mesh>(null)
  const { gl } = useThree()

  useEffect(() => {
    gl.xr.isPresenting = xr
  }, [gl.xr, xr])

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.position.x = Math.sin(clock.getElapsedTime())
    }
  })

  return (
    <mesh ref={mesh} position-z={-3}>
      <boxBufferGeometry args={[2, 2, 2]} />
      {gl.xr.isPresenting ? <meshNormalMaterial /> : <meshBasicMaterial />}
    </mesh>
  )
}

export default function App() {
  const [xr, setXR] = useState(false)
  return (
    <>
      <Canvas frameloop="demand" style={{ position: 'absolute' }}>
        <MovingMesh xr={xr} />
      </Canvas>
      <div style={{ position: 'relative', padding: '1rem' }}>
        <p>
          Press this, save <pre style={{ display: 'inline-block', padding: '0.2em' }}>example/src/ToggleXR</pre> then
          freely toggle this button.
        </p>
        <button onClick={() => setXR(!xr)}>Toggle WebXR</button>
      </div>
    </>
  )
}
