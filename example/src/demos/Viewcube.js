import { Scene, Matrix4 } from 'three'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, createPortal, useThree } from 'react-three-fiber'
import { OrbitControls, OrthographicCamera, useCamera } from 'drei'

function Viewcube() {
  const { gl, scene, camera, size } = useThree()
  const [virtualScene] = useState(() => new Scene())
  const virtualCam = useRef()
  const ref = useRef()
  const [hover, set] = useState(null)
  const matrix = new Matrix4()
  useFrame(() => {
    matrix.getInverse(camera.matrix)
    ref.current.quaternion.setFromRotationMatrix(matrix)
    gl.autoClear = true
    gl.render(scene, camera)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(virtualScene, virtualCam.current)
  }, 1)

  return createPortal(
    <>
      <OrthographicCamera ref={virtualCam} makeDefault={false} position={[0, 0, 100]} />
      <mesh
        ref={ref}
        raycast={useCamera(virtualCam)}
        position={[size.width / 2 - 80, size.height / 2 - 80, 0]}
        onPointerOut={(e) => set(null)}
        onPointerMove={(e) => set(Math.floor(e.faceIndex / 2))}
      >
        {[...Array(6)].map((_, index) => (
          <meshLambertMaterial attachArray="material" key={index} color={hover === index ? 'hotpink' : 'white'} />
        ))}
        <boxBufferGeometry args={[60, 60, 60]} />
      </mesh>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
    </>,
    virtualScene
  )
}

export default function App() {
  return (
    <Canvas invalidateFrameloop>
      <mesh>
        <torusBufferGeometry args={[1, 0.5, 32, 100]} />
        <meshNormalMaterial />
      </mesh>
      <OrbitControls screenSpacePanning />
      <Viewcube />
    </Canvas>
  )
}
