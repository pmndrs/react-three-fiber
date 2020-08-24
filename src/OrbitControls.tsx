import React, { forwardRef, useRef, useEffect } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls'
import mergeRefs from 'react-merge-refs'

extend({ OrbitControlsImpl })

export type OrbitControls = Overwrite<
  ReactThreeFiber.Object3DNode<OrbitControlsImpl, typeof OrbitControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControlsImpl: OrbitControls
    }
  }
}

export const OrbitControls = forwardRef((props: OrbitControls = { enableDamping: true }, ref) => {
  const controls = useRef<OrbitControlsImpl>()
  const { camera, gl, invalidate } = useThree()
  useFrame(() => controls.current?.update())
  useEffect(() => {
    const _controls = controls.current
    _controls?.addEventListener('change', invalidate)
    return () => _controls?.removeEventListener('change', invalidate)
  }, [invalidate])
  return <orbitControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} enableDamping {...props} />
})
