import * as THREE from 'three'
import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, extend, useFrame, useThree, createPortal, useCamera } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls })

function Controls() {
  const controls = useRef()
  const { scene, camera, gl } = useThree()
  useFrame(() => controls.current.update())
  return (
    <orbitControls ref={controls} args={[camera, gl.domElement]} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
  )
}

function Viewcube() {
  const { mouse, gl, camera, size,scene } = useThree()
  const virtualScene = useMemo(() => new THREE.Scene(), [])
  const virtualCam = useMemo(() => new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000), [])
  useMemo(() => {
    virtualCam.position.z = 200
    virtualCam.left = size.width / -2
    virtualCam.right = size.width / 2
    virtualCam.top = size.height / 2
    virtualCam.bottom = size.height / -2
    virtualCam.updateProjectionMatrix()
  }, [size])

  const ref = useRef()
  const matrix = new THREE.Matrix4()

  useFrame(() => {
    matrix.getInverse(camera.matrix)
    ref.current.quaternion.setFromRotationMatrix(matrix)
    gl.autoClear = true
    gl.render(scene, camera)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(virtualScene, virtualCam)
  }, 1)

  return createPortal(
    <mesh
      ref={ref}
      raycast={useCamera(virtualCam)}
      position={[size.width / 2 - 80, size.height / 2 - 80, 0]}
      onPointerMove={e => console.log('ah')}>
      <meshNormalMaterial attach="material" />
      <boxBufferGeometry attach="geometry" args={[60, 60, 60]} />
    </mesh>,
    virtualScene
  )
}

export default function() {
  return (
    <Canvas style={{ background: '#272730' }}>
      <mesh>
        <dodecahedronBufferGeometry attach="geometry" args={[1, 0]} />
        <meshNormalMaterial attach="material" />
      </mesh>
      <Controls />
      <Viewcube />
    </Canvas>
  )
}
