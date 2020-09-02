import React, { forwardRef, useMemo, useEffect } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { MapControls as MapControlsImpl } from 'three/examples/jsm/controls/OrbitControls'
import mergeRefs from 'react-merge-refs'

export type MapControls = Overwrite<
  ReactThreeFiber.Object3DNode<MapControlsImpl, typeof MapControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mapControlsImpl: MapControls
    }
  }
}

export const MapControls = forwardRef((props: MapControls = { enableDamping: true }, ref) => {
  const { camera, gl, invalidate } = useThree()
  const controls = useMemo(() => new MapControlsImpl(camera, gl.domElement), [camera, gl])

  useFrame(() => controls.update())
  useEffect(() => {
    controls?.addEventListener?.('change', invalidate)
    return () => controls?.removeEventListener?.('change', invalidate)
  }, [controls, invalidate])

  return <primitive object={controls} ref={mergeRefs([controls, ref])} enableDamping {...props} />
})
