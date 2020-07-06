import { useState, useEffect, RefObject } from 'react'
import { useFrame } from 'react-three-fiber'
// @ts-ignore
import StatsImpl from 'stats.js'

type Props = {
  showPanel?: number
  className?: string
  parent?: RefObject<HTMLElement>
}

export function Stats({ showPanel = 0, className, parent }: Props): null {
  const [stats] = useState(() => new (StatsImpl as any)())
  useEffect(() => {
    const node = (parent && parent.current) || document.body

    stats.showPanel(showPanel)
    node?.appendChild(stats.dom)

    if (className) stats.dom.classList.add(className)

    return () => node?.removeChild(stats.dom)
  }, [parent])

  return useFrame((state) => {
    stats.begin()
    state.gl.render(state.scene, state.camera)
    stats.end()
  }, 1)
}
