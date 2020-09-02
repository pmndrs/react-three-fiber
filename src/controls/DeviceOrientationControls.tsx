import React, { forwardRef, useMemo, useEffect } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { DeviceOrientationControls as DeviceOrientationControlsImp } from 'three/examples/jsm/controls/DeviceOrientationControls'

export type DeviceOrientationControls = Overwrite<
  ReactThreeFiber.Object3DNode<DeviceOrientationControlsImp, typeof DeviceOrientationControlsImp>,
  { target?: ReactThreeFiber.Vector3 }
>

export const DeviceOrientationControls = forwardRef((props: DeviceOrientationControls, ref) => {
  const { camera } = useThree()
  const controls = useMemo(() => new DeviceOrientationControlsImp(camera), [camera])
  useFrame((state, delta) => controls.update(delta))
  useEffect(() => {
    const current = controls
    current.connect()
    return () => current.dispose()
  }, [])
  return <primitive object={controls} ref={ref} {...props} />
})
