import React, { forwardRef, useRef, useEffect } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ OrbitControlsImpl })

export type OrbitControls = Overwrite<
  ReactThreeFiber.Object3DNode<OrbitControlsImpl, typeof OrbitControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
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
    controls.current?.addEventListener('change', invalidate)
    return () => controls.current?.removeEventListener('change', invalidate)
  }, [controls.current])
  return <orbitControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} enableDamping {...props} />
})
