import * as React from 'react'
import * as THREE from 'three'
import mergeRefs from 'react-merge-refs'
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { UseStore } from 'zustand'
import pick from 'lodash-es/pick'
import omit from 'lodash-es/omit'
import { extend, render, unmountComponentAtNode, RenderProps } from './index'
import { createPointerEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'

export interface Props
  extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'events'>,
    React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  fallback?: React.ReactNode
  resize?: ResizeOptions
  events?: (store: UseStore<RootState>) => EventManager<any>
}

type SetBlock = false | Promise<null> | null
type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

const CANVAS_PROPS = [
  'gl',
  'events',
  'size',
  'shadows',
  'linear',
  'flat',
  'orthographic',
  'frameloop',
  'dpr',
  'performance',
  'clock',
  'raycaster',
  'camera',
  'onPointerMissed',
  'onCreated',
]

function Block({ set }: Omit<UnblockProps, 'children'>) {
  React.useLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [])
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
  { children, fallback, resize, style, events, ...props },
  forwardedRef,
) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE), [])

  const [containerRef, { width, height }] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)

  const canvasProps = pick(props, CANVAS_PROPS)
  const divProps = omit(props, CANVAS_PROPS)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  // Execute JSX in the reconciler as a layout-effect
  React.useLayoutEffect(() => {
    if (width > 0 && height > 0) {
      render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
        canvasRef.current,
        {
          ...canvasProps,
          size: { width, height },
          events: events || createPointerEvents,
        },
      )
    }
  }, [width, height, children, canvasProps])

  React.useEffect(() => {
    const container = canvasRef.current
    return () => unmountComponentAtNode(container)
  }, [])

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
