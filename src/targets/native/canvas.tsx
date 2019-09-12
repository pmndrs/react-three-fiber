import * as React from 'react'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'
import {
  View,
  LayoutChangeEvent,
  PixelRatio,
  ViewStyle,
  PanResponder,
  GestureResponderEvent,
  StyleSheet,
} from 'react-native'
import { Renderer } from 'expo-three'
import { useState } from 'react'
import { useCanvas, CanvasProps, RectReadOnly } from '../../canvas'

function clientXY(e: GestureResponderEvent) {
  ;(e as any).clientX = e.nativeEvent.pageX
  ;(e as any).clientY = e.nativeEvent.pageY
  return e
}

type NativeCanvasProps = Omit<CanvasProps, 'style'> & {
  style?: ViewStyle
  onContextCreated?: (gl: ExpoWebGLRenderingContext) => Promise<any> | void
}

const styles: ViewStyle = { flex: 1 }

const IsReady = React.memo(({ gl, ...props }: NativeCanvasProps & { gl: any; size: any }) => {
  const { pointerEvents } = useCanvas({ ...props, gl })

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture(e) {
          pointerEvents.onGotPointerCapture(clientXY(e))
          return true
        },
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => true,
        onPanResponderStart: e => pointerEvents.onPointerDown(clientXY(e)),
        onPanResponderMove: e => pointerEvents.onPointerMove(clientXY(e)),
        onPanResponderEnd: e => pointerEvents.onPointerUp(clientXY(e)),
        onPanResponderRelease: e => pointerEvents.onPointerLeave(clientXY(e)),
        onPanResponderTerminate: e => pointerEvents.onLostPointerCapture(clientXY(e)),
        onPanResponderReject: e => pointerEvents.onLostPointerCapture(clientXY(e)),
      }),
    []
  )

  return <View {...panResponder.panHandlers} style={StyleSheet.absoluteFill} />
})

export const Canvas = React.memo((props: NativeCanvasProps) => {
  const [size, setSize] = useState<RectReadOnly | null>(null)
  const [renderer, setRenderer] = useState()

  // Handle size changes
  const onLayout = (e: LayoutChangeEvent) => setSize(e.nativeEvent.layout as any)

  // Fired when EXGL context is initialized
  const onContextCreate = async (gl: ExpoWebGLRenderingContext & WebGLRenderingContext) => {
    if (props.onContextCreated) {
      // Allow customization of the GL Context
      // Useful for AR, VR and others
      await props.onContextCreated(gl)
    }

    if (props.shadowMap) {
      // https://github.com/expo/expo-three/issues/38
      gl.createRenderbuffer = () => ({})
    }

    const pixelRatio = PixelRatio.get()

    const renderer = new Renderer({
      gl,
      width: size!.width / pixelRatio,
      height: size!.height / pixelRatio,
      pixelRatio,
    })

    // Bind previous render method to Renderer
    const rendererRender = renderer.render.bind(renderer)
    renderer.render = (scene, camera) => {
      rendererRender(scene, camera)
      // End frame through the RN Bridge
      gl.endFrameEXP()
    }

    setRenderer(renderer)
  }

  // 1. Ensure Size
  // 2. Ensure EXGLContext
  // 3. Call `useCanvas`
  return (
    <View onLayout={onLayout} style={{ ...styles, ...props.style }}>
      {size && <GLView onContextCreate={onContextCreate} style={StyleSheet.absoluteFill} />}
      {size && renderer && <IsReady {...props} size={size!} gl={renderer} />}
    </View>
  )
})
