import React, { forwardRef, useMemo } from 'react'
import { ReactThreeFiber, extend } from 'react-three-fiber'
import { Sky as SkyImpl } from 'three/examples/jsm/objects/Sky'
import { Vector3 } from 'three'

export type Sky = {
  distance?: number
  sunPosition?: ReactThreeFiber.Vector3
  mieCoefficient?: number
  mieDirectionalG?: number
  rayleigh?: number
  turbidity?: number
} & ReactThreeFiber.Object3DNode<SkyImpl, typeof SkyImpl>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      skyImpl: Sky
    }
  }
}

export const Sky = forwardRef<Sky>(
  (
    {
      distance = 100,
      mieCoefficient = 0.005,
      mieDirectionalG = 0.8,
      rayleigh = 1,
      turbidity = 2,
      sunPosition = [0, Math.PI, 0],
      ...props
    }: Sky,
    ref
  ) => {
    const scale = useMemo(() => new Vector3().setScalar(distance), [distance])
    const sky = useMemo(() => new SkyImpl(), [])

    return (
      <primitive
        object={sky}
        ref={ref}
        material-uniforms-mieCoefficient-value={mieCoefficient}
        material-uniforms-mieDirectionalG-value={mieDirectionalG}
        material-uniforms-rayleigh-value={rayleigh}
        material-uniforms-sunPosition-value={sunPosition}
        material-uniforms-turbidity-value={turbidity}
        scale={scale}
        {...props}
      />
    )
  }
)
