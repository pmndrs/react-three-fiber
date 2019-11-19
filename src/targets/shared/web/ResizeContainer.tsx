import * as THREE from 'three'
import React, { createContext } from 'react'
import { useRef, useState, useMemo, useEffect } from 'react'
import useMeasure, { RectReadOnly } from 'react-use-measure'
import ResizeObserver from '@juggle/resize-observer'
// @ts-ignore
import mergeRefs from 'react-merge-refs'
import { useCanvas, CanvasProps, PointerEvents } from '../../../canvas'

const defaultStyles: React.CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }

type ResizeContainerProps = {
  children: React.ReactNode
  renderer: () => any
  effects?: (renderer: any, parent: HTMLDivElement) => () => any
  preRender?: React.ReactNode
}

type ResizeContainerState = {
  size: RectReadOnly
  setEvents: React.Dispatch<React.SetStateAction<PointerEvents>>
  container: HTMLDivElement
}

function Content({
  children,
  setEvents,
  container,
  renderer,
  effects,
  ...props
}: CanvasProps & ResizeContainerProps & ResizeContainerState) {
  // Create renderer
  const gl = useMemo(renderer, [])
  if (!gl) console.warn('No renderer created!')

  // Mount and unmount managemenbt
  useEffect(() => effects && effects(gl, container), [])

  // Init canvas, fetch events, hand them back to the wrapping div
  const events = useCanvas({ ...props, children, gl: (gl as unknown) as THREE.WebGLRenderer })
  useEffect(() => void setEvents(events), [events])
  return null
}

const ResizeContainer = React.memo((props: CanvasProps & ResizeContainerProps) => {
  const {
    renderer,
    effects,
    preRender,
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

  const containerRef = useRef<HTMLDivElement>()
  const [events, setEvents] = useState<PointerEvents>({} as PointerEvents)
  const [bind, size] = useMeasure(
    resize || {
      scroll: true,
      debounce: { scroll: 50, resize: 0 },
      polyfill: typeof window === 'undefined' ? ResizeObserver : undefined,
    }
  )

  // Flag view ready once it's been measured out
  const readyFlag = useRef(false)
  const ready = useMemo(() => (readyFlag.current = readyFlag.current || (!!size.width && !!size.height)), [size])
  const state = useMemo(() => ({ size, setEvents, container: containerRef.current as HTMLDivElement }), [size])

  // Allow Gatsby, Next and other server side apps to run. Will output styles to reduce flickering.
  if (typeof window === 'undefined') return <div style={{ ...defaultStyles, ...style }} />

  // Render the canvas into the dom
  return (
    <div ref={mergeRefs([bind, containerRef])} style={{ ...defaultStyles, ...style }} {...events} {...restSpread}>
      {preRender}
      {ready && <Content {...props} {...state} />}
    </div>
  )
})

export { ResizeContainer }
