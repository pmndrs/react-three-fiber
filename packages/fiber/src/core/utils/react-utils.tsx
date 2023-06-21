import { Fiber, traverseFiber, useContextBridge, useFiber } from 'its-fine'
import React from 'react'
import { RootState } from '../store'
import { Instance } from '../reconciler'

export const REACT_INTERNAL_PROPS = ['children', 'key', 'ref']

export const isRef = (obj: any): obj is React.MutableRefObject<unknown> => obj && obj.hasOwnProperty('current')

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' && (window.document?.createElement || window.navigator?.product === 'ReactNative')
    ? React.useLayoutEffect
    : React.useEffect

export function useMutableCallback<T>(fn: T): React.MutableRefObject<T> {
  const ref = React.useRef<T>(fn)
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn])
  return ref
}

export type Bridge = React.FC<{ children?: React.ReactNode }>

/**
 * Bridges renderer Context and StrictMode from a primary renderer.
 */
export function useBridge(): Bridge {
  const fiber = useFiber()
  const ContextBridge = useContextBridge()

  return React.useMemo(
    () =>
      ({ children }) => {
        const strict = !!traverseFiber(fiber, true, (node) => node.type === React.StrictMode)
        const Root = strict ? React.StrictMode : React.Fragment

        return (
          <Root>
            <ContextBridge>{children}</ContextBridge>
          </Root>
        )
      },
    [fiber, ContextBridge],
  )
}

export type SetBlock = false | Promise<null> | null
export type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

export function Block({ set }: Omit<UnblockProps, 'children'>) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [set])
  return null
}

export class ErrorBoundary extends React.Component<
  { set: React.Dispatch<Error | undefined>; children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(err: Error) {
    this.props.set(err)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

/**
 * Returns instance root state
 */
export const getRootState = <T = THREE.Object3D,>(obj: T): RootState | undefined => {
  return (obj as Instance<T>['object']).__r3f?.root.getState()
}
