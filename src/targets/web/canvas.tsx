import * as THREE from 'three'
import * as React from 'react'
import { useRef, useEffect, useState, useMemo } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { useCanvas, CanvasProps, RectReadOnly, PointerEvents } from '../../canvas'

type Measure = [React.MutableRefObject<HTMLDivElement | null>, RectReadOnly]

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
  const [ro] = useState(
    () =>
      new ResizeObserver(() => {
        if (!ref.current) return
        const { pageXOffset, pageYOffset } = window
        const { left, top, width, height, bottom, right, x, y } = ref.current.getBoundingClientRect() as RectReadOnly
        const size = { left, top, width, height, bottom, right, x, y }
        size.top += pageYOffset
        size.bottom += pageYOffset
        size.y += pageYOffset
        size.left += pageXOffset
        size.right += pageXOffset
        size.x += pageXOffset
        Object.freeze(size)
        return set(size)
      })
  )
  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, bounds]
}

const IsReady = React.memo(
  ({
    setEvents,
    canvas,
    ...props
  }: CanvasProps & {
    setEvents: React.Dispatch<React.SetStateAction<PointerEvents>>
    canvas: HTMLCanvasElement
    size: RectReadOnly
  }) => {
    const gl = useMemo(() => new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, ...props.gl }), [])

    // Init canvas, fetch events, hand them back to the warpping div
    const events = useCanvas({ ...props, gl })
    useEffect(() => void setEvents(events), [events])
    return null
  }
)

const defaultStyles: React.CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }

export const Canvas = React.memo((props: CanvasProps) => {
  const {
    children,
    vr,
    shadowMap,
    orthographic,
    invalidateFrameloop,
    updateDefaultCamera,
    noEvents,
    gl,
    camera,
    raycaster,
    pixelRatio,
    style,
    onCreated,
    onPointerMissed,
    ...restSpread
  } = props

  const canvasRef = useRef<HTMLCanvasElement>()
  const [events, setEvents] = useState<PointerEvents>({} as PointerEvents)
  const [bind, size] = useMeasure()

  // Allow Gatsby, Next and other server side apps to run.
  // Will output styles to reduce flickering.
  if (typeof window === 'undefined') {
    return (
      <div style={{ ...defaultStyles, ...style }}>
        <canvas style={{ display: 'block' }} />
      </div>
    )
  }

  // Render the canvas into the dom
  return (
    <div
      ref={bind as React.MutableRefObject<HTMLDivElement>}
      style={{ ...defaultStyles, ...style }}
      {...events}
      {...restSpread}>
      <canvas ref={canvasRef as React.MutableRefObject<HTMLCanvasElement>} style={{ display: 'block' }} />
      {canvasRef.current && <IsReady {...props} size={size} canvas={canvasRef.current} setEvents={setEvents} />}
    </div>
  )
})
