import * as React from 'react'
import * as THREE from 'three'
import {
  View,
  type ViewProps,
  type ViewStyle,
  type GestureResponderHandlers,
  type GestureResponderEvent,
  PanResponder,
  type LayoutChangeEvent,
  StyleSheet,
  PixelRatio,
} from 'react-native'
import { useContextBridge, FiberProvider } from 'its-fine'
import { SetBlock, Block, ErrorBoundary, useMutableCallback } from '../core/utils'
import { extend, createRoot, unmountComponentAtNode, RenderProps, ReconcilerRoot } from '../core'
import { createPointerEvents } from '../web/events'
import { RootState, Size } from '../core/store'

export interface CanvasProps extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'dpr'>, ViewProps {
  children: React.ReactNode
  style?: ViewStyle
}

export interface Props extends CanvasProps {}

let GLView: any | null = null // TODO: type reflection without importing

/**
 * A native canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
const CanvasImpl = /*#__PURE__*/ React.forwardRef<View, Props>(
  (
    {
      children,
      style,
      gl,
      events = createPointerEvents,
      shadows,
      linear,
      flat,
      legacy,
      orthographic,
      frameloop,
      performance,
      raycaster,
      camera,
      scene,
      onPointerMissed,
      onCreated,
      ...props
    },
    forwardedRef,
  ) => {
    // Lazily load expo-gl, so it's only required when Canvas is used
    GLView ??= require('expo-gl').GLView

    // Create a known catalogue of Threejs-native elements
    // This will include the entire THREE namespace by default, users can extend
    // their own elements by using the createRoot API instead
    React.useMemo(() => extend(THREE), [])

    const Bridge = useContextBridge()

    const [{ width, height, top, left }, setSize] = React.useState<Size>({ width: 0, height: 0, top: 0, left: 0 })
    const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)
    const [bind, setBind] = React.useState<GestureResponderHandlers>()
    React.useImperativeHandle(forwardedRef, () => viewRef.current)

    const handlePointerMissed = useMutableCallback(onPointerMissed)
    const [block, setBlock] = React.useState<SetBlock>(false)
    const [error, setError] = React.useState<Error | undefined>(undefined)

    // Suspend this component if block is a promise (2nd run)
    if (block) throw block
    // Throw exception outwards if anything within canvas throws
    if (error) throw error

    const viewRef = React.useRef<View>(null!)
    const root = React.useRef<ReconcilerRoot<HTMLCanvasElement>>(null!)

    const [antialias, setAntialias] = React.useState<boolean>(true)

    const onLayout = React.useCallback((e: LayoutChangeEvent) => {
      const { width, height, x, y } = e.nativeEvent.layout
      setSize({ width, height, top: y, left: x })
    }, [])

    // Called on context create or swap
    // https://github.com/pmndrs/react-three-fiber/pull/2297
    const onContextCreate = React.useCallback((context: WebGL2RenderingContext) => {
      const listeners = new Map<string, EventListener[]>()

      const canvas = {
        style: {},
        width: context.drawingBufferWidth,
        height: context.drawingBufferHeight,
        clientWidth: context.drawingBufferWidth,
        clientHeight: context.drawingBufferHeight,
        getContext: (_: any, { antialias = false }) => {
          setAntialias(antialias)
          return context
        },
        addEventListener(type: string, listener: EventListener) {
          let callbacks = listeners.get(type)
          if (!callbacks) {
            callbacks = []
            listeners.set(type, callbacks)
          }

          callbacks.push(listener)
        },
        removeEventListener(type: string, listener: EventListener) {
          const callbacks = listeners.get(type)
          if (callbacks) {
            const index = callbacks.indexOf(listener)
            if (index !== -1) callbacks.splice(index, 1)
          }
        },
        dispatchEvent(event: Event) {
          Object.assign(event, { target: this })

          const callbacks = listeners.get(event.type)
          if (callbacks) {
            for (const callback of callbacks) {
              callback(event)
            }
          }
        },
        setPointerCapture() {
          // TODO
        },
        releasePointerCapture() {
          // TODO
        },
      } as unknown as HTMLCanvasElement

      // TODO: this is wrong but necessary to trick controls
      // @ts-ignore
      canvas.ownerDocument = canvas
      canvas.getRootNode = () => canvas

      root.current = createRoot<HTMLCanvasElement>(canvas)
      setCanvas(canvas)

      function handleTouch(gestureEvent: GestureResponderEvent, type: string): true {
        gestureEvent.persist()

        canvas.dispatchEvent(
          Object.assign(gestureEvent.nativeEvent, {
            type,
            offsetX: gestureEvent.nativeEvent.locationX,
            offsetY: gestureEvent.nativeEvent.locationY,
            pointerType: 'touch',
            pointerId: gestureEvent.nativeEvent.identifier,
          }) as unknown as Event,
        )

        return true
      }

      const responder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => true,
        onStartShouldSetPanResponderCapture: (e) => handleTouch(e, 'pointercapture'),
        onPanResponderStart: (e) => handleTouch(e, 'pointerdown'),
        onPanResponderMove: (e) => handleTouch(e, 'pointermove'),
        onPanResponderEnd: (e, state) => {
          handleTouch(e, 'pointerup')
          if (Math.hypot(state.dx, state.dy) < 20) handleTouch(e, 'click')
        },
        onPanResponderRelease: (e) => handleTouch(e, 'pointerleave'),
        onPanResponderTerminate: (e) => handleTouch(e, 'lostpointercapture'),
        onPanResponderReject: (e) => handleTouch(e, 'lostpointercapture'),
      })
      setBind(responder.panHandlers)
    }, [])

    if (root.current && width > 0 && height > 0) {
      root.current.configure({
        gl,
        events,
        shadows,
        linear,
        flat,
        legacy,
        orthographic,
        frameloop,
        performance,
        raycaster,
        camera,
        scene,
        // expo-gl can only render at native dpr/resolution
        // https://github.com/expo/expo-three/issues/39
        dpr: PixelRatio.get(),
        size: { width, height, top, left },
        // Pass mutable reference to onPointerMissed so it's free to update
        onPointerMissed: (...args) => handlePointerMissed.current?.(...args),
        // Overwrite onCreated to apply RN bindings
        onCreated: (state: RootState) => {
          // Bind render to RN bridge
          const context = state.gl.getContext()
          const renderFrame = state.gl.render.bind(state.gl)
          state.gl.render = (scene: THREE.Scene, camera: THREE.Camera) => {
            renderFrame(scene, camera)
            // @ts-ignore
            context.endFrameEXP()
          }

          return onCreated?.(state)
        },
      })
      root.current.render(
        <Bridge>
          <ErrorBoundary set={setError}>
            <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
          </ErrorBoundary>
        </Bridge>,
      )
    }

    React.useEffect(() => {
      if (canvas) {
        return () => unmountComponentAtNode(canvas!)
      }
    }, [canvas])

    return (
      <View {...props} ref={viewRef} onLayout={onLayout} style={{ flex: 1, ...style }} {...bind}>
        {width > 0 && (
          <GLView msaaSamples={antialias ? 4 : 0} onContextCreate={onContextCreate} style={StyleSheet.absoluteFill} />
        )}
      </View>
    )
  },
)

/**
 * A native canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = React.forwardRef<View, Props>(function CanvasWrapper(props, ref) {
  return (
    <FiberProvider>
      <CanvasImpl {...props} ref={ref} />
    </FiberProvider>
  )
})
