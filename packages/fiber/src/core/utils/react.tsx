import * as React from 'react'
import { useFiber, traverseFiber, useContextBridge, useActivityBridge as useFineActivityBridge } from 'its-fine'

export type Act = <T = any>(cb: () => Promise<T>) => Promise<T>

/**
 * Safely flush async effects when testing, simulating a legacy root.
 * @deprecated Import from React instead. import { act } from 'react'
 */
// Reference with computed key to break Webpack static analysis
// https://github.com/webpack/webpack/issues/14814
export const act: Act = React[('act' + '') as 'act']

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

export function useMutableCallback<T>(fn: T): React.RefObject<T> {
  const ref = React.useRef<T>(fn)
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn])
  return ref
}

function Gate({ promise, onSettled }: { promise: PromiseLike<unknown>; onSettled: () => void }): null {
  React.use(promise)
  useIsomorphicLayoutEffect(onSettled, [onSettled])
  return null
}

/** Waits for a promise in a null subtree, re-rendering the caller once it settles either way. */
export function useGate(): [gate: React.ReactNode, waitFor: (promise: PromiseLike<unknown>) => void] {
  const [promise, setPromise] = React.useState<PromiseLike<unknown> | null>(null)
  const onSettled = React.useCallback(() => setPromise(null), [])
  // Keep the first promise, or a repeated call would loop
  const waitFor = React.useCallback(
    (next: PromiseLike<unknown>) =>
      setPromise(
        (current) =>
          current ??
          Promise.resolve(next).then(
            () => {},
            () => {},
          ),
      ),
    [],
  )

  const gate = promise ? (
    <React.Suspense fallback={null}>
      <Gate promise={promise} onSettled={onSettled} />
    </React.Suspense>
  ) : null

  return [gate, waitFor]
}

// Activity is optional on React 19.0/19.1. A computed key also supports strict ESM bundlers.
const useActivityBridge = React[('Activity' + '') as keyof typeof React] ? useFineActivityBridge : () => React.Fragment

export type Bridge = React.FC<{ children?: React.ReactNode }>

/**
 * Bridges Context, StrictMode, and Activity visibility from a primary renderer.
 */
export function useBridge(): Bridge {
  const fiber = useFiber()
  const ContextBridge = useContextBridge()
  const ActivityBridge = useActivityBridge()

  return React.useMemo(
    () =>
      ({ children }) => {
        const strict = !!traverseFiber(fiber, true, (node) => node.type === React.StrictMode)
        const Root = strict ? React.StrictMode : React.Fragment

        return (
          <Root>
            <ActivityBridge>
              <ContextBridge>{children}</ContextBridge>
            </ActivityBridge>
          </Root>
        )
      },
    [fiber, ContextBridge, ActivityBridge],
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

// NOTE: static members get down-level transpiled to mutations which break tree-shaking
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
