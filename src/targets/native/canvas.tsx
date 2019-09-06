import * as THREE from 'three'
import * as React from 'react'
import { GLView } from 'expo-gl'
import { LayoutChangeEvent, PixelRatio, ViewStyle } from 'react-native'
import { Renderer } from 'expo-three'
import { useEffect, useState } from 'react'
import { CanvasContext, useCanvas } from '../../shared/canvas'

export type CanvasProps = {
  children: React.ReactNode
  vr?: boolean
  orthographic?: boolean
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  gl?: Partial<THREE.WebGLRenderer>
  camera?: Partial<THREE.OrthographicCamera & THREE.PerspectiveCamera>
  raycaster?: Partial<THREE.Raycaster>
  size: { width: number; height: number; top: number; left: number }
  style?: ViewStyle
  pixelRatio?: number
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
}

export const Canvas = React.memo((props: CanvasProps) => {
  const [gl, setGl] = useState()
  const [glContext, setGlContext] = useState()

  const [pixelRatio, setPixelRatio] = useState(props.pixelRatio || 1)
  const [size, setSize] = useState(props.size || { width: 0, height: 0, top: 0, left: 0 })

  useCanvas({
    ...props,
    size,
    pixelRatio,
    gl,
  })

  useEffect(() => {
    // Wait for ExpoGL Context and onLayout callback
    if (!gl && glContext && pixelRatio && size.width && size.height) {
      const renderer = new Renderer({
        gl: glContext,
        width: size.width / pixelRatio,
        height: size.height / pixelRatio,
        pixelRatio,
      })
      // Bind previous render method to Renderer
      const rendererRender = renderer.render.bind(renderer)
      renderer.render = (scene, camera) => {
        rendererRender(scene, camera)
        // End frame through the RN Bridge
        glContext.endFrameEXP()
      }
      renderer.setClearAlpha(0)
      setGl(renderer)
    }
  }, [glContext, size, pixelRatio])

  function onLayout(e: LayoutChangeEvent) {
    const { width, height, x, y } = e.nativeEvent.layout
    if (!props.size) setSize({ width, height, top: y, left: x })
    if (!props.pixelRatio) setPixelRatio(PixelRatio.get())
  }

  return <GLView onContextCreate={setGlContext} onLayout={onLayout} style={{ flex: 1 }} />
})
