export * from '../index'
export * from '../canvas'

import { WebGLRenderer, WebGL1Renderer } from 'three'
import * as React from 'react'
import { ResizeContainer, ContainerProps } from './shared/web/ResizeContainer'

export * from './shared/web/ResizeContainer'

const canvasStyle = { display: 'block' }

function CanvasComponent({ children, ...props }: ContainerProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const Renderer = React.useMemo(() => (props.webgl1 ? WebGL1Renderer : WebGLRenderer), [props.webgl1])

  const renderer = React.useCallback(
    function callback() {
      if (canvasRef.current !== null) {
        const params = { antialias: true, alpha: true, ...props.gl }
        const temp = new Renderer({
          powerPreference: 'high-performance',
          //stencil: false,
          //depth: false,
          canvas: canvasRef.current,
          ...params,
        })
        return temp
      }
    },
    [Renderer, props.gl]
  )

  const preRender = React.useMemo(() => <canvas ref={canvasRef} style={canvasStyle} />, [])

  return (
    <ResizeContainer {...props} renderer={renderer} preRender={preRender}>
      {children}
    </ResizeContainer>
  )
}

export const Canvas = React.memo(CanvasComponent)
