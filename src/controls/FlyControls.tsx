import React, { forwardRef, useMemo } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { FlyControls as FlyControlsImpl } from 'three/examples/jsm/controls/FlyControls'

export type FlyControls = Overwrite<
  ReactThreeFiber.Object3DNode<FlyControlsImpl, typeof FlyControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

export const FlyControls = forwardRef((props: FlyControls, ref) => {
  const { camera, gl } = useThree()
  const controls = useMemo(() => new FlyControlsImpl(camera, gl.domElement), [camera, gl.domElement])
  useFrame((state, delta) => controls.update(delta))
  return <primitive object={controls} ref={ref} {...props} />
})
