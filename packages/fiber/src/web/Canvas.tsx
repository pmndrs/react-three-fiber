import * as React from 'react'
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createDOMEvents as events } from './events'

export interface Props extends Omit<RenderProps<HTMLCanvasElement>, 'size'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
}

export function Canvas({ children, resize, style, className, ...props }: Props) {
  const [ref, size] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvas = React.useRef<HTMLCanvasElement>(null!)
  React.useLayoutEffect(() => {
    if (size.width > 0 && size.height > 0) {
      render(children, canvas.current, { ...props, size, events })
    }
  }, [size, children])
  React.useEffect(() => {
    const container = canvas.current
    return () => unmountComponentAtNode(container)
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <canvas ref={canvas} style={{ display: 'block' }} />
    </div>
  )
}
