import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { useSpring, animated } from 'react-spring/three'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { OrbitControls } from '../resources/controls/OrbitControls'
apply({ OrbitControls })

function Content() {
  const camera = useContext(cameraContext)
  const scene = useRef()
  useRender(({ gl }) => void ((gl.autoClear = true), gl.render(scene.current, camera)), true)
  return (
    <scene ref={scene}>
      <mesh>
        <sphereBufferGeometry name="geometry" args={[1, 64, 64]} />
        <meshBasicMaterial name="material" color="white" />
      </mesh>
    </scene>
  )
}

function HeadsUpDisplay() {
  const camera = useContext(cameraContext)
  const scene = useRef()
  useRender(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)))
  return (
    <scene ref={scene}>
      <mesh>
        <sphereBufferGeometry name="geometry" args={[0.5, 64, 64]} />
        <meshBasicMaterial name="material" color="black" />
      </mesh>
    </scene>
  )
}

const cameraContext = React.createContext()
function Main() {
  const { width, height } = useThree().size
  const camera = useRef()
  return (
    <>
      <perspectiveCamera
        ref={camera}
        aspect={width / height}
        radius={(width + height) / 4}
        fov={100}
        position={[0, 0, 5]}
        onUpdate={self => self.updateProjectionMatrix()}
      />
      {camera.current && (
        <cameraContext.Provider value={camera.current}>
          <orbitControls args={[camera.current]} enableDamping />
          <Content />
          <HeadsUpDisplay />
        </cameraContext.Provider>
      )}
    </>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#272727' }}>
      <Main />
    </Canvas>
  )
}
