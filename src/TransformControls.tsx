import React, { useRef, useLayoutEffect } from 'react'
import { ReactThreeFiber, extend, useThree, useFrame } from 'react-three-fiber'
import { TransformControls as TransformControlsImpl } from 'three/examples/jsm/controls/TransformControls'
import { Object3D, Group } from 'three'

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

export function TransformControls({
  children,
  ...props
}: { children: React.ReactElement<Object3D> } & TransformControls) {
  const controls = useRef<TransformControlsImpl>()
  const group = useRef<Group>()
  const { camera, gl } = useThree()
  useLayoutEffect(() => void controls.current?.attach(group.current as Object3D), [children])
  return (
    <>
      <transformControlsImpl ref={controls} args={[camera, gl.domElement]} {...props} />
      <group ref={group}>{children}</group>
    </>
  )
}
