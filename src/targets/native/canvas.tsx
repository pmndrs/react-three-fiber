import * as React from 'react'
import { GLView } from 'expo-gl'
import { LayoutChangeEvent, PixelRatio, ViewStyle, PanResponder, GestureResponderEvent } from 'react-native'
import { Renderer } from 'expo-three'
import { useEffect, useState } from 'react'
import { useCanvas, CanvasProps } from '../../canvas'

function clientXY(e: GestureResponderEvent) {
  ;(e as any).clientX = e.nativeEvent.pageX
  ;(e as any).clientY = e.nativeEvent.pageY
  return e
}

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
      onStartShouldSetPanResponderCapture(e) {
        pointerEvents.onGotPointerCapture(clientXY(e))
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
      onPanResponderStart: e => pointerEvents.onPointerDown(clientXY(e)),
      onPanResponderMove: e => pointerEvents.onPointerMove(clientXY(e)),
      onPanResponderEnd: e => pointerEvents.onPointerUp(clientXY(e)),
      onPanResponderRelease: e => pointerEvents.onPointerLeave(clientXY(e)),
      onPanResponderTerminate: e => pointerEvents.onLostPointerCapture(clientXY(e)),
      onPanResponderReject: e => pointerEvents.onLostPointerCapture(clientXY(e)),
    })
  )

  useEffect(() => {
    // Wait for ExpoGL Context and onLayout callback
    if (!gl && glContext && pixelRatio && size.width && size.height) {
      // https://github.com/expo/expo-three/issues/38
      glContext.createRenderbuffer = () => ({})

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
    <GLView
      {...panResponder.panHandlers}
      onContextCreate={setGlContext}
      onLayout={onLayout}
      style={{ flex: 1, ...props.style }}
    />
  )
})
