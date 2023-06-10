import * as React from 'react'
import type { GLViewProps } from 'expo-gl'
import { WebGL2RenderingContext } from '@react-three/test-renderer/src/WebGL2RenderingContext'

export function GLView({ onContextCreate }: GLViewProps) {
  React.useLayoutEffect(() => {
    const gl = new WebGL2RenderingContext({ width: 1280, height: 800 } as HTMLCanvasElement)
    onContextCreate(gl as any)
  }, [])

  return null
}
