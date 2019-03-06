import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback } from 'react'
import { useSpring, animated } from 'react-spring/three'
import { Canvas, useRender, useThree } from 'react-three-fiber'

function Hud() {
  const scene = useRef()
  const hud = useRef()
  const camera = useRef()
  const {
    aspect,
    size: { width, height },
  } = useThree()
  const [data, set] = useState({ aspect: 0, radius: 0 })
  useEffect(() => void set({ aspect, radius: (width + height) / 4 }), [width, height])

  useRender(({ gl }) => {
    gl.autoClear = true
    gl.render(scene.current, camera.current)
    gl.autoClear = false
    gl.clearDepth()
    gl.render(hud.current, camera.current)
  }, true)

  return (
    <>
      <scene ref={scene}>
        <perspectiveCamera {...data} ref={camera} position={[0, 0, 5]} onUpdate={s => s.updateProjectionMatrix()} />
        <mesh>
          <sphereBufferGeometry name="geometry" args={[1, 64, 64]} />
          <meshBasicMaterial name="material" color="white" />
        </mesh>
      </scene>
      <scene ref={hud}>
        <mesh>
          <sphereBufferGeometry name="geometry" args={[0.5, 64, 64]} />
          <meshBasicMaterial name="material" color="black" />
        </mesh>
      </scene>
    </>
  )
}

export default function App() {
  const scene = useRef()
  const hud = useRef()
  const camera = useRef()
  const [data, set] = useState({ aspect: 0, radius: 0 })
  return (
    <>
      <Canvas style={{ background: '#272727' }}>
        <Hud />
      </Canvas>
    </>
  )
}
