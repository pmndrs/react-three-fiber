import { Object3D, Group } from 'three'
import React, { forwardRef, useRef, useLayoutEffect, useEffect, useMemo } from 'react'
import { ReactThreeFiber, useThree, Overwrite } from 'react-three-fiber'
import { TransformControls as TransformControlsImpl } from 'three/examples/jsm/controls/TransformControls'
import pick from 'lodash.pick'
import omit from 'lodash.omit'

export type TransformControls = Overwrite<
  ReactThreeFiber.Object3DNode<TransformControlsImpl, typeof TransformControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
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

    const { camera, gl, invalidate } = useThree()
    const controls = useMemo(() => new TransformControlsImpl(camera, gl.domElement), [camera, gl.domElement])

    const group = useRef<Group>()
    useLayoutEffect(() => void controls.attach(group.current as Object3D), [children, controls])

    useEffect(() => {
      controls?.addEventListener?.('change', invalidate)
      return () => controls?.removeEventListener?.('change', invalidate)
    }, [controls, invalidate])

    return (
      <>
        <primitive dispose={null} object={controls} ref={ref} {...transformProps} />
        <group ref={group} {...objectProps}>
          {children}
        </group>
      </>
    )
  }
)
