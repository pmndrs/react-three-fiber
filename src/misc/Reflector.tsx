import { Mesh } from 'three'
import React, { forwardRef, useMemo } from 'react'
import { ReactThreeFiber, Overwrite } from 'react-three-fiber'
import { Reflector as ReflectorImpl, ReflectorOptions } from 'three/examples/jsm/objects/Reflector'

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
  ({ children, color, textureWidth, textureHeight, clipBias, shader, encoding, ...props }: Props, ref) => {
    const reflector = useMemo(
      () =>
        new ReflectorImpl(undefined, {
          color,
          textureWidth,
          textureHeight,
          clipBias,
          shader,
          encoding,
        }),
      [clipBias, color, encoding, shader, textureHeight, textureWidth]
    )

    return (
      <primitive dispose={null} object={reflector} ref={ref as React.MutableRefObject<Mesh>} {...props}>
        {React.Children.only(children)}
      </primitive>
    )
  }
)
