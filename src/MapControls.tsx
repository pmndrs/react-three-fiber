import React, { forwardRef, useRef, useEffect } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { MapControls as MapControlsImpl } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ MapControlsImpl })

export type MapControls = Overwrite<
  ReactThreeFiber.Object3DNode<MapControlsImpl, typeof MapControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      mapControlsImpl: MapControls
    }
  }
}

export const MapControls = forwardRef((props: MapControls = { enableDamping: true }, ref) => {
  const controls = useRef<MapControlsImpl>()
  const { camera, gl, invalidate } = useThree()
  useFrame(() => controls.current?.update())
  useEffect(() => {
    controls.current?.addEventListener('change', invalidate)
    return () => controls.current?.removeEventListener('change', invalidate)
  }, [controls.current])
  return <mapControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} enableDamping {...props} />
})
