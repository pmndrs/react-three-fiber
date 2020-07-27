import React, { forwardRef, useRef } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { FlyControls as FlyControlsImpl } from 'three/examples/jsm/controls/FlyControls'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ FlyControlsImpl })

export type FlyControls = Overwrite<
  ReactThreeFiber.Object3DNode<FlyControlsImpl, typeof FlyControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      flyControlsImpl: FlyControls
    }
  }
}

export const FlyControls = forwardRef((props: FlyControls, ref) => {
  const controls = useRef<FlyControlsImpl>()
  const { camera, gl } = useThree()
  useFrame((state, delta) => controls.current?.update(delta))
  return <flyControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} {...props} />
})
