import * as React from 'react'
import type { GLViewProps, ExpoWebGLRenderingContext } from 'expo-gl'

export function GLView({ onContextCreate }: GLViewProps) {
  const canvas = React.useMemo(() => Object.assign(document.createElement('canvas'), { width: 1280, height: 800 }), [])

  React.useLayoutEffect(() => {
    const gl = canvas.getContext('webgl2') as ExpoWebGLRenderingContext
    gl.endFrameEXP = () => {}
    onContextCreate?.(gl)
  }, [canvas, onContextCreate])

  return null
}
