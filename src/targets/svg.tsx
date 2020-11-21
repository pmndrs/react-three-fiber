export * from '../index'
export * from '../canvas'

import { Color } from 'three'
import * as React from 'react'
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer'
import { ResizeContainer, ContainerProps } from './shared/web/ResizeContainer'

function CanvasComponent({ children, ...props }: ContainerProps) {
  const renderer = React.useCallback(function callback() {
    const temp = new SVGRenderer()
    temp.setClearColor(new Color(0x000000), 0)
    return temp
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
