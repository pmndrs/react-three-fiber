import React, { useContext, useEffect } from 'react'
import { stateContext } from './canvas'

export function useRender(fn, main) {
  const { subscribe } = useContext(stateContext)
  useEffect(() => subscribe(fn, main), [])
}

export function useThree(fn) {
  const { subscribe, ...props } = useContext(stateContext)
  return props
}

// TODO
export function useSelection() {}
