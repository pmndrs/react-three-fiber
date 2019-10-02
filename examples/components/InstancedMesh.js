import * as THREE from 'three'
import React, { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame, useLoader } from 'react-three-fiber'
import suzanne from 'file-loader!../resources/gltf/suzanne.blob'

const dummy = new THREE.Object3D()
function Suzanne() {
  // Load async model
  const [geometry] = useLoader(THREE.BufferGeometryLoader, suzanne)
  // When we're here it's loaded, now compute vertex normals
  useMemo(() => {
    geometry.computeVertexNormals()
    geometry.scale(0.5, 0.5, 0.5)
  }, [geometry])
  // Compute per-frame instance positions
  const ref = useRef()
  useFrame(state => {
    const time = state.clock.getElapsedTime()
    ref.current.rotation.x = Math.sin(time / 4)
    ref.current.rotation.y = Math.sin(time / 2)
    let i = 0
    for (let x = 0; x < 10; x++)
      for (let y = 0; y < 10; y++)
        for (let z = 0; z < 10; z++) {
          dummy.position.set(5 - x, 5 - y, 5 - z)
          dummy.rotation.y = Math.sin(x / 4 + time) + Math.sin(y / 4 + time) + Math.sin(z / 4 + time)
          dummy.rotation.z = dummy.rotation.y * 2
          dummy.updateMatrix()
          ref.current.setMatrixAt(i++, dummy.matrix)
        }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[geometry, null, 1000]}>
      <meshNormalMaterial attach="material" />
    </instancedMesh>
  )
}

export default function() {
  return (
    <Canvas camera={{ position: [0, 0, 15] }}>
      <Suspense fallback={null}>
        <Suzanne />
      </Suspense>
    </Canvas>
  )
}
