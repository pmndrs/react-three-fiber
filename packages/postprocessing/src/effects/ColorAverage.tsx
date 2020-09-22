import { ColorAverageEffect, BlendFunction } from 'postprocessing'
import React, { Ref, ForwardRefExoticComponent, forwardRef, useMemo } from 'react'

export type ColorAverageProps = Partial<{
  blendFunction: BlendFunction
}>

export const ColorAverage: ForwardRefExoticComponent<ColorAverageProps> = forwardRef(function ColorAverage(
  { blendFunction = BlendFunction.NORMAL }: ColorAverageProps,
  ref: Ref<ColorAverageEffect>
) {
  /** Because ColorAverage blendFunction is not an object but a number, we have to define a custom prop "blendFunction" */
  const effect = useMemo(() => new ColorAverageEffect(blendFunction), [blendFunction])
  return <primitive ref={ref} object={effect} dispose={null} />
})
