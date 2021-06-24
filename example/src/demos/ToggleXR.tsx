import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { VRButton } from 'three-stdlib'

function MovingMesh() {
  const mesh = useRef<THREE.Mesh>(null)
  const { gl, vr } = useThree()
  const setVR = useThree((state) => state.setVR)

  // Enable VR when user requests a session
  useEffect(() => {
    const xr = gl.xr as any
    const handleSessionChange = () => setVR(xr.isPresenting)
    xr.addEventListener('sessionstart', handleSessionChange)
    xr.addEventListener('sessionend', handleSessionChange)
  }, [gl, setVR])

  useFrame(({ clock }) => {
    if (mesh.current) {
      mesh.current.position.x = Math.sin(clock.getElapsedTime())
    }
  })

  return (
    <mesh ref={mesh} onClick={() => setVR(!vr)} position-z={-3}>
      <boxBufferGeometry args={[2, 2, 2]} />
      {vr ? <meshNormalMaterial /> : <meshBasicMaterial />}
    </mesh>
  )
}

export default function App() {
  const [vr, setVR] = useState(false)
  return (
    <>
      <div style={{ position: 'absolute', zIndex: 2, padding: '1rem' }}>
        <button onClick={() => setVR(!vr)}>Toggle canvas VR prop ({vr ? 'on' : 'off'})</button>
        <p>
          <a href="https://blog.mozvr.com/webxr-emulator-extension/">Install webXR emulator</a>
        </p>
        <pre>{`
  <Canvas
    vr={${vr}}
    frameloop="demand"
  />
        `}</pre>
      </div>
      <Canvas
        vr={vr}
        frameloop="demand"
        style={{ zIndex: 1 }}
        onCreated={({ gl }) => {
          const vrBtn = VRButton.createButton(gl)
          vrBtn.style.zIndex = '99999'
          document.body.appendChild(vrBtn)
        }}>
        <MovingMesh />
      </Canvas>
    </>
  )
}
