export * from '../index'
export * from '../canvas'

import React from 'react'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ResizeContainer, ResizeContainerProps } from './shared/web/ResizeContainer'

export const Canvas = React.memo(({ children, ...props }: ResizeContainerProps) => (
  <ResizeContainer
    {...props}
    renderer={() => new CSS2DRenderer()}
    effects={(gl, el) => (el.appendChild(gl.domElement), () => el.removeChild(gl.domElement))}>
    {children}
  </ResizeContainer>
))
