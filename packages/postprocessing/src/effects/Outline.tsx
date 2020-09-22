import { OutlineEffect } from 'postprocessing'
import React, {
  Ref,
  MutableRefObject,
  forwardRef,
  useMemo,
  useEffect,
  useContext,
  useRef,
  useLayoutEffect,
} from 'react'
import { Object3D } from 'three'
import { EffectComposerContext } from '../EffectComposer'

type ObjectRef = MutableRefObject<Object3D>

export type OutlineProps = ConstructorParameters<typeof OutlineEffect>[2] &
  Partial<{
    selection: ObjectRef | ObjectRef[]
    selectionLayer: number
  }>

export const Outline = forwardRef(function Outline(
  {
    selection = [],
    selectionLayer = 10,
    blendFunction,
    patternTexture,
    edgeStrength,
    pulseSpeed,
    visibleEdgeColor,
    hiddenEdgeColor,
    width,
    height,
    kernelSize,
    blur,
    xRay,
    ...props
  }: OutlineProps,
  ref: Ref<OutlineEffect>
) {
  const { scene, camera } = useContext(EffectComposerContext)
  const effect = useMemo(
    () =>
      new OutlineEffect(scene, camera, {
        blendFunction,
        patternTexture,
        edgeStrength,
        pulseSpeed,
        visibleEdgeColor,
        hiddenEdgeColor,
        width,
        height,
        kernelSize,
        blur,
        xRay,
      }),
    [
      blendFunction,
      blur,
      camera,
      edgeStrength,
      height,
      hiddenEdgeColor,
      kernelSize,
      patternTexture,
      pulseSpeed,
      scene,
      visibleEdgeColor,
      width,
      xRay,
    ]
  )

  useEffect(() => {
    effect.clearSelection()
    effect.setSelection(Array.isArray(selection) ? selection.map((ref) => ref.current) : [selection.current])
  }, [effect, selection])

  useEffect(() => {
    console.log('selection layarer')
    effect.selectionLayer = selectionLayer
  }, [effect, selectionLayer])

  return <primitive ref={ref} object={effect} dispose={null} />
})
