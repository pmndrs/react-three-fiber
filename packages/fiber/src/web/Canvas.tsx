import * as React from 'react'
import useMeasure, { Options as ResizeOptions } from 'react-use-measure'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createDOMEvents as events } from './events'

export interface Props extends Omit<RenderProps<HTMLCanvasElement>, 'size'>, React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  resize?: ResizeOptions
  context?: React.Context<any>[]
}

function useContextBridge(...contexts: React.Context<any>[]) {
  const cRef = React.useRef<React.Context<any>[]>([])
  cRef.current = contexts.map((context) => React.useContext(context))
  return React.useMemo(
    () => ({ children }: { children: React.ReactNode }): JSX.Element =>
      (contexts.reduceRight(
        (acc, Context, i) => <Context.Provider value={cRef.current[i]} children={acc} />,
        children,
        /*
         * done this way in reference to:
         * https://github.com/DefinitelyTyped/DefinitelyTyped/issues/44572#issuecomment-625878049
         * https://github.com/microsoft/TypeScript/issues/14729
         */
      ) as unknown) as JSX.Element,
    [],
  )
}

export function Canvas({ children, resize, style, className, context = [], ...props }: Props) {
  const Bridge = useContextBridge(...context)
  const [ref, size] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  const canvas = React.useRef<HTMLCanvasElement>(null!)
  React.useLayoutEffect(() => {
    if (size.width > 0 && size.height > 0) {
      render(<Bridge>{children}</Bridge>, canvas.current, { ...props, size, events })
    }
  }, [size, children])
  React.useEffect(() => () => unmountComponentAtNode(canvas.current), [])
  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <canvas ref={canvas} style={{ display: 'block' }} />
    </div>
  )
}
