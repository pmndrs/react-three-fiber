import React, { useRef, useContext, useEffect, useMemo, useState } from 'react'
import { stateContext } from './canvas'

export function useRender(fn, takeOverRenderloop) {
  const { subscribe, setManual } = useContext(stateContext)
  // This calls into the host to inform it whether the render-loop is manual or not
  useMemo(() => takeOverRenderloop && setManual(true), [takeOverRenderloop])
  useEffect(() => {
    // Subscribe to the render-loop
    const unsubscribe = subscribe(fn, takeOverRenderloop)
    return () => {
      // Call subscription off on unmount
      unsubscribe()
      if (takeOverRenderloop) setManual(false)
    }
  }, [])
}

export function useThree() {
  const { subscribe, ...props } = useContext(stateContext)
  return props
}

export function useUpdate(callback, dependents, optionalRef) {
  const { invalidate } = useContext(stateContext)
  let ref = useRef()
  if (optionalRef) ref = optionalRef
  useEffect(() => {
    callback(ref.current)
    invalidate()
  }, dependents)
  return ref
}
