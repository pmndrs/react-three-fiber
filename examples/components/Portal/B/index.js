import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas } from 'react-three-fiber'
import { useStore } from './store'

export default function App() {
  const plugins = useStore(state => state.plugins)
  const views = useStore(state => state.views)
  const { connectPlugin } = useStore(state => state.actions)
  useEffect(() => {
    setTimeout(() => connectPlugin('Blend', React.lazy(() => import('./plugins/Blend'))), 1000)
    setTimeout(() => {
      const unsub = connectPlugin('Sketch', React.lazy(() => import('./plugins/Sketch')))
      setTimeout(unsub, 3000)
    }, 2000)
  }, [])

  return (
    <>
      {/* UI View */}
      <div style={{ position: 'absolute', top: 0, color: 'white' }}>
        <Suspense fallback={null}>
          {Object.values(plugins).map(({ id, root: Plugin }) => (
            <Plugin key={id} id={id} />
          ))}
        </Suspense>
      </div>
      {/* 3D View */}
      <Canvas>
        <ambientLight color="lightblue" />
        <pointLight color="white" intensity={1} position={[10, 10, 10]} />
        <mesh>
          <meshStandardMaterial attach="material" color="#373737" />
          <octahedronGeometry attach="geometry" />
        </mesh>
        {Object.values(views).map(({ id, root: Plugin }) => (
          <Plugin key={id} />
        ))}
      </Canvas>
    </>
  )
}
