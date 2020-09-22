import * as THREE from 'three'
import React, { useRef, useState, useCallback } from 'react'
import { EffectComposer, Outline, SelectiveBloom } from 'react-postprocessing'
import { Canvas, useFrame } from 'react-three-fiber'
import { Sphere, Box } from 'drei'

import { Mesh } from 'three'

import toggle from './toggle'

export default function App() {
  return (
    <Canvas>
      <Selection />
    </Canvas>
  )
}

export function Selection() {
  const box1Ref = useRef<typeof Mesh>()
  const box2Ref = useRef<typeof Mesh>()
  const [outlineSelection, setOutlineSelection] = useState<React.MutableRefObject<typeof Mesh>[]>([box1Ref, box2Ref])

  const toggleOutline = useCallback((item) => {
    setOutlineSelection((state) => toggle(state, item))
  }, [])

  const sphere1Ref = useRef<typeof Mesh>()
  const sphere2Ref = useRef<typeof Mesh>()
  const [bloomSelection, setBloomSelection] = useState<React.MutableRefObject<typeof Mesh>[]>([sphere1Ref])

  const toggleBloom = useCallback((item) => {
    setBloomSelection((state) => toggle(state, item))
  }, [])

  const lightRef = useRef(null)

  useFrame(({ clock }) => {
    lightRef.current!.position.y = Math.sin(clock.getElapsedTime())
  })

  return (
    <>
      <color attach="background" args={['black']} />
      <fog color={new THREE.Color('#161616')} attach="fog" near={8} far={30} />

      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} ref={lightRef} intensity={1} />

      <Box ref={box1Ref} onClick={() => toggleOutline(box1Ref)} position={[1, 1, 1]}>
        <meshNormalMaterial attach="material" />
      </Box>
      <Box ref={box2Ref} onClick={() => toggleOutline(box2Ref)} position={[-1, 1, 0.5]} rotation-z={0.2}>
        <meshNormalMaterial attach="material" />
      </Box>

      <Sphere args={[0.5, 32, 32]} position={[1, -1, 1]} ref={sphere1Ref} onClick={() => toggleBloom(sphere1Ref)}>
        <meshLambertMaterial color="white" />
      </Sphere>

      <Sphere args={[0.5, 32, 32]} position={[-1, -1, 1]} ref={sphere2Ref} onClick={() => toggleBloom(sphere2Ref)}>
        <meshLambertMaterial color="white" />
      </Sphere>

      <EffectComposer>
        <Outline selection={outlineSelection} visibleEdgeColor="blue" edgeStrength={10} pulseSpeed={1} blur={true} />
        <SelectiveBloom lights={[lightRef]} selectionLayer={11} selection={bloomSelection} luminanceThreshold={0.1} />
      </EffectComposer>
    </>
  )
}
