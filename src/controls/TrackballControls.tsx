import React, { forwardRef, useMemo, useEffect } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { TrackballControls as TrackballControlsImpl } from 'three/examples/jsm/controls/TrackballControls'
import mergeRefs from 'react-merge-refs'

export type TrackballControls = Overwrite<
  ReactThreeFiber.Object3DNode<TrackballControlsImpl, typeof TrackballControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      trackballControlsImpl: TrackballControls
    }
  }
}

export const TrackballControls = forwardRef((props: TrackballControls, ref) => {
  const { camera, gl, invalidate } = useThree()
  const controls = useMemo(() => new TrackballControlsImpl(camera, gl.domElement), [camera, gl])

  useFrame(() => controls.update())
  useEffect(() => {
    controls?.addEventListener?.('change', invalidate)
    return () => controls?.removeEventListener?.('change', invalidate)
  }, [controls, invalidate])

  return <primitive dispose={null} object={controls} ref={mergeRefs([controls, ref])} {...props} />
})
