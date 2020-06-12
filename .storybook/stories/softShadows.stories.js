import React, { useRef } from 'react'

import { Setup } from '../Setup'

import { Plane, Sphere } from '../../src/shapes'

import { softShadows } from '../../src/softShadows'
import { useFrame } from 'react-three-fiber'

softShadows()

export default {
  title: 'Abstractions.softShadows',
  component: softShadows,
  decorators: [(storyFn) => <Setup> {storyFn()}</Setup>],
}

function SoftShadowsScene() {
  const sphere = useRef()

  useFrame(({ clock }) => {
    sphere.current.position.y = Math.sin(clock.getElapsedTime()) + 2
  })

  return (
    <>
      <fog attach="fog" args={['white', 0, 40]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[2.5, 8, 5]}
        intensity={1.5}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <pointLight position={[-10, 0, -20]} color="red" intensity={2.5} />
      <pointLight position={[0, -10, 0]} intensity={1.5} />

      <Sphere ref={sphere} castShadow receiveShadow args={[1, 24, 24]}>
        <meshPhongMaterial color="royalblue" roughness={0} metalness={0.1} attach="material" />
      </Sphere>

      <Plane receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.5, 0]} args={[10, 10, 4, 4]}>
        <shadowMaterial attach="material" opacity={0.5} />
      </Plane>
      <Plane rotation-x={-Math.PI / 2} position={[0, -0.5, 0]} args={[10, 10, 4, 4]}>
        <meshBasicMaterial attach="material" opacity={0.5} />
      </Plane>
    </>
  )
}

export const SoftShadowsSt = () => {
  return <SoftShadowsScene />
}

SoftShadowsSt.story = {
  name: 'Default',
}
