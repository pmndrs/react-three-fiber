import * as THREE from 'three'
import React, { useCallback, useMemo } from 'react'
import { Canvas } from 'react-three-fiber'

function Test() {
  const vertices = useMemo(
    () =>
      new Float32Array([-1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0])
  )
  const update = useCallback(self => {
    self.needsUpdate = true
    self.parent.computeBoundingSphere()
  }, [])

  return (
    <mesh>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attachObject={['attributes', 'position']}
          array={vertices}
          count={6}
          itemSize={3}
          onUpdate={update}
        />
      </bufferGeometry>
      <meshBasicMaterial attach="material" color="white" />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <Test />
    </Canvas>
  )
}
