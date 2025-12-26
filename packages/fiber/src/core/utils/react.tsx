import * as React from 'react'
import { useFiber, traverseFiber, useContextBridge } from 'its-fine'
import type { Bridge, UnblockProps } from '#types'

//* React Utilities ==============================
// React-specific hooks, components, and utilities for R3F

/**
 * Safely flush async effects when testing, simulating a legacy root.
 * @deprecated Import from React instead. import { act } from 'react'
 */
// Reference with computed key to break Webpack static analysis
// https://github.com/webpack/webpack/issues/14814
export const act: typeof React.act = React[('act' + '') as 'act']

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
export const useIsomorphicLayoutEffect = /* @__PURE__ */ (() =>
  typeof window !== 'undefined' && (window.document?.createElement || window.navigator?.product === 'ReactNative'))()
  ? React.useLayoutEffect
  : React.useEffect

/**
 * Creates a stable ref that always contains the latest callback.
 * Useful for avoiding dependency arrays while ensuring the latest closure is called.
 *
 * @param fn - The callback function to wrap
 * @returns A ref containing the current callback
 */
export function useMutableCallback<T>(fn: T): React.RefObject<T> {
  const ref = React.useRef<T>(fn)
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn])
  return ref
}

/**
 * Bridges renderer Context and StrictMode from a primary renderer.
 * Used to maintain React context when rendering into portals or secondary canvases.
 *
 * @returns A Bridge component that wraps children with the parent renderer's context
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

/**
 * Internal component that blocks rendering until a promise resolves.
 * Used for suspense-like blocking behavior.
 *
 * @param set - Function to set the blocking promise
 */
export function Block({ set }: Omit<UnblockProps, 'children'>) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [set])
  return null
}

/**
 * Error boundary component for catching and handling errors in the React tree.
 * Forwards errors to a state setter for external handling.
 *
 * NOTE: static members get down-level transpiled to mutations which break tree-shaking
 */
export const ErrorBoundary = /* @__PURE__ */ (() =>
  class ErrorBoundary extends React.Component<
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
  })()
