import React, { useMemo } from 'react'
import { Canvas } from 'react-three-fiber'

import { Icosahedron } from '../../src/shapes'
import { PerspectiveCamera } from '../../src/PerspectiveCamera'
import { OrbitControls } from '../../src/OrbitControls'

export default {
  title: 'Camera/PerspectiveCamera',
  component: PerspectiveCameraScene,
}

const NUM = 3

function PerspectiveCameraScene() {
  const positions = useMemo(() => {
    const pos = []
    const half = (NUM - 1) / 2

    for (let x = 0; x < NUM; x++) {
      for (let y = 0; y < NUM; y++) {
        pos.push({
          id: `${x}-${y}`,
          position: [(x - half) * 4, (y - half) * 4, 0],
        })
      }
    }

    return pos
  }, [])

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} />
      <group position={[0, 0, -10]}>
        {positions.map(({ id, position }) => (
          <Icosahedron key={id} position={position} args={[1, 1]}>
            <meshBasicMaterial attach="material" color="white" wireframe />
          </Icosahedron>
        ))}
      </group>
      <OrbitControls />
    </Canvas>
  )
}

export const PerspectiveCameraSceneSt = () => <PerspectiveCameraScene />
PerspectiveCameraSceneSt.story = {
  name: 'Default',
}
