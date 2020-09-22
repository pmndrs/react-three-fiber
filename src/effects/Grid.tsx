import React, { Ref, forwardRef, useMemo, useLayoutEffect } from 'react'
import { GridEffect } from 'postprocessing'

type GridProps = ConstructorParameters<typeof GridEffect>[0] &
  Partial<{
    size: {
      width: number
      height: number
    }
  }>

export const Grid = forwardRef(function Grid({ size, ...props }: GridProps, ref: Ref<GridEffect>) {
  const effect = useMemo(() => new GridEffect(props), [props])
  useLayoutEffect(() => {
    if (size) effect.setSize(size.width, size.height)
  }, [effect, size])
  return <primitive ref={ref} object={effect} dispose={null} />
})
