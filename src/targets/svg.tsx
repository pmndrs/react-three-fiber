export * from '../index'
export * from '../canvas'
export * from './shared/web/Dom'

import { Color } from 'three'
import React from 'react'
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer'
import { ResizeContainer, ResizeContainerProps } from './shared/web/ResizeContainer'

export const Canvas = React.memo(({ children, ...props }: ResizeContainerProps) => (
  <ResizeContainer
    {...props}
    renderer={() => {
      const temp = new SVGRenderer()
      temp.setClearColor(new Color(0x000000), 0)
      return temp
    }}
    effects={(gl, el) => (el.appendChild(gl.domElement), () => el.removeChild(gl.domElement))}>
    {children}
  </ResizeContainer>
))
