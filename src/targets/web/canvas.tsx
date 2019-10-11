import * as THREE from 'three'
import * as React from 'react'
import { useRef, useEffect, useState, useMemo } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { useCanvas, CanvasProps, RectReadOnly, BoundingClientRectRef, PointerEvents } from '../../canvas'

type Measure = [React.MutableRefObject<HTMLDivElement | null>, RectReadOnly, BoundingClientRectRef]

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
    () => new ResizeObserver(() => ref.current && set(ref.current.getBoundingClientRect() as RectReadOnly))
  )
  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const shouldRecalc = useRef<boolean>(false)
  const scrollBounds = useMemo(
    () => ({
      _cache: bounds,
      get current() {
        if (shouldRecalc.current) {
          shouldRecalc.current = false
          this._cache = (ref.current as HTMLDivElement).getBoundingClientRect() as RectReadOnly
        }

        return this._cache
      },
    }),
    [bounds]
  )

  useEffect(() => {
    const onScroll = (event: Event) => {
      // Skip the check if flag already set
      if (shouldRecalc.current) return
      shouldRecalc.current = (event.target as HTMLElement).contains(ref.current as Node)
    }

    window.addEventListener('scroll', onScroll, { capture: true, passive: true })

    return () => window.removeEventListener('scroll', onScroll, true)
  }, [])

  return [ref, bounds, scrollBounds]
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
    rayBounds: BoundingClientRectRef
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
  const [bind, size, rayBounds] = useMeasure()

  // Allow Gatsby, Next and other server side apps to run.
  // Will output styles to reduce flickering.
  if (typeof window === 'undefined') {
    return <div style={{ ...defaultStyles, ...style }} />
  }

  // Render the canvas into the dom
  return (
    <div
      ref={bind as React.MutableRefObject<HTMLDivElement>}
      style={{ ...defaultStyles, ...style }}
      {...events}
      {...restSpread}>
      <canvas ref={canvasRef as React.MutableRefObject<HTMLCanvasElement>} style={{ display: 'block' }} />
      {canvasRef.current && (
        <IsReady {...props} size={size} rayBounds={rayBounds} canvas={canvasRef.current} setEvents={setEvents} />
      )}
    </div>
  )
})
