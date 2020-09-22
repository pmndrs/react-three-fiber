import React, { Ref, forwardRef, useMemo } from 'react'
import { ChromaticAberrationEffect } from 'postprocessing'
import { ReactThreeFiber } from 'react-three-fiber'
import { useVector2 } from '../util'

// type for function args should use constructor args
export type ChromaticAberrationProps = ConstructorParameters<typeof ChromaticAberrationEffect>[0] &
  Partial<{
    offset: ReactThreeFiber.Vector2
  }>

export const ChromaticAberration = forwardRef(function ChromaticAberration(
  props: ChromaticAberrationProps,
  ref: Ref<ChromaticAberrationEffect>
) {
  const offset = useVector2(props, 'offset')
  const effect = useMemo(() => new ChromaticAberrationEffect({ ...props, offset }), [offset, props])
  return <primitive ref={ref} object={effect} dispose={null} />
})
