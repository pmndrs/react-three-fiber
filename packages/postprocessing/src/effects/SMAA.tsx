import React, { Ref, forwardRef, useLayoutEffect, useMemo } from 'react'
import { useLoader } from 'react-three-fiber'
import { SMAAImageLoader, SMAAEffect } from 'postprocessing'

export const SMAA = forwardRef(function SMAA(
  { edgeDetection = 0.1 }: { edgeDetection?: number },
  ref: Ref<SMAAEffect>
) {
  const smaaProps: [any, any] = useLoader(SMAAImageLoader, '' as any)
  const effect = useMemo(() => new SMAAEffect(...smaaProps), [smaaProps])
  useLayoutEffect(() => void effect.colorEdgesMaterial.setEdgeDetectionThreshold(edgeDetection), [
    edgeDetection,
    effect.colorEdgesMaterial,
  ])
  return <primitive ref={ref} object={effect} dispose={null} />
})
