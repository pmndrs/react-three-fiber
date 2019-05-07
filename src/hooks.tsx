import { useRef, useContext, useEffect, useMemo, useState } from 'react'
import { stateContext, CanvasContext } from './canvas'

// helper type for omitting properties from types
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export function useRender(fn: Function, takeOverRenderloop: boolean): void {
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
  }, [])
}

export function useThree(): Omit<CanvasContext, 'subscribe'> {
  const { subscribe, ...props } = useContext(stateContext)
  return props
}

export function useUpdate(
  callback: Function,
  dependents: [],
  optionalRef: React.MutableRefObject<any>
): React.MutableRefObject<any> {
  const { invalidate } = useContext(stateContext)
  const ref = optionalRef ? optionalRef : useRef()

  useEffect(() => {
    callback(ref.current)
    invalidate()
  }, dependents)

  return ref
}

export function useResource(optionalRef: React.MutableRefObject<any>): React.MutableRefObject<any> {
  const [resource, set] = useState()
  const ref = optionalRef ? optionalRef : useRef()

  useEffect(() => void set(ref.current), [ref.current])

  return resource
}
