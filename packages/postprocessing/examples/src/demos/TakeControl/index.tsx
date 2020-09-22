import React, { Suspense } from 'react'
import { Canvas } from 'react-three-fiber'
import { Html, Stats } from 'drei'
import Effects from './Effects'
import Scene from './Scene'
import { Controls } from 'react-three-gui'
import { ControlsContainer } from './styles'
import { LoadingMsg } from '../../styles'

function TakeControl() {
  const showControls = window.location.search.includes('ctrl')

  return (
    <>
      <Canvas
        shadowMap
        colorManagement
        camera={{ position: [0, 0, 3], far: 1000, fov: 70 }}
        gl={{
          powerPreference: 'high-performance',
          alpha: false,
          antialias: false,
          stencil: false,
          depth: false,
        }}
      >
        {showControls && <Stats />}

        <Effects />
        <Suspense
          fallback={
            <Html center>
              <LoadingMsg>Loading...</LoadingMsg>
            </Html>
          }
        >
          <Scene />
        </Suspense>
      </Canvas>

      {showControls && (
        <ControlsContainer>
          <Controls />
        </ControlsContainer>
      )}
    </>
  )
}

export default TakeControl
