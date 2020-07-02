import React, { Suspense } from 'react'

import { Setup } from '../Setup'
import { OrbitControls } from '../../src/OrbitControls'
import { PositionalAudio } from '../../src/PositionalAudio'
import audio1 from '../sounds/1.mp3'
import audio2 from '../sounds/2.mp3'
import audio3 from '../sounds/3.mp3'
import audio4 from '../sounds/4.mp3'

export default {
    title: 'Abstractions.PositionalAudio',
    component: PositionalAudioScene,
    decorators: [(storyFn) => <Setup cameraPosition={[0, 0, 20]}>{storyFn()}</Setup>],
}

function PositionalAudioScene() {
    const args = [
        {
          position: [10, 0, 10],
          url: audio1
        },
        {
          position: [-10, 0, 10],
          url: audio2
        },
        {
          position: [10, 0, -10],
          url: audio3
        },
        {
          position: [-10, 0, -10],
          url: audio4
        }
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