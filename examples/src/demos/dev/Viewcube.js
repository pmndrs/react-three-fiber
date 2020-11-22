import * as React from 'react'
import { Scene, Matrix4 } from 'three'
import { Canvas, useFrame, createPortal, useThree } from 'react-three-fiber'
import { OrbitControls, OrthographicCamera, useCamera } from 'drei'

const orthographicCameraPosition = [0, 0, 100]
const pointLightPosition = [10, 10, 10]
const boxBufferGeometryArgs = [60, 60, 60]
const torusBufferGeometryArgs = [1, 0.5, 32, 100]

function Cube() {
  const { gl, scene, camera, size } = useThree()
  const [virtualScene] = React.useState(() => new Scene())
  const virtualCam = React.useRef()
  const ref = React.useRef()
  const [hover, set] = React.useState(null)
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

  const raycast = useCamera(virtualCam)

  const position = React.useMemo(() => [size.width / 2 - 80, size.height / 2 - 80, 0], [size.width, size.height])

  const onPointerOver = React.useCallback(function callback(e) {
    e.stopPropagation()
    set(null)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    set(Math.floor(e.faceIndex / 2))
  }, [])

  return createPortal(
    <>
      <OrthographicCamera ref={virtualCam} makeDefault={false} position={orthographicCameraPosition} />
      <mesh ref={ref} raycast={raycast} position={position} onPointerOut={onPointerOver} onPointerMove={onPointerOut}>
        {[...Array(6)].map((_, index) => (
          <meshLambertMaterial attachArray="material" key={index} color={hover === index ? 'hotpink' : 'white'} />
        ))}
        <boxBufferGeometry args={boxBufferGeometryArgs} />
      </mesh>
      <ambientLight intensity={0.5} />
      <pointLight position={pointLightPosition} intensity={0.5} />
    </>,
    virtualScene
  )
}

function ViewCube() {
  return (
    <Canvas invalidateFrameloop>
      <mesh>
        <torusBufferGeometry args={torusBufferGeometryArgs} />
        <meshNormalMaterial />
      </mesh>
      <OrbitControls screenSpacePanning />
      <Cube />
    </Canvas>
  )
}

export default React.memo(ViewCube)
