import React, { forwardRef, useRef } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame } from 'react-three-fiber'
import { MapControls as MapControlsImpl } from 'three/examples/jsm/controls/OrbitControls'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

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

export const MapControls = forwardRef((props: MapControls = { enableDamping: true }, ref) => {
  const controls = useRef<MapControlsImpl>()
  const { camera, gl } = useThree()
  useFrame(() => controls.current?.update())
  return <mapControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} {...props} />
})
