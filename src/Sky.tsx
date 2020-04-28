import React, { forwardRef } from 'react'
import { ReactThreeFiber, extend } from 'react-three-fiber'
import { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky'
import { Vector3 } from 'three'

extend({ SkyImpl })

export type Sky = {
  distance?: number
  sunPosition?: Vector3
} & ReactThreeFiber.Object3DNode<SkyImpl, typeof SkyImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      skyImpl: Sky
    }
  }
}

export const Sky = forwardRef<Sky>(({ distance = 450000, sunPosition = new Vector3(0, 1, 0), ...props }: Sky, ref) => {
  return (
    <skyImpl
      ref={ref}
      material-uniforms-sunPosition-value={sunPosition}
      scale={new Vector3().setScalar(distance)}
      {...props}
    />
  )
})
