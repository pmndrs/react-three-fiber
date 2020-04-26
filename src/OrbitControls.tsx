import React, { useRef } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame } from 'react-three-fiber'
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControlsImpl })

type OrbitControlsT = ReactThreeFiber.Object3DNode<OrbitControlsImpl, typeof OrbitControlsImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      orbitControls: OrbitControlsT
    }
  }
}

export function OrbitControls(props: OrbitControlsT = { enableDamping: true, dampingFactor: 0.1, rotateSpeed: 0.5 }) {
  const controls = useRef<OrbitControlsImpl>()
  const { camera, gl } = useThree()
  useFrame(() => controls.current && controls.current.update())
  return <orbitControls ref={controls} args={[camera, gl.domElement]} {...props} />
}
