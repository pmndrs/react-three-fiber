import React, { useRef, useEffect } from 'react'
import { Canvas, useThree, useFrame, invalidate } from 'react-three-fiber'
import create from 'zustand'

const [useStore] = create(set => ({
  isPaused: false,
  pause: () => set({ isPaused: true }),
  play: () => set({ isPaused: false }),
}))

const Cube = () => {
  const ref = useRef()
  useFrame(() => (ref.current.rotation.z += 0.01))
  return (
    <mesh ref={ref}>
      <meshBasicMaterial attach="material" color="hotpink" />
      <boxBufferGeometry attach="geometry" />
    </mesh>
  )
}

export default function App() {
  const { isPaused, pause, play } = useStore()
  //useEffect(() => void invalidate())
  return (
    <>
      <div class="counter">
        <span>Paused? {isPaused ? 'Yes' : 'No'}</span> <br /> <br />
        <button onClick={pause}>pause</button>
        <button onClick={play}>play</button>
      </div>
      <Canvas invalidateFrameloop={isPaused}>
        <Cube />
      </Canvas>
    </>
  )
}
