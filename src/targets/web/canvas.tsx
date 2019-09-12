import * as THREE from 'three'
import * as React from 'react'
import { useRef, useEffect, useState, useMemo } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { useCanvas, CanvasProps, RectReadOnly } from '../../canvas'

export type Measure = [React.MutableRefObject<HTMLDivElement | null>, RectReadOnly]

function useMeasure(): Measure {
  const ref = useRef<HTMLDivElement>(null)
  const [bounds, set] = useState<RectReadOnly>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
  })
  const [ro] = useState(() => new ResizeObserver(([entry]) => set(entry.contentRect)))
  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, bounds]
}

const IsReady = React.memo(({ canvas, ...props }: CanvasProps & { canvas: HTMLCanvasElement; size: any }) => {
  const gl = useMemo(() => {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, ...props.gl })
    renderer.setClearAlpha(0)
    return renderer
  }, [])

  const { pointerEvents } = useCanvas({ ...props, gl })
  return <div {...pointerEvents} style={{ ...styles, position: 'absolute', top: 0, left: 0 }} />
})

const styles: React.CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }

export const Canvas = React.memo((props: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>()
  const [bind, size] = useMeasure()

  // Allow Gatsby, Next and other server side apps to run.
  // Will output styles to reduce flickering.
  if (typeof window === 'undefined') {
    return <div style={{ ...styles, ...props.style }} />
  }

  // Render the canvas into the dom
  return (
    <div ref={bind as React.MutableRefObject<HTMLDivElement>} style={{ ...styles, ...props.style }}>
      <canvas ref={canvasRef as React.MutableRefObject<HTMLCanvasElement>} style={{ display: 'block' }} />
      {canvasRef.current && <IsReady {...props} size={size} canvas={canvasRef.current} />}
    </div>
  )
})
