import * as THREE from 'three'
import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function Viewcube() {
  const { gl, scene, camera, size } = useThree()
  const virtualScene = useMemo(() => new THREE.Scene(), [])
  const virtualCam = useRef<THREE.OrthographicCamera>(null!)
  const ref = useRef<THREE.Mesh>(null!)
  const [hover, set] = useState<number | null>(null)
  const matrix = new THREE.Matrix4()

  useFrame(() => {
    matrix.copy(camera.matrix).invert()
    ref.current.quaternion.setFromRotationMatrix(matrix)
    gl.autoClear = true
    gl.render(scene, camera)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(virtualScene, virtualCam.current)
  }, 1)

  return createPortal(
    <>
      <orthographicCamera
        ref={virtualCam}
        left={-size.width / 2}
        right={size.width / 2}
        top={size.height / 2}
        bottom={-size.height / 2}
        position={[0, 0, 100]}
        onUpdate={(self) => self.updateProjectionMatrix()}
      />
      <mesh
        ref={ref}
        position={[size.width / 2 - 80, size.height / 2 - 80, 0]}
        onPointerOut={(e) => set(null)}
        onPointerMove={(e) => set(Math.floor((e.faceIndex || 0) / 2))}>
        {[...Array(6)].map((_, index) => (
          <meshLambertMaterial attach={`material-${index}`} key={index} color={hover === index ? 'hotpink' : 'white'} />
        ))}
        <boxGeometry args={[60, 60, 60]} />
      </mesh>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </>,
    virtualScene,
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
      <OrbitControls />
    </Canvas>
  )
}
