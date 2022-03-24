import * as React from 'react'
import * as THREE from 'three'
import mergeRefs from 'react-merge-refs'
import useMeasure from 'react-use-measure'
import type { Options as ResizeOptions } from 'react-use-measure'
import { UseBoundStore } from 'zustand'
import { pick, omit } from '../core/utils'
import { ReconcilerRoot, extend, createRoot, unmountComponentAtNode, RenderProps } from '../core'
import { createPointerEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'

export interface Props
  extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'events'>,
    React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  fallback?: React.ReactNode
  resize?: ResizeOptions
  events?: (store: UseBoundStore<RootState>) => EventManager<any>
}

type SetBlock = false | Promise<null> | null
type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

const CANVAS_PROPS: Array<keyof Props> = [
  'gl',
  'events',
  'shadows',
  'linear',
  'flat',
  'orthographic',
  'frameloop',
  'dpr',
  'performance',
  'raycaster',
  'camera',
  'onPointerMissed',
  'onCreated',
]

function Block({ set }: Omit<UnblockProps, 'children'>) {
  React.useLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [set])
  return null
}

class ErrorBoundary extends React.Component<{ set: React.Dispatch<any> }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error: any) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

export const Canvas = /*#__PURE__*/ React.forwardRef<HTMLCanvasElement, Props>(function Canvas(
  { children, fallback, resize, style, events = createPointerEvents, ...props },
  forwardedRef,
) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE), [])

  const [containerRef, { width, height }] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)

  const canvasProps = pick<Props>(props, CANVAS_PROPS)
  const divProps = omit<Props>(props, CANVAS_PROPS)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const root = React.useRef<ReconcilerRoot<HTMLElement>>(null!)

  if (width > 0 && height > 0 && canvas) {
    if (!root.current) root.current = createRoot<HTMLElement>(canvas)

    root.current.configure({ ...canvasProps, size: { width, height }, events })
    root.current.render(
      <ErrorBoundary set={setError}>
        <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
      </ErrorBoundary>,
    )
  }

  React.useLayoutEffect(() => {
    setCanvas(canvasRef.current)
  }, [])

  React.useEffect(() => {
    return () => unmountComponentAtNode(canvas!)
  }, [canvas])

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
      {...divProps}>
      <canvas ref={mergeRefs([canvasRef, forwardedRef])} style={{ display: 'block' }}>
        {fallback}
      </canvas>
    </div>
  )
})
