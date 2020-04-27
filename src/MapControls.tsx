import React, { useRef } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame } from 'react-three-fiber'
import { MapControls as MapControlsImpl } from 'three/examples/jsm/controls/OrbitControls'

extend({ MapControlsImpl })

type MapControls = ReactThreeFiber.Object3DNode<MapControlsImpl, typeof MapControlsImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      mapControlsImpl: MapControls
    }
  }
}

export function MapControls(props: MapControls = { enableDamping: true }) {
  const controls = useRef<MapControlsImpl>()
  const { camera, gl } = useThree()
  useFrame(() => controls.current?.update())
  return <mapControlsImpl ref={controls} args={[camera, gl.domElement]} {...props} />
}
