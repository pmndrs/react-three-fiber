import * as THREE from 'three'
import * as React from 'react'
import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { useCanvas, CanvasContext } from '../../shared/canvas'

export type CanvasProps = {
  children: React.ReactNode
  vr?: boolean
  orthographic?: boolean
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  gl?: Partial<THREE.WebGLRenderer>
  camera?: Partial<THREE.OrthographicCamera & THREE.PerspectiveCamera>
  raycaster?: Partial<THREE.Raycaster>
  style?: React.CSSProperties
  pixelRatio?: number
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
}

export type Measure = [
  React.MutableRefObject<HTMLDivElement | null>,
  { left: number; top: number; width: number; height: number }
]

function useMeasure(): Measure {
  const ref = useRef<HTMLDivElement>(null)
  const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [ro] = useState(() => new ResizeObserver(([entry]) => set(entry.contentRect)))
  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref.current])
  return [ref, bounds]
}

export const Canvas = React.memo((props: CanvasProps) => {
  // Local, reactive state
  const [bind, size] = useMeasure()
  const [pixelRatio] = useState(props.pixelRatio)

  const [canvas] = useState(() => {
    const element = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas')
    element.style.display = 'block'
    return element as HTMLCanvasElement
  })

  const [gl, setGl] = useState()

  // Manage canvas element in the dom
  useLayoutEffect(() => {
    // Add canvas to the view
    if (bind.current) bind.current.appendChild(canvas)
  }, [])

  useLayoutEffect(() => {
    if (!gl && size.width && size.height) {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, ...props.gl })
      setGl(renderer)
    }
  }, [size])

  useCanvas({
    ...props,
    browser: true,
    gl,
    size,
    pixelRatio,
  })

  // Render the canvas into the dom
  return (
    <div
      ref={bind as React.MutableRefObject<HTMLDivElement>}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...props.style }}
    />
  )
})
