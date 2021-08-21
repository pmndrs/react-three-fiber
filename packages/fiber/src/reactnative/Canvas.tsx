/* eslint-disable import/named, import/namespace */
import * as React from 'react'
import { GestureResponderEvent, LayoutChangeEvent, PixelRatio, StyleSheet, View, ViewStyle } from 'react-native'
import useMeasure, { Options as ResizeOptions, RectReadOnly } from 'react-use-measure'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createPointerEvents } from './events'
import { UseStore } from 'zustand'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'

/*
Understanding of the old Renderer for react native
- created renderer (THREE.WebGLRenderer (Expo's own)) after getting gl context from the GLView
- pass renderer out via the useCanvas hook that is called in the IsReady functional component
- The useCanvas hook passes children into the renderer via context providers

*/

// interface NativeCanvasProps extends CanvasProps {
//   style?: ViewStyle
//   nativeRef_EXPERIMENTAL?: React.MutableRefObject<any>
//   onContextCreated?: (gl: ExpoWebGLRenderingContext) => Promise<any> | void
// }
function clientXY(e: GestureResponderEvent) {
  ;(e as any).clientX = e.nativeEvent.pageX
  ;(e as any).clientY = e.nativeEvent.pageY
  return e
}

export interface Props
  extends Omit<RenderProps<HTMLCanvasElement>, 'size' | 'events' | 'gl'>,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  children: React.ReactNode
  fallback?: React.ReactNode
  resize?: ResizeOptions
  events?: (store: UseStore<RootState>) => EventManager<any>
  style?: ViewStyle
  onContextCreated?: (gl: ExpoWebGLRenderingContext) => Promise<any> | void

  /** The ref to the underlying Expo GLView for access to camera texture creation, etc */
  glViewRef?: React.RefObject<GLView>
}

type SetBlock = false | Promise<null> | null
type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect in the browser.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

function Block({ set }: Omit<UnblockProps, 'children'>) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [])
  return null
}

class ErrorBoundary extends React.Component<{ set: React.Dispatch<any> }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error: any) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

// Side note : If we don't provide dpr to be defaulted to PixelRatio.get(), we'll just be rendering into a single small quadrant in the left lower quadrant ._.
export function Canvas({
  children,
  fallback,
  tabIndex,
  resize,
  id,
  style,
  className,
  events,
  dpr = PixelRatio.get(),
  glViewRef,
  ...props
}: Props) {
  const [size, setSize] = React.useState({ x: 0, y: 0, width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 })
  // const [ref, size] = useMeasure({ scroll: true, debounce: { scroll: 50, resize: 0 }, ...resize })
  // const canvas = React.useRef<HTMLCanvasElement>(null!)

  const canvas = React.useRef<HTMLCanvasElement | null>(null)

  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  const [glContext, setGLContext] =
    React.useState<(ExpoWebGLRenderingContext & WebGLRenderingContext) | undefined>(undefined)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const layoutcb = React.useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout
    setSize({
      x,
      y,
      width,
      height,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
    }) // Behavior copied from original code in v5
    const cv = canvas.current

    // Update width and height of canvas on layout
    if (cv) {
      cv.width = width
      cv.height = height
      ;(cv as any).clientHeight = height
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    // When we mount, we create a new "canvas" shim object.
    canvas.current = {
      width: 0,
      height: 0,
      style: {
        // width: 0,
        // height: 0
      } as any,
      addEventListener: (() => {}) as any,
      removeEventListener: (() => {}) as any,
      clientHeight: 0,
    } as HTMLCanvasElement

    // On unmount, the unmountComponentAtNode thing will perform its work removing the canvas.
    // Let's just not delete this thing manually. It'll just be replaced by a new object when it's newly mounted.
  }, [])

  // Fired when EXGL context is initialized
  const onContextCreate = async (gl: ExpoWebGLRenderingContext & WebGLRenderingContext) => {
    if (props.onContextCreated) {
      // Allow customization of the GL Context
      // Useful for AR, VR and others
      await props.onContextCreated(gl)
    }

    const cv = canvas.current
    if (cv) {
      cv.width = gl.drawingBufferWidth
      cv.height = gl.drawingBufferHeight
      ;(cv as any).clientHeight = gl.drawingBufferHeight
    }
    setGLContext(gl)
    // ({
    //   width: gl.drawingBufferWidth,
    //   height: gl.drawingBufferHeight,
    //   style: {
    //     width: gl.drawingBufferWidth,
    //     height: gl.drawingBufferHeight
    //   } as any,
    //   addEventListener: (() => {}) as any,
    //   removeEventListener: (() => {}) as any,
    //   clientHeight: gl.drawingBufferHeight,
    // } as HTMLCanvasElement);
    // const pixelRatio = PixelRatio.get()

    // const renderer = new Renderer({
    //   gl,
    //   width: size!.width / pixelRatio,
    //   height: size!.height / pixelRatio,
    //   pixelRatio,
    // })

    // // Bind previous render method to Renderer
    // const rendererRender = renderer.render.bind(renderer)
    // renderer.render = (scene, camera) => {
    //   rendererRender(scene, camera)
    //   // End frame through the RN Bridge
    //   gl.endFrameEXP()
    // }

    // setRenderer(renderer)
  }

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    if (glContext && canvas.current) {
      console.log('rendering')
      render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
        canvas.current,
        { ...props, dpr, size, events: events || createPointerEvents, gl: glContext },
      )
    }
  }, [size, children, glContext])

  useIsomorphicLayoutEffect(() => {
    return () => {
      if (canvas.current) unmountComponentAtNode(canvas.current)
    }
  }, [])

  return (
    <View
      onLayout={layoutcb}
      style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      {size.width > 0 && (
        <GLView
          ref={glViewRef}
          // nativeRef_EXPERIMENTAL={setNativeRef}
          onContextCreate={onContextCreate}
          style={StyleSheet.absoluteFill}
        />
      )}
      {
        glContext && <View style={{ ...StyleSheet.absoluteFillObject }} /> // TODO: MAKE THIS VIEW HANDLE THE POINTER EVENTS LIKE IN PREVIOUS VERSION
      }
    </View>
  )
}
