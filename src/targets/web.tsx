export * from '../index'
export * from '../canvas'
export * from './shared/web/Dom'

import { WebGLRenderer, Vector3, Group } from 'three'
import React, { useRef, useMemo, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { ResizeContainer } from './shared/web/ResizeContainer'
import { CanvasProps } from '../canvas'
import { useFrame, useThree } from '../hooks'
import { ReactThreeFiber } from '../three-types'

export const Canvas = React.memo(({ children, ...props }: CanvasProps) => {
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
