import { Object3D, Group } from 'three'
import React, { forwardRef, useRef, useLayoutEffect } from 'react'
import { ReactThreeFiber, extend, useThree } from 'react-three-fiber'
import { TransformControls as TransformControlsImpl } from 'three/examples/jsm/controls/TransformControls'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ TransformControlsImpl })

type TransformControls = ReactThreeFiber.Object3DNode<TransformControlsImpl, typeof TransformControlsImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      transformControlsImpl: TransformControls
    }
  }
}

export const TransformControls = forwardRef(
  ({ children, ...props }: { children: React.ReactElement<Object3D> } & TransformControls, ref) => {
    const controls = useRef<TransformControlsImpl>()
    const group = useRef<Group>()
    const { camera, gl } = useThree()
    useLayoutEffect(() => void controls.current?.attach(group.current as Object3D), [children])
    return (
      <>
        <transformControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} {...props} />
        <group ref={group}>{children}</group>
      </>
    )
  }
)
