import { Object3D, Group } from 'three'
import React, { forwardRef, useRef, useLayoutEffect, useEffect } from 'react'
import { ReactThreeFiber, extend, useThree, Overwrite } from 'react-three-fiber'
import { TransformControls as TransformControlsImpl } from 'three/examples/jsm/controls/TransformControls'
// @ts-ignore
import pick from 'lodash.pick'
// @ts-ignore
import omit from 'lodash.omit'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ TransformControlsImpl })

export type TransformControls = Overwrite<
  ReactThreeFiber.Object3DNode<TransformControlsImpl, typeof TransformControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

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
  ({ children, ...props }: { children: React.ReactElement<Object3D> } & TransformControls, ref) => {
    const transformOnlyPropNames = [
      'enabled',
      'axis',
      'mode',
      'translationSnap',
      'rotationSnap',
      'scaleSnap',
      'space',
      'size',
      'dragging',
      'showX',
      'showY',
      'showZ',
    ]
    const transformProps = pick(props, transformOnlyPropNames)
    const objectProps = omit(props, transformOnlyPropNames)
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
        <transformControlsImpl ref={mergeRefs([controls, ref])} args={[camera, gl.domElement]} {...transformProps} />
        <group ref={group} {...objectProps}>
          {children}
        </group>
      </>
    )
  }
)
