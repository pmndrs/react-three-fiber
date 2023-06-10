import * as React from 'react'
import { WebGL2RenderingContext } from '@react-three/test-renderer/src/WebGL2RenderingContext'

export const GLView = ({ onContextCreate }: { onContextCreate: (gl: any) => void }) => {
  React.useLayoutEffect(() => {
    const gl = new WebGL2RenderingContext({ width: 1280, height: 800 } as HTMLCanvasElement)
    onContextCreate(gl)
  }, [])

  return null
}
