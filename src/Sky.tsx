import React, { forwardRef, useMemo } from 'react'
import { ReactThreeFiber, extend } from 'react-three-fiber'
import { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky'
import { Vector3 } from 'three'

extend({ SkyImpl })

export type Sky = {
  distance?: number
  sunPosition?: ReactThreeFiber.Vector3
} & ReactThreeFiber.Object3DNode<SkyImpl, typeof SkyImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      skyImpl: Sky
    }
  }
}

export const Sky = forwardRef<Sky>(({ distance = 450000, sunPosition = [0, 1, 0], ...props }: Sky, ref) => {
  const scale = useMemo(() => new Vector3().setScalar(distance), [distance])
  return <skyImpl ref={ref} material-uniforms-sunPosition-value={sunPosition} scale={scale} {...props} />
})
