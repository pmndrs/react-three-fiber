import { useRef, useContext, useEffect, useMemo, useState } from 'react'
import { stateContext, CanvasContext } from './canvas'

// helper type for omitting properties from types
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export function useRender(fn: Function, takeOverRenderloop: boolean = false, deps: any[] = []): void {
  const { subscribe, setManual } = useContext(stateContext)

  // This calls into the host to inform it whether the render-loop is manual or not
  useMemo(() => takeOverRenderloop && setManual(true), [takeOverRenderloop])

  useEffect(() => {
    // Subscribe to the render-loop
    const unsubscribe = subscribe(fn)

    return () => {
      // Call subscription off on unmount
      unsubscribe()
      if (takeOverRenderloop) setManual(false)
    }
  }, deps)
}

export function useFrame(fn: Function, deps: any[] = []): void {
  useRender(fn, false, deps)
}

export function useGl(fn: Function, deps: any[] = []): void {
  useRender(fn, true, deps)
}

export function useThree(): Omit<CanvasContext, 'subscribe'> {
  const { subscribe, ...props } = useContext(stateContext)
  return props
}

export function useUpdate(
  callback: Function,
  dependents: any[],
  optionalRef?: React.MutableRefObject<any>
): React.MutableRefObject<any> {
  const { invalidate } = useContext(stateContext)
  const localRef = useRef()
  const ref = optionalRef ? optionalRef : localRef

  useEffect(() => {
    callback(ref.current)
    invalidate()
  }, dependents)

  return ref
}

export function useResource(optionalRef?: React.MutableRefObject<any>): any {
  const [resource, set] = useState()
  const localRef = useRef()
  const ref = optionalRef ? optionalRef : localRef
  useEffect(() => void set(ref.current), [ref.current])
  return [ref, resource]
}
