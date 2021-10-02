import * as React from 'react'
import { LayoutChangeEvent, PixelRatio, StyleSheet, View, ViewStyle } from 'react-native'
import { UseStore } from 'zustand'
import { render, unmountComponentAtNode, RenderProps } from './index'
// import { createTouchEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'

export interface Props extends Omit<RenderProps<GLView>, 'size' | 'events' | 'gl'>, React.HTMLAttributes<View> {
  children: React.ReactNode
  fallback?: React.ReactNode
  events?: (store: UseStore<RootState>) => EventManager<any>
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

export function Canvas({ children, fallback, tabIndex, id, style, className, events, ...props }: Props) {
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  const [glContext, setGLContext] = React.useState<(ExpoWebGLRenderingContext & WebGLRenderingContext) | undefined>(
    undefined,
  )

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize({ width, height })

    // Update width and height of canvas on layout
    if (canvasRef.current) {
      canvasRef.current.width = width
      canvasRef.current.height = height
      ;(canvasRef.current as any).clientHeight = height
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    // When we mount, we create a new "canvas" shim object.
    canvasRef.current = {
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
    if (canvasRef.current) {
      canvasRef.current.width = gl.drawingBufferWidth
      canvasRef.current.height = gl.drawingBufferHeight
      ;(canvasRef.current as any).clientHeight = gl.drawingBufferHeight
    }
    setGLContext(gl)
  }

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    if (glContext && canvasRef.current) {
      render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
        canvasRef.current,
        { ...props, size, gl: glContext },
      )
    }
  }, [size, children, glContext])

  useIsomorphicLayoutEffect(() => {
    return () => {
      if (canvasRef.current) unmountComponentAtNode(canvasRef.current)
    }
  }, [])

  return (
    <View
      onLayout={onLayout}
      style={{ position: 'absolute', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      {size.width > 0 && <GLView onContextCreate={onContextCreate} style={StyleSheet.absoluteFill} />}
    </View>
  )
}
