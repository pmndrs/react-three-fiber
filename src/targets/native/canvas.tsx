import * as React from 'react'
import { GLView } from 'expo-gl'
import { LayoutChangeEvent, PixelRatio, ViewStyle, PanResponder } from 'react-native'
import { Renderer } from 'expo-three'
import { useEffect, useState } from 'react'
import { useCanvas, CanvasProps } from '../../canvas'

export const Canvas = React.memo((props: CanvasProps & { style?: ViewStyle }) => {
  const [gl, setGl] = useState()
  const [glContext, setGlContext] = useState()

  const [pixelRatio, setPixelRatio] = useState(props.pixelRatio || 1)
  const [size, setSize] = useState({ width: 0, height: 0, top: 0, left: 0 })

  const { pointerEvents } = useCanvas({
    ...props,
    size,
    pixelRatio,
    gl,
  })

  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder() {
        return true
      },
      onStartShouldSetPanResponderCapture() {
        pointerEvents.onGotPointerCapture()
        return true
      },
      onMoveShouldSetPanResponder() {
        return true
      },
      onMoveShouldSetPanResponderCapture() {
        return true
      },
      onPanResponderTerminationRequest() {
        return true
      },
      onPanResponderStart: e => pointerEvents.onPointerDown(),
      onPanResponderMove: e => pointerEvents.onPointerMove(),
      onPanResponderEnd: e => pointerEvents.onPointerUp(),
      onPanResponderRelease: e => pointerEvents.onPointerLeave(),
      onPanResponderTerminate: e => pointerEvents.onLostPointerCapture(),
      onPanResponderReject: e => pointerEvents.onLostPointerCapture(),
    })
  )

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
    setSize({ width, height, top: y, left: x })
    if (!props.pixelRatio) setPixelRatio(PixelRatio.get())
  }

  return (
    <GLView {...panResponder} onContextCreate={setGlContext} onLayout={onLayout} style={{ flex: 1, ...props.style }} />
  )
})
