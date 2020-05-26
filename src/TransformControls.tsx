import { Object3D, Group } from 'three'
import React, { forwardRef, useRef, useLayoutEffect, useEffect } from 'react'
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

type Props = JSX.IntrinsicElements['group'] & {
  enabled: boolean
  axis: string | null
  mode: string
  translationSnap: number | null
  rotationSnap: number | null
  scaleSnap?: number | null
  space: string
  size: number
  dragging: boolean
  showX: boolean
  showY: boolean
  showZ: boolean
}

export const TransformControls = forwardRef(
  (
    {
      children,
      enabled,
      axis,
      mode,
      translationSnap,
      rotationSnap,
      scaleSnap,
      space,
      size,
      dragging,
      showX,
      showY,
      showZ,
      ...props
    }: Props,
    ref
  ) => {
    const controls = useRef<TransformControlsImpl>()
    const group = useRef<Group>()
    const { camera, gl, invalidate } = useThree()
    useLayoutEffect(() => void controls.current?.attach(group.current as Object3D), [children])
    useEffect(() => {
      controls.current?.addEventListener('change', invalidate)
      return () => controls.current?.removeEventListener('change', invalidate)
    }, [controls.current])
    return (
      <>
        <transformControlsImpl
          ref={mergeRefs([controls, ref])}
          args={[camera, gl.domElement]}
          enabled={enabled}
          axis={axis}
          mode={mode}
          translationSnap={translationSnap}
          rotationSnap={rotationSnap}
          //@ts-ignore
          scaleSnap={scaleSnap}
          space={space}
          size={size}
          dragging={dragging}
          showX={showX}
          showY={showY}
          showZ={showZ}
        />
        <group ref={group as any} {...props}>
          {children}
        </group>
      </>
    )
  }
)
