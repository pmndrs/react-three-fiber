import * as THREE from 'three'
import * as React from 'react'
import { View, ViewProps, ViewStyle, LayoutChangeEvent, StyleSheet } from 'react-native'
import { GLView, ExpoWebGLRenderingContext } from 'expo-gl'
import { UseStore } from 'zustand'
import { render, unmountComponentAtNode, RenderProps } from './index'
import { createTouchEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'

export interface Props extends Omit<RenderProps<View>, 'size' | 'events' | 'gl'>, ViewProps {
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

export const Canvas = React.forwardRef<View, Props>(
  ({ children, fallback, style, events, gl: glOptions, ...props }, forwardedRef) => {
    const [context, setContext] = React.useState<(ExpoWebGLRenderingContext & WebGLRenderingContext) | null>(null)
    const [size, setSize] = React.useState({ width: 0, height: 0 })
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

    // Execute JSX in the reconciler as a layout-effect
    useIsomorphicLayoutEffect(() => {
      if (context) {
        const store = render(
          <ErrorBoundary set={setError}>
            <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
          </ErrorBoundary>,
          context,
          { ...props, size, events: events || createTouchEvents },
        )

        const state = store.getState()
        setBind(state.events.connected.getEventHandlers())
      }
    }, [size, children, context])

    useIsomorphicLayoutEffect(() => {
      return () => {
        if (context) unmountComponentAtNode(context)
      }
    }, [])

    return (
      <View
        ref={forwardedRef}
        onLayout={onLayout}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          ...style,
        }}
        {...bind}>
        {size.width > 0 && <GLView onContextCreate={setContext} style={StyleSheet.absoluteFill} />}
      </View>
    )
  },
)
