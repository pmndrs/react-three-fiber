import * as React from 'react'
import { LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native'
import { UseStore } from 'zustand'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createTouchEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'

export interface Props extends Omit<RenderProps<View>, 'size' | 'events' | 'gl'>, React.Component<View> {
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

export function Canvas({ children, fallback, style, events, ...props }: Props) {
  const containerRef = React.useRef<View | null>(null)
  const [size, setSize] = React.useState({ width: 0, height: 0 })
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
  }, [])

  // Execute JSX in the reconciler as a layout-effect
  useIsomorphicLayoutEffect(() => {
    if (glContext && containerRef.current) {
      render(
        <ErrorBoundary set={setError}>
          <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
        </ErrorBoundary>,
        containerRef.current,
        { ...props, size, events: events || createTouchEvents, gl: glContext },
      )
    }
  }, [size, children, glContext])

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
      }}>
      {size.width > 0 && <GLView onContextCreate={setGLContext} style={StyleSheet.absoluteFill} />}
    </View>
  )
}
