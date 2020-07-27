import React, { forwardRef, useRef, useEffect } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { DeviceOrientationControls as DeviceOrientationControlsImp } from 'three/examples/jsm/controls/DeviceOrientationControls'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ DeviceOrientationControlsImp })

export type DeviceOrientationControls = Overwrite<
  ReactThreeFiber.Object3DNode<DeviceOrientationControlsImp, typeof DeviceOrientationControlsImp>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      deviceOrientationControlsImp: DeviceOrientationControls
    }
  }
}

export const DeviceOrientationControls = forwardRef((props: DeviceOrientationControls, ref) => {
  const controls = useRef<DeviceOrientationControlsImp>()
  const { camera } = useThree()
  useFrame(() => controls.current?.update())
  useEffect(() => {
    const currentControl = controls.current
    currentControl?.connect()
    return () => currentControl?.dispose()
  })
  return <deviceOrientationControlsImp ref={mergeRefs([controls, ref])} args={[camera]} {...props} />
})
