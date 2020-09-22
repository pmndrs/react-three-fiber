import { GodRaysEffect } from 'postprocessing'
import React, { Ref, forwardRef, useMemo, useContext } from 'react'
import { Mesh, Points } from 'three'
import { EffectComposerContext } from '../EffectComposer'

type GodRaysProps = ConstructorParameters<typeof GodRaysEffect>[2] & {
  sun: Mesh | Points
}

export const GodRays = forwardRef(function GodRays(props: GodRaysProps, ref: Ref<GodRaysEffect>) {
  const { camera } = useContext(EffectComposerContext)
  const effect = useMemo(() => new GodRaysEffect(camera, props.sun, props), [camera, props])
  return <primitive ref={ref} object={effect} dispose={null} />
})
