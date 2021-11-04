import * as React from 'react'
import { View, ViewProps, ViewStyle, LayoutChangeEvent, StyleSheet } from 'react-native'
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl'
import { UseStore } from 'zustand'
import pick from 'lodash-es/pick'
import omit from 'lodash-es/omit'
import { GLContext, render, unmountComponentAtNode, RenderProps } from './index'
import { createTouchEvents } from './events'
import { RootState } from '../core/store'
import { EventManager } from '../core/events'

export interface Props extends Omit<RenderProps<View>, 'size' | 'events'>, ViewProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  style?: ViewStyle
  events?: (store: UseStore<RootState>) => EventManager<any>
  nativeRef_EXPERIMENTAL?: React.MutableRefObject<any>
  onContextCreate?: (gl: ExpoWebGLRenderingContext) => Promise<any> | void
}

type SetBlock = false | Promise<null> | null
type UnblockProps = {
  set: React.Dispatch<React.SetStateAction<SetBlock>>
  children: React.ReactNode
}

const CANVAS_PROPS = [
  'gl',
  'shadows',
  'linear',
  'flat',
  'vr',
  'orthographic',
  'frameloop',
  // 'dpr',
  'performance',
  'clock',
  'raycaster',
  'camera',
  'onPointerMissed',
]

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
  ({ children, fallback, style, events, nativeRef_EXPERIMENTAL, onContextCreate, ...props }, forwardedRef) => {
    const canvasProps = pick(props, CANVAS_PROPS)
    const viewProps = omit(props, CANVAS_PROPS)
    const [context, setContext] = React.useState<GLContext | null>(null)
    const [{ width, height }, setSize] = React.useState({ width: 0, height: 0 })
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
      if (width > 0 && height > 0 && context) {
        const store = render(
          <ErrorBoundary set={setError}>
            <React.Suspense fallback={<Block set={setBlock} />}>{children}</React.Suspense>
          </ErrorBoundary>,
          context,
          { ...canvasProps, size: { width, height }, events: events || createTouchEvents },
        )

        const state = store.getState()
        setBind(state.events.connected.getEventHandlers())
      }
    }, [width, height, children, context, canvasProps])

    useIsomorphicLayoutEffect(() => {
      return () => {
        if (context) unmountComponentAtNode(context)
      }
    }, [])

    return (
      <View {...viewProps} ref={forwardedRef} onLayout={onLayout} style={{ flex: 1, ...style }} {...bind}>
        {width > 0 && (
          <GLView
            nativeRef_EXPERIMENTAL={(ref: any) => {
              if (nativeRef_EXPERIMENTAL && !nativeRef_EXPERIMENTAL.current) {
                nativeRef_EXPERIMENTAL.current = ref
              }
            }}
            onContextCreate={async (gl) => {
              await onContextCreate?.(gl)
              setContext(gl)
            }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>
    )
  },
)
