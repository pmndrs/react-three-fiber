import * as React from 'react'
import * as THREE from 'three'
import { View, ViewProps, ViewStyle, LayoutChangeEvent, StyleSheet, PixelRatio } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { SetBlock, Block, ErrorBoundary, useMutableCallback } from '../core/utils'
import { extend, createRoot, unmountComponentAtNode, RenderProps, ReconcilerRoot } from '../core'
import { createTouchEvents } from './events'
import { RootState, Size } from '../core/store'
import { polyfills } from './polyfills'

export interface Props extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'dpr'>, ViewProps {
  children: React.ReactNode
  style?: ViewStyle
}

/**
 * A native canvas which accepts threejs elements as children.
 * @see https://docs.pmnd.rs/react-three-fiber/api/canvas
 */
export const Canvas = /*#__PURE__*/ React.forwardRef<View, Props>(
  (
    {
      children,
      style,
      gl,
      events = createTouchEvents,
      shadows,
      linear,
      flat,
      legacy,
      orthographic,
      frameloop,
      performance,
      raycaster,
      camera,
      onPointerMissed,
      onCreated,
      stages,
      ...props
    },
    forwardedRef,
  ) => {
    // Create a known catalogue of Threejs-native elements
    // This will include the entire THREE namespace by default, users can extend
    // their own elements by using the createRoot API instead
    React.useMemo(() => extend(THREE), [])

    const [{ width, height, top, left }, setSize] = React.useState<Size>({ width: 0, height: 0, top: 0, left: 0 })
    const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null)
    const [bind, setBind] = React.useState<any>()
    React.useImperativeHandle(forwardedRef, () => viewRef.current)

    const handlePointerMissed = useMutableCallback(onPointerMissed)
    const [block, setBlock] = React.useState<SetBlock>(false)
    const [error, setError] = React.useState<Error | undefined>(undefined)

    // Suspend this component if block is a promise (2nd run)
    if (block) throw block
    // Throw exception outwards if anything within canvas throws
    if (error) throw error

    const viewRef = React.useRef<View>(null!)
    const root = React.useRef<ReconcilerRoot<Element>>(null!)

    // Inject and cleanup RN polyfills if able
    React.useLayoutEffect(() => polyfills(), [])

    const onLayout = React.useCallback((e: LayoutChangeEvent) => {
      const { width, height, x, y } = e.nativeEvent.layout
      setSize({ width, height, top: y, left: x })
    }, [])

    // Called on context create or swap
    // https://github.com/pmndrs/react-three-fiber/pull/2297
    const onContextCreate = React.useCallback((context: ExpoWebGLRenderingContext) => {
      const canvasShim = {
        width: context.drawingBufferWidth,
        height: context.drawingBufferHeight,
        style: {},
        addEventListener: (() => {}) as any,
        removeEventListener: (() => {}) as any,
        clientHeight: context.drawingBufferHeight,
        getContext: (() => context) as any,
      } as HTMLCanvasElement

      root.current = createRoot<Element>(canvasShim)
      setCanvas(canvasShim)
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
        stages,
        // expo-gl can only render at native dpr/resolution
        // https://github.com/expo/expo-three/issues/39
        dpr: PixelRatio.get(),
        size: { width, height, top, left },
        // Pass mutable reference to onPointerMissed so it's free to update
        onPointerMissed: (...args) => handlePointerMissed.current?.(...args),
        // Overwrite onCreated to apply RN bindings
        onCreated: (state: RootState) => {
          // Bind events after creation
          const handlers = state.events.connect?.(viewRef.current)
          setBind(handlers)

          // Bind render to RN bridge
          const context = state.gl.getContext() as ExpoWebGLRenderingContext
          const renderFrame = state.gl.render.bind(state.gl)
          state.gl.render = (scene: THREE.Scene, camera: THREE.Camera) => {
            renderFrame(scene, camera)
            context.endFrameEXP()
          }

          return onCreated?.(state)
        },
      })
      root.current.render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
      )
    }

    React.useEffect(() => {
      if (canvas) {
        return () => unmountComponentAtNode(canvas!)
      }
    }, [canvas])

    return (
      <View {...props} ref={viewRef} onLayout={onLayout} style={{ flex: 1, ...style }} {...bind}>
        {width > 0 && <GLView onContextCreate={onContextCreate} style={StyleSheet.absoluteFill} />}
      </View>
    )
  },
)
