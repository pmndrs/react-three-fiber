import * as THREE from 'three'
import * as React from 'react'
import { useRef, useEffect, useState, useMemo } from 'react'
import useMeasure, { RectReadOnly } from 'react-use-measure'
import { ResizeObserver } from '@juggle/resize-observer'
import { useCanvas, CanvasProps, PointerEvents } from '../../canvas'

const IsReady = React.memo(
  ({
    setEvents,
    canvas,
    gl2,
    ...props
  }: CanvasProps & {
    setEvents: React.Dispatch<React.SetStateAction<PointerEvents>>
    canvas: HTMLCanvasElement
    size: RectReadOnly
    gl2?: boolean
  }) => {
    const params = { antialias: true, alpha: true, ...props.gl }
    const gl = useMemo(
      () =>
        new THREE.WebGLRenderer({
          canvas,
          context: gl2 ? (canvas.getContext('webgl2', params) as WebGLRenderingContext) : undefined,
          ...params,
        }),
      []
    )

    // Init canvas, fetch events, hand them back to the warpping div
    const events = useCanvas({ ...props, gl })
    useEffect(() => void setEvents(events), [events])
    return null
  }
)

const defaultStyles: React.CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }

export interface WebCanvasProps extends CanvasProps, Omit<React.ComponentProps<'div'>, 'children'> {}

export const Canvas = React.memo((props: WebCanvasProps) => {
  const {
    children,
    vr,
    gl2,
    shadowMap,
    orthographic,
    resize,
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
  const [bind, size] = useMeasure(
    resize || {
      scroll: true,
      debounce: { scroll: 50, resize: 0 },
      polyfill: typeof window === 'undefined' || !(window as any).ResizeObserver ? ResizeObserver : undefined,
    }
  )

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
    <div ref={bind} style={{ ...defaultStyles, ...style }} {...events} {...restSpread}>
      <canvas ref={canvasRef as React.MutableRefObject<HTMLCanvasElement>} style={{ display: 'block' }} />
      {canvasRef.current && (
        <IsReady {...props} size={size} gl2={gl2} canvas={canvasRef.current} setEvents={setEvents} />
      )}
    </div>
  )
})
