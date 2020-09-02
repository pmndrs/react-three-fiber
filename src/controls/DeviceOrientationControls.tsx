import React, { forwardRef, useMemo, useEffect } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { DeviceOrientationControls as DeviceOrientationControlsImp } from 'three/examples/jsm/controls/DeviceOrientationControls'

export type DeviceOrientationControls = Overwrite<
  ReactThreeFiber.Object3DNode<DeviceOrientationControlsImp, typeof DeviceOrientationControlsImp>,
  { target?: ReactThreeFiber.Vector3 }
>

export const DeviceOrientationControls = forwardRef((props: DeviceOrientationControls, ref) => {
  const { camera, invalidate } = useThree()
  const controls = useMemo(() => new DeviceOrientationControlsImp(camera), [camera])

  useEffect(() => {
    controls?.addEventListener?.('change', invalidate)
    return () => controls?.removeEventListener?.('change', invalidate)
  }, [controls, invalidate])

  useFrame(() => controls.update())

  useEffect(() => {
    const current = controls
    current.connect()
    return () => current.dispose()
  }, [controls])

  return <primitive object={controls} ref={ref} {...props} />
})
