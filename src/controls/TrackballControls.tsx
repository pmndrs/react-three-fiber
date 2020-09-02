import React, { forwardRef, useRef, useEffect } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { TrackballControls as TrackballControlsImpl } from 'three/examples/jsm/controls/TrackballControls'
import mergeRefs from 'react-merge-refs'

extend({ TrackballControlsImpl })

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
  const controls = useRef<TrackballControlsImpl>()
  const { camera, gl, invalidate } = useThree()
  useFrame(() => controls.current?.update())
  useEffect(() => {
    const _controls = controls.current
    _controls?.addEventListener('change', invalidate)
    return () => _controls?.removeEventListener('change', invalidate)
  }, [invalidate])
  return <trackballControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} {...props} />
})
