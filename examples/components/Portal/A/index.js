import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, createPortal } from 'react-three-fiber'
import { useStore } from './store'
import { Layout as SketchLayout, View as SketchView } from './plugins/Sketch'
import { Layout as BlendLayout, View as BlendView } from './plugins/Blend'

export default function App() {
  const plugins = useStore(state => state.plugins)
  const createPlugin = useStore(state => state.createPlugin)
  useEffect(() => {
    setTimeout(() => createPlugin('Sketch', SketchLayout, SketchView), 1000)
    setTimeout(() => createPlugin('Blend', BlendLayout, BlendView), 2000)
  }, [])

  return (
    <>
      {/* UI View */}
      <div style={{ position: 'absolute', top: 0, color: 'white' }}>
        {Object.entries(plugins).map(([id, { uiRoot: Component }]) => (
          <Component key={id} id={id} />
        ))}
      </div>
      {/* 3D View */}
      <Canvas>
        <ambientLight color="lightblue" />
        <pointLight color="white" intensity={1} position={[10, 10, 10]} />
        <mesh>
          <meshStandardMaterial attach="material" color="#373737" />
          <octahedronGeometry attach="geometry" />
        </mesh>
        {Object.entries(plugins).map(([id, { threeRoot: Component }]) => (
          <Component key={id} id={id} />
        ))}
      </Canvas>
    </>
  )
}
