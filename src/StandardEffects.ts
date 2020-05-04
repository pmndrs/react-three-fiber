import { HalfFloatType } from 'three'
import { useMemo, useEffect } from 'react'
import { useLoader, useThree, useFrame } from 'react-three-fiber'
import {
  SMAAImageLoader,
  BlendFunction,
  KernelSize,
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  SMAAEffect,
  SSAOEffect,
  NormalPass,
  // @ts-ignore
} from 'postprocessing'

type Props = {
  bloom: boolean | BloomProps
  ao: boolean | AOProps
  edgeDetection: number
  bloomOpacity: number
}

type BloomProps = {
  opacity?: number
  blendFunction?: number
  kernelSize?: number
  luminanceThreshold?: number
  luminanceSmoothing?: number
  height?: number
}

type AOProps = {
  blendFunction?: number
  samples?: number
  rings?: number
  distanceThreshold?: number
  distanceFalloff?: number
  rangeThreshold?: number
  rangeFalloff?: number
  luminanceInfluence?: number
  radius?: number
  scale?: number
  bias?: number
}

export function StandardEffects({ ao = true, bloom = true, edgeDetection = 0.1, bloomOpacity = 1 }: Props) {
  const { gl, scene, camera, size } = useThree()
  const smaa: any = useLoader(SMAAImageLoader, '')
  const composer = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: HalfFloatType })
    composer.addPass(new RenderPass(scene, camera))
    const smaaEffect = new SMAAEffect(...smaa)
    smaaEffect.colorEdgesMaterial.setEdgeDetectionThreshold(edgeDetection)

    const normalPass = new NormalPass(scene, camera)
    const ssaoEffect = new SSAOEffect(camera, normalPass.renderTarget.texture, {
      blendFunction: BlendFunction.MULTIPLY,
      samples: 30,
      rings: 4,
      distanceThreshold: 1.0,
      distanceFalloff: 0.0,
      rangeThreshold: 0.5,
      rangeFalloff: 0.1,
      luminanceInfluence: 0.9,
      radius: 20,
      scale: 0.5,
      bias: 0.5,
      ...(ao as AOProps),
    })

    const bloomEffect = new BloomEffect({
      opacity: 1,
      blendFunction: BlendFunction.SCREEN,
      kernelSize: KernelSize.VERY_LARGE,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.07,
      height: 600,
      ...(bloom as BloomProps),
    })

    bloomEffect.blendMode.opacity.value = bloomOpacity

    const effects = [camera, smaaEffect, ssaoEffect]
    if (ao) effects.push(ssaoEffect)
    if (bloom) effects.push(bloomEffect)

    const effectPass = new EffectPass(...effects)
    effectPass.renderToScreen = true
    composer.addPass(normalPass)
    composer.addPass(effectPass)
    return composer
  }, [camera, gl, scene, smaa])

  useEffect(() => void composer.setSize(size.width, size.height), [composer, size])
  return useFrame((_, delta) => composer.render(delta), 1)
}
