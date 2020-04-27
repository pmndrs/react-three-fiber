import React, { useRef } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame } from 'react-three-fiber'
import { MapControls as MapControlsImpl } from 'three/examples/jsm/controls/OrbitControls'

extend({ MapControls: MapControlsImpl })

type MapControlsT = ReactThreeFiber.Object3DNode<MapControlsImpl, typeof MapControlsImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      mapControls: MapControlsT
    }
  }
}

export function MapControls(
  props: MapControlsT = { enableDamping: true, dampingFactor: 0.05, screenSpacePanning: false }
) {
  const controls = useRef<MapControlsImpl>()
  const { camera, gl } = useThree()
  useFrame(() => controls.current && controls.current.update())
  return <mapControls ref={controls} args={[camera, gl.domElement]} {...props} />
}
