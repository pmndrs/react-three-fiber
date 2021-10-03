import * as THREE from 'three'
import * as React from 'react'
import { LayoutChangeEvent, StyleSheet, View, ViewStyle, PixelRatio } from 'react-native'
import { UseStore } from 'zustand'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createTouchEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'

export interface Props extends Omit<RenderProps<View>, 'size' | 'events' | 'gl'>, React.Component<View> {
  gl?: Partial<THREE.WebGLRendererParameters>
  children: React.ReactNode
  fallback?: React.ReactNode
  style?: ViewStyle
  events?: (store: UseStore<RootState>) => EventManager<any>
}

type SetBlock = false | Promise<null> | null
type UnblockProps = {
  set: React.Dispatch<React.SetStateAction<SetBlock>>
  children: React.ReactNode
}

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

export function Canvas({ children, fallback, style, events, gl: glOptions, ...props }: Props) {
  const containerRef = React.useRef<View | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })
  const [rendererImpl, setRendererImpl] = React.useState<THREE.WebGLRenderer | undefined>(undefined)
  const [bind, setBind] = React.useState()
  const [block, setBlock] = React.useState<SetBlock>(false)
  const [error, setError] = React.useState<any>(false)

  // Suspend this component if block is a promise (2nd run)
  if (block) throw block
  // Throw exception outwards if anything within canvas throws
  if (error) throw error

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setSize({ width, height })
  }, [])

  const onContextCreate = React.useCallback((gl: ExpoWebGLRenderingContext & WebGLRenderingContext) => {
    const canvas = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      style: {},
      addEventListener: (() => {}) as any,
      removeEventListener: (() => {}) as any,
      clientHeight: gl.drawingBufferHeight,
    } as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
      ...(glOptions as any),
      canvas,
      context: gl,
    })
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight)

    const pixelRatio = PixelRatio.get()
    renderer.setPixelRatio(pixelRatio)

    const renderFrame = renderer.render.bind(renderer)
    renderer.render = (scene: THREE.Scene, camera: THREE.Camera) => {
      renderFrame(scene, camera)
      // End frame through the RN Bridge
      gl.endFrameEXP()
    }

    setRendererImpl(renderer)
  }, [])

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    if (rendererImpl && containerRef.current) {
      const state = render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
        containerRef.current,
        { ...props, size, events: events || createTouchEvents, gl: rendererImpl },
      ).getState()

      setBind(state.events.connected.getEventHandlers())
    }
  }, [size, children, rendererImpl])

  useIsomorphicLayoutEffect(() => {
    return () => {
      if (containerRef.current) unmountComponentAtNode(containerRef.current)
    }
  }, [])

  return (
    <View
      ref={containerRef}
      onLayout={onLayout}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
      {...bind}>
      {size.width > 0 && <GLView onContextCreate={onContextCreate} style={StyleSheet.absoluteFill} />}
    </View>
  )
}
