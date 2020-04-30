import { useState, useEffect } from 'react'
import { useFrame } from 'react-three-fiber'
// @ts-ignore
import StatsImpl from 'stats.js'

export function Stats({ showPanel = 0 }) {
  const [stats] = useState(() => new (StatsImpl as any)())
  useEffect(() => {
    stats.showPanel(showPanel)
    document.body.appendChild(stats.dom)
    return () => document.body.removeChild(stats.dom)
  }, [])
  return useFrame((state) => {
    stats.begin()
    state.gl.render(state.scene, state.camera)
    stats.end()
  }, 1)
}
