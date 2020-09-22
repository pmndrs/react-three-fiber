import React, { forwardRef, useMemo, useEffect } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { FlyControls as FlyControlsImpl } from 'three/examples/jsm/controls/FlyControls'

export type FlyControls = Overwrite<
  ReactThreeFiber.Object3DNode<FlyControlsImpl, typeof FlyControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

export const FlyControls = forwardRef((props: FlyControls, ref) => {
  const { camera, gl, invalidate } = useThree()
  const controls = useMemo(() => new FlyControlsImpl(camera, gl.domElement), [camera, gl.domElement])

  useEffect(() => {
    controls?.addEventListener?.('change', invalidate)
    return () => controls?.removeEventListener?.('change', invalidate)
  }, [controls, invalidate])

  useFrame((_, delta) => controls.update(delta))

  return <primitive dispose={null} object={controls} ref={ref} {...props} />
})
