import * as THREE from 'three'
import React, { forwardRef, useMemo, useEffect, createContext, useRef, useImperativeHandle } from 'react'
import { useThree, useFrame } from 'react-three-fiber'
import { EffectComposer as EffectComposerImpl, RenderPass, EffectPass, NormalPass } from 'postprocessing'
import { HalfFloatType, TextureDataType } from 'three'
import { isWebGL2Available } from './util'

export const EffectComposerContext = createContext<{
  composer: EffectComposerImpl
  normalPass: NormalPass
  camera: THREE.Camera
  scene: THREE.Scene
}>(null)

export type EffectComposerProps = {
  children: JSX.Element | JSX.Element[]
  depthBuffer?: boolean
  stencilBuffer?: boolean
  multisampling?: number
  frameBufferType?: TextureDataType
  renderPriority?: number
  camera?: THREE.Camera
  scene?: THREE.Scene
}

const EffectComposer = React.memo(
  forwardRef(
    (
      {
        children,
        camera,
        scene,
        renderPriority = 1,
        depthBuffer,
        stencilBuffer,
        multisampling = 8,
        frameBufferType = HalfFloatType,
      }: EffectComposerProps,
      ref
    ) => {
      const { gl, scene: defaultScene, camera: defaultCamera, size } = useThree()
      scene = scene || defaultScene
      camera = camera || defaultCamera

      const pixelRatio = gl.getPixelRatio()
      const [composer, normalPass] = useMemo(() => {
        // Initialize composer
        const effectComposer = new EffectComposerImpl(gl, {
          depthBuffer,
          stencilBuffer,
          multisampling: isWebGL2Available() ? multisampling : 0,
          frameBufferType,
        })
        // Add render pass
        effectComposer.addPass(new RenderPass(scene, camera))
        // Create normal pass
        const pass = new NormalPass(scene, camera)
        effectComposer.addPass(pass)
        return [effectComposer, pass]
      }, [camera, gl, depthBuffer, stencilBuffer, multisampling, frameBufferType, scene])

      useEffect(() => {
        composer?.setSize(size.width * pixelRatio, size.height * pixelRatio)
      }, [composer, size, pixelRatio])
      useFrame((_, delta) => composer.render(delta), renderPriority)

      const group = useRef()
      useEffect(() => {
        let effectPass
        if (group.current && composer) {
          effectPass = new EffectPass(camera, ...(group.current as any).__objects)
          composer.addPass(effectPass)
          effectPass.renderToScreen = true
        }
        return () => {
          if (effectPass) composer?.removePass(effectPass)
        }
      }, [composer, camera])

      // Memoize state, otherwise it would trigger all consumers on every render
      const state = useMemo(() => ({ composer, normalPass, camera, scene }), [composer, normalPass, camera, scene])

      // Expose the composer
      useImperativeHandle(ref, () => composer, [composer])

      return (
        <EffectComposerContext.Provider value={state}>
          <group ref={group}>{children}</group>
        </EffectComposerContext.Provider>
      )
    }
  )
)

export default EffectComposer
