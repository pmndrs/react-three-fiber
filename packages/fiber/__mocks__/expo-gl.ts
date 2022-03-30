import * as React from 'react'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

export const GLView = ({ onContextCreate }: { onContextCreate: (gl: any) => void }) => {
  React.useLayoutEffect(() => {
    const gl = createWebGLContext({ width: 1280, height: 800 } as HTMLCanvasElement)
    onContextCreate(gl)
  }, [])

  return null
}
