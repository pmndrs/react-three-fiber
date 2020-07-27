import { Mesh } from 'three'
import React, { forwardRef } from 'react'
import { extend, ReactThreeFiber, Overwrite } from 'react-three-fiber'
import { Reflector as ReflectorImpl, ReflectorOptions } from 'three/examples/jsm/objects/Reflector'

extend({ ReflectorImpl })

export type Reflector = Overwrite<
  ReactThreeFiber.Object3DNode<ReflectorImpl, typeof ReflectorImpl>,
  { children: React.ReactElement<ReactThreeFiber.Object3DNode<Mesh, typeof Mesh>> }
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      reflectorImpl: Reflector
    }
  }
}

type Props = ReflectorOptions & { children: React.ReactElement<any> }

export const Reflector = forwardRef(
  ({ children, color, textureWidth, textureHeight, clipBias, shader, encoding, ...props }: Props, ref) => (
    <reflectorImpl
      ref={ref as React.MutableRefObject<Mesh>}
      args={[
        undefined,
        {
          color,
          textureWidth,
          textureHeight,
          clipBias,
          shader,
          encoding,
        },
      ]}
      {...props}>
      {React.Children.only(children)}
    </reflectorImpl>
  )
)
