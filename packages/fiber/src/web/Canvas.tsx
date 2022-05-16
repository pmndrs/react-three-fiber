import * as React from 'react'
import * as THREE from 'three'
import useMeasure from 'react-use-measure'
import type { Options as ResizeOptions } from 'react-use-measure'
import { SetBlock, Block, ErrorBoundary, useMutableCallback, useIsomorphicLayoutEffect } from '../core/utils'
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

/**
 * A DOM canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = /*#__PURE__*/ React.forwardRef<HTMLCanvasElement, Props>(function Canvas(
  {
    children,
    fallback,
    resize,
    style,
    gl,
    events = createPointerEvents,
    shadows,
    linear,
    flat,
    legacy,
    orthographic,
    frameloop,
    dpr,
    performance,
    raycaster,
    camera,
    onPointerMissed,
    onCreated,
    ...props
  },
  forwardedRef,
) {
  // Create a known catalogue of Threejs-native elements
  // This will include the entire THREE namespace by default, users can extend
  // their own elements by using the createRoot API instead
  React.useMemo(() => extend(THREE), [])

  const [containerRef, { width, height }] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvasRef = React.useRef<HTMLCanvasElement>(null!)
  const divRef = React.useRef<HTMLDivElement>(null!)
  const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)
  React.useImperativeHandle(forwardedRef, () => canvasRef.current)

  const handlePointerMissed = useMutableCallback(onPointerMissed)
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
      gl,
      events,
      shadows,
      linear,
      flat,
      legacy,
      orthographic,
      frameloop,
      dpr,
      performance,
      raycaster,
      camera,
      size: { width, height },
      // Pass mutable reference to onPointerMissed so it's free to update
      onPointerMissed: (...args) => handlePointerMissed.current?.(...args),
      onCreated: (state) => {
        state.events.connect?.(divRef.current)
        onCreated?.(state)
      },
    })
    root.current.render(
      <ErrorBoundary set={setError}>
        <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
      </ErrorBoundary>,
    )
  }

  useIsomorphicLayoutEffect(() => {
    setCanvas(canvasRef.current)
  }, [])

  React.useEffect(() => {
    if (canvas) return () => unmountComponentAtNode(canvas!)
  }, [canvas])

  return (
    <div
      ref={divRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
      {...props}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <canvas ref={canvasRef} style={{ display: 'block' }}>
          {fallback}
        </canvas>
      </div>
    </div>
  )
})
