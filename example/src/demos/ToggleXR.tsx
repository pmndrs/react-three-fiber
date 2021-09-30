import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { VRButton } from 'three-stdlib'

function MovingMesh() {
  const mesh = useRef<THREE.Mesh>(null)
  const { gl, xr } = useThree()
  const setXR = useThree((state) => state.setXR)

  // Enable XR when user requests a session
  useEffect(() => {
    const handleSessionChange = () => setXR(gl.xr.isPresenting)
    gl.xr.addEventListener('sessionstart', handleSessionChange)
    gl.xr.addEventListener('sessionend', handleSessionChange)
  }, [gl.xr, setXR])

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.position.x = Math.sin(clock.getElapsedTime())
    }
  })

  return (
    <mesh ref={mesh} onClick={() => setXR(!xr)} position-z={-3}>
      <boxBufferGeometry args={[2, 2, 2]} />
      {xr ? <meshNormalMaterial /> : <meshBasicMaterial />}
    </mesh>
  )
}

export default function App() {
  const [xr, setXR] = useState(false)
  return (
    <>
      <Canvas
        xr={xr}
        frameloop="demand"
        style={{ position: 'absolute' }}
        onCreated={({ gl }) => void document.body.appendChild(VRButton.createButton(gl))}>
        <MovingMesh />
      </Canvas>
      <div style={{ position: 'relative', padding: '1rem' }}>
        <button onClick={() => setXR(!xr)}>Toggle canvas XR prop ({xr ? 'on' : 'off'})</button>
        <p>
          <a href="https://blog.mozvr.com/webxr-emulator-extension/">Install webXR emulator</a>
        </p>
        <pre>{`
  <Canvas
    xr={${xr}}
    frameloop="demand"
  />
        `}</pre>
      </div>
    </>
  )
}
