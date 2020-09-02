import React, { forwardRef, useMemo } from 'react'
import { ReactThreeFiber, extend } from 'react-three-fiber'
import { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky'
import { Vector3 } from 'three'

export type Sky = {
  distance?: number
  sunPosition?: ReactThreeFiber.Vector3
  turbidity?: number
  rayleigh?: number
} & ReactThreeFiber.Object3DNode<SkyImpl, typeof SkyImpl>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      skyImpl: Sky
    }
  }
}

export const Sky = forwardRef<Sky>(
  ({ distance = 100, turbidity = 2, rayleigh = 1, sunPosition = [0, Math.PI, 0], ...props }: Sky, ref) => {
    const scale = useMemo(() => new Vector3().setScalar(distance), [distance])
    const sky = useMemo(() => new SkyImpl(), [])

    return (
      <primitive
        object={sky}
        ref={ref}
        material-uniforms-turbidity-value={turbidity}
        material-uniforms-rayleigh-value={rayleigh}
        material-uniforms-sunPosition-value={sunPosition}
        scale={scale}
        {...props}
      />
    )
  }
)
