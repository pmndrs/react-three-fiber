import React, { useContext, useEffect, useMemo, useState } from 'react'
import { stateContext } from './canvas'

export function useRender(fn, main) {
  const { subscribe, setManual } = useContext(stateContext)
  // This calls into the host to inform it whether the render-loop is manual or not
  useMemo(() => main && setManual(true), [main])
  useEffect(() => {
    // Subscribe to the render-loop
    const unsubscribe = subscribe(fn, main)
    return () => {
      // Call subscription off on unmount
      unsubscribe()
      if (main) setManual(false)
    }
  }, [])
}

export function useThree(fn) {
  const { subscribe, ...props } = useContext(stateContext)
  return props
}

export function useCamera(instance, ...args) {
  const { size, setDefaultCamera } = useThree()
  const [camera] = useState(() => {
    const camera = new instance(...args)
    setDefaultCamera(camera)
    return camera
  })
  useMemo(() => {
    camera.aspect = size.width / size.height
    camera.radius = (size.width + size.height) / 4
    camera.updateProjectionMatrix()
  }, [size])
  return camera
}

// TODO
export function useSelection() {}
