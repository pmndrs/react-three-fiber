import * as React from 'react'
import * as THREE from 'three'
import mergeRefs from 'react-merge-refs'
import useMeasure from 'react-use-measure'
import type { Options as ResizeOptions } from 'react-use-measure'
import {
  SetBlock,
  Block,
  ErrorBoundary,
  useMutableCallback,
  useIsomorphicLayoutEffect,
  pick,
  omit,
} from '../core/utils'
import { ReconcilerRoot, extend, createRoot, unmountComponentAtNode, RenderProps } from '../core'
import { createPointerEvents } from './events'

export interface Props extends Omit<RenderProps<HTMLCanvasElement>, 'size'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  /** Canvas fallback content, similar to img's alt prop */
  fallback?: React.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: ResizeOptions
}

const CANVAS_PROPS: Array<keyof Props> = [
  'gl',
  'events',
  'shadows',
  'linear',
  'flat',
  'legacy',
  'orthographic',
  'frameloop',
  'dpr',
  'performance',
  'raycaster',
  'camera',
  'onPointerMissed',
  'onCreated',
]

/**
 * A DOM canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = /*#__PURE__*/ React.forwardRef<HTMLCanvasElement, Props>(function Canvas(
  { children, fallback, resize, style, onPointerMissed, events = createPointerEvents, ...props },
  forwardedRef,
) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE), [])

  const [containerRef, { width, height }] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const meshRef = React.useRef<HTMLDivElement>(null!)
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)

  const handlePointerMissed = useMutableCallback(onPointerMissed)
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
    root.current.configure({
      ...canvasProps,
      // Pass mutable reference to onPointerMissed so it's free to update
      onPointerMissed: (...args) => handlePointerMissed.current?.(...args),
      onCreated: (state) => {
        state.events.connect?.(meshRef.current)
        canvasProps.onCreated?.(state)
      },
      size: { width, height },
      events,
    })
    root.current.render(
      <ErrorBoundary set={setError}>
        <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
      </ErrorBoundary>,
    )
  }

  useIsomorphicLayoutEffect(() => {
    const canvas = canvasRef.current
    setCanvas(canvas)
    return () => unmountComponentAtNode(canvas)
  }, [])

  return (
    <div
      ref={mergeRefs([meshRef, containerRef])}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
      {...divProps}>
      <canvas ref={mergeRefs([canvasRef, forwardedRef])} style={{ display: 'block' }}>
        {fallback}
      </canvas>
    </div>
  )
})
