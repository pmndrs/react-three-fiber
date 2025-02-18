import { OrbitControls } from '@react-three/drei'
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

function Viewcube() {
  const { gl, scene: defaultScene, camera: defaultCamera, size, events } = useThree()
  const scene = useMemo(() => new THREE.Scene(), [])
  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000), [])

  useLayoutEffect(() => {
    camera.left = -size.width / 2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = -size.height / 2
    camera.position.set(0, 0, 100)
    camera.updateProjectionMatrix()
  }, [size])

  const ref = useRef<THREE.Mesh>(null!)
  const [hover, setHover] = useState<number | null>(null)
  const matrix = new THREE.Matrix4()

  useFrame(() => {
    matrix.copy(defaultCamera.matrix).invert()
    ref.current.quaternion.setFromRotationMatrix(matrix)
    gl.autoClear = true
    gl.render(defaultScene, defaultCamera)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(scene, camera)
  }, 1)

  return (
    <>
      {createPortal(
        <group>
          <mesh
            ref={ref}
            position={[size.width / 2 - 120, size.height / 2 - 120, 0]}
            onPointerOut={(e) => setHover(null)}
            onPointerMove={(e) => setHover(Math.floor((e.faceIndex || 0) / 2))}>
            {[...Array(6)].map((_, index) => (
              <meshLambertMaterial
                attach={`material-${index}`}
                key={index}
                color={hover === index ? 'hotpink' : 'white'}
              />
            ))}
            <boxGeometry args={[80, 80, 80]} />
          </mesh>
          <ambientLight intensity={0.5 * Math.PI} />
          <pointLight decay={0} position={[10, 10, 10]} intensity={0.5} />
        </group>,
        scene,
        { camera, events: { priority: events.priority + 1 } },
      )}
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
      <OrbitControls />
    </Canvas>
  )
}
