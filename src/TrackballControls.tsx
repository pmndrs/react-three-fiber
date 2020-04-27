import React, { useRef } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame } from 'react-three-fiber'
import { TrackballControls as TrackballControlsImpl } from 'three/examples/jsm/controls/TrackballControls'

extend({ TrackballControlsImpl })

type TrackballControls = ReactThreeFiber.Object3DNode<TrackballControlsImpl, typeof TrackballControlsImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      trackballControlsImpl: TrackballControls
    }
  }
}

export function TrackballControls(props: TrackballControls) {
  const controls = useRef<TrackballControlsImpl>()
  const { camera, gl } = useThree()
  useFrame(() => controls.current?.update())
  return <trackballControlsImpl ref={controls} args={[camera, gl.domElement]} {...props} />
}
