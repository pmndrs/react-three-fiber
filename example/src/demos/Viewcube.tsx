import * as THREE from 'three'
import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'

function Viewcube() {
  const { gl, scene, camera, viewport } = useThree()
  const virtualScene = useMemo(() => new THREE.Scene(), [])
  const virtualCam = useRef()
  const ref = useRef<any>(null!)
  const [hover, set] = useState(false)
  const matrix = new THREE.Matrix4()

  useFrame(() => {
    matrix.copy(camera.matrix).invert()
    ref.current.quaternion.setFromRotationMatrix(matrix)
    gl.autoClear = true
    gl.render(scene, camera)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(virtualScene, camera)
  }, 1)

  return (
    <>
      (
      {createPortal(
        <>
          <mesh
            ref={ref}
            position={[viewport.width / 2 - 2, viewport.height / 2 - 2, 0]}
            onPointerOut={(e) => set(false)}
            onPointerMove={(e) => set(true)}>
            <meshBasicMaterial color={hover ? 'hotpink' : 'white'} />
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        </>,
        virtualScene,
      )}
      )
    </>
  )
}

export default function App() {
  return (
    <Canvas>
      <mesh>
        <torusGeometry args={[1, 0.5, 32, 100]} />
        <meshNormalMaterial />
      </mesh>
      <Viewcube />
    </Canvas>
  )
}
