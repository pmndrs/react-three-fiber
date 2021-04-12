import * as React from 'react'
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createPointerEvents } from './events'
import { UseStore } from 'zustand'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'

export interface Props
  extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'events'>,
    React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
  events?: (store: UseStore<RootState>) => EventManager<any>
}

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect in the browser.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

export function Canvas({ children, resize, id, style, className, events, ...props }: Props) {
  const [ref, size] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvas = React.useRef<HTMLCanvasElement>(null!)
  useIsomorphicLayoutEffect(() => {
    if (size.width > 0 && size.height > 0) {
      render(children, canvas.current, { ...props, size, events: events || createPointerEvents })
    }
  }, [size, children])
  React.useEffect(() => {
    const container = canvas.current
    return () => unmountComponentAtNode(container)
  }, [])
  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <canvas ref={canvas} style={{ display: 'block' }} />
    </div>
  )
}
