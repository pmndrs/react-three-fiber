import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas } from 'react-three-fiber'
import { useStore, api } from './store'

class ErrorBoundary extends React.Component {
  state = { hasError: false }
  static getDerivedStateFromError = () => ({ hasError: true })
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

function Plugin({ id }) {
  const { root: Component } = useStore(state => state.plugins[id])
  return (
    <Suspense fallback={null}>
      <Component id={id} />
    </Suspense>
  )
}

function View({ id }) {
  const view = useStore(state => state.views[id])
  return view && view.ref.current ? view.ref.current : null
}

export default function App() {
  const plugins = useStore(state => state.plugin_ids)
  const views = useStore(state => state.view_ids)
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
        {plugins.map(id => (
          <ErrorBoundary key={id}>
            <Plugin id={id} />
          </ErrorBoundary>
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
        {views.map(id => (
          <ErrorBoundary key={id}>
            <View id={id} />
          </ErrorBoundary>
        ))}
      </Canvas>
    </>
  )
}
