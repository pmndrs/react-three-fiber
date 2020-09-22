import React, { Suspense } from 'react'

import { Setup } from '../Setup'
import { OrbitControls } from '../../src/controls/OrbitControls'
import { PositionalAudio } from '../../src/abstractions/PositionalAudio'

export default {
  title: 'Abstractions/PositionalAudio',
  component: PositionalAudioScene,
  decorators: [(storyFn) => <Setup cameraPosition={[0, 0, 20]}>{storyFn()}</Setup>],
}

function PositionalAudioScene() {
  const args = [
    {
      position: [10, 0, 10],
      url: 'sounds/1.mp3',
    },
    {
      position: [-10, 0, 10],
      url: 'sounds/2.mp3',
    },
    {
      position: [10, 0, -10],
      url: 'sounds/3.mp3',
    },
    {
      position: [-10, 0, -10],
      url: 'sounds/4.mp3',
    },
  ]

  return (
    <>
      <Suspense fallback={null}>
        <group position={[0, 0, 5]}>
          {args.map(({ position, url }, index) => (
            <mesh key={`0${index}`} position={position}>
              <sphereBufferGeometry attach="geometry" />
              <meshBasicMaterial wireframe attach="material" color="hotpink" />
              <PositionalAudio url={url} />
            </mesh>
          ))}
        </group>
      </Suspense>
      <OrbitControls />
    </>
  )
}

export const PositionalAudioSceneSt = () => <PositionalAudioScene />
PositionalAudioSceneSt.story = {
  name: 'Default',
}
