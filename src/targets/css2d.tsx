export * from '../index'
export * from '../canvas'

import React from 'react'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ResizeContainer } from './shared/web/ResizeContainer'
import { CanvasProps } from '../canvas'

export const Canvas = React.memo(({ children, ...props }: CanvasProps) => (
  <ResizeContainer
    {...props}
    renderer={() => new CSS2DRenderer()}
    effects={(gl, el) => (el.appendChild(gl.domElement), () => el.removeChild(gl.domElement))}>
    {children}
  </ResizeContainer>
))
