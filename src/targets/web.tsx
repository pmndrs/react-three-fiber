export * from '../index'
export * from '../canvas'

import * as THREE from 'three'
import React, { useRef } from 'react'
// @ts-ignore
import { ResizeContainer } from './shared/web/ResizeContainer'
import { CanvasProps } from '../canvas'

export const Canvas = React.memo(({ children, ...props }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>()
  return (
    <ResizeContainer
      {...props}
      renderer={() => {
        if (canvasRef.current) {
          const params = { antialias: true, alpha: true, ...props.gl }
          const temp = new THREE.WebGLRenderer({
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
