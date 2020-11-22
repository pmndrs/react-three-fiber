import { WebGLRenderer, Renderer as ThreeRenderer } from 'three'
import * as React from 'react'
import useMeasure, { RectReadOnly } from 'react-use-measure'
import mergeRefs from 'react-merge-refs'
import { useCanvas, CanvasProps, DomEventHandlers } from '../../../canvas'

const defaultStyles: React.CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }

interface Renderer extends Omit<ThreeRenderer, 'domElement'> {}

export interface ContainerProps extends CanvasProps, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export interface ResizeContainerProps extends CanvasProps, ContainerProps {
  renderer: () => Renderer | undefined | null
  effects?: (renderer: any, parent: HTMLDivElement) => () => any
  preRender?: React.ReactNode
}

interface ResizeContainerState {
  size: RectReadOnly
  forceResize: () => void
  setEvents: React.Dispatch<React.SetStateAction<DomEventHandlers>>
  container: HTMLDivElement | null
}

interface ContentProps extends ResizeContainerProps, ResizeContainerState {}

function Content({ children, setEvents, container, renderer, effects, ...props }: ContentProps) {
  // Create renderer
  const [gl] = React.useState(renderer)
  if (!gl) console.warn('No renderer created!')

  // Mount and unmount management
  React.useEffect(() => {
    if (effects && container !== null) {
      effects(gl, container)
    }
  }, [container, effects, gl])

  // Init canvas, fetch events, hand them back to the wrapping div
  const events = useCanvas({ ...props, children, gl: (gl as unknown) as WebGLRenderer })

  React.useEffect(() => {
    setEvents(events)
  }, [events, setEvents])

  return null
}

function ResizeContainerComponent(props: ResizeContainerProps) {
  const {
    renderer,
    effects,
    children,
    vr,
    webgl1,
    concurrent,
    shadowMap,
    colorManagement,
    orthographic,
    invalidateFrameloop,
    updateDefaultCamera,
    noEvents,
    gl,
    camera,
    raycaster,
    pixelRatio,
    onCreated,
    onPointerMissed,
    preRender,
    resize,
    style,
    ...restSpread
  } = props

  const containerRef = React.useRef<HTMLDivElement | null>(null)
  // onGotPointerCaptureLegacy is a fake event used by non-web targets to simulate poinzter capture
  const [{ onGotPointerCaptureLegacy, ...events }, setEvents] = React.useState<DomEventHandlers>({} as DomEventHandlers)
  const [useMeasureRef, size, forceResize] = useMeasure({
    scroll: true,
    debounce: { scroll: 50, resize: 0 },
    ...resize,
  })

  // Flag view ready once it's been measured out
  const readyFlag = React.useRef(false)
  const ready = React.useMemo(() => (readyFlag.current = readyFlag.current || (!!size.width && !!size.height)), [size])
  const state = React.useMemo(() => ({ size, forceResize, setEvents, container: containerRef.current }), [
    forceResize,
    size,
  ])
  const memoStyle = React.useMemo(() => ({ ...defaultStyles, ...style }), [style])

  // Allow Gatsby, Next and other server side apps to run. Will output styles to reduce flickering.
  if (typeof window === 'undefined') {
    return (
      <div style={memoStyle} {...restSpread}>
        {preRender}
      </div>
    )
  }

  // Render the canvas into the dom
  return (
    <div ref={mergeRefs([useMeasureRef, containerRef])} style={memoStyle} {...events} {...restSpread}>
      {preRender}
      {ready && <Content {...props} {...state} />}
    </div>
  )
}

const ResizeContainer = React.memo(ResizeContainerComponent)

export { ResizeContainer }
