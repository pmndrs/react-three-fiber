export * from '../index'
export * from '../canvas'

import * as React from 'react'
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer'
import { ResizeContainer, ContainerProps } from './shared/web/ResizeContainer'

function CanvasComponent({ children, ...props }: ContainerProps) {
  const renderer = React.useCallback(function callback() {
    return new CSS3DRenderer()
  }, [])

  const effects = React.useCallback(function callback(gl, el) {
    el.appendChild(gl.domElement)
    return () => el.removeChild(gl.domElement)
  }, [])

  return (
    <ResizeContainer {...props} renderer={renderer} effects={effects}>
      {children}
    </ResizeContainer>
  )
}

export const Canvas = React.memo(CanvasComponent)
