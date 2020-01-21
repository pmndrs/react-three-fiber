export * from '../index'
export * from '../canvas'
export * from './shared/web/Dom'

import { WebGLRenderer } from 'three'
import React, { useRef } from 'react'
import { ResizeContainer, ContainerProps } from './shared/web/ResizeContainer'

export const Canvas = React.memo(function Canvas({ children, ...props }: ContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>()
  return (
    <ResizeContainer
      {...props}
      renderer={() => {
        if (canvasRef.current) {
          const params = { antialias: true, alpha: true, ...props.gl }
          const temp = new WebGLRenderer({
            canvas: canvasRef.current,
            context: props.gl2 ? (canvasRef.current.getContext('webgl2', params) as WebGLRenderingContext) : undefined,
            ...params,
          })
          return temp
        }
      }}
      preRender={<canvas ref={canvasRef as React.MutableRefObject<HTMLCanvasElement>} style={{ display: 'block' }} />}>
      {children}
    </ResizeContainer>
  )
})
