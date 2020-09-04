import React, { forwardRef, useEffect, useMemo } from 'react'
import { ReactThreeFiber, useThree, useFrame, Overwrite } from 'react-three-fiber'
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls'
import mergeRefs from 'react-merge-refs'

export type OrbitControls = Overwrite<
  ReactThreeFiber.Object3DNode<OrbitControlsImpl, typeof OrbitControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControlsImpl: OrbitControls
    }
  }
}

export const OrbitControls = forwardRef((props: OrbitControls = { enableDamping: true }, ref) => {
  const { camera, gl, invalidate } = useThree()
  const controls = useMemo(() => new OrbitControlsImpl(camera, gl.domElement), [camera, gl])

  useFrame(() => {
    controls.update()
  })

  useEffect(() => {
    controls?.addEventListener?.('change', invalidate)
    return () => controls?.removeEventListener?.('change', invalidate)
  }, [controls, invalidate])

  return <primitive dispose={null} object={controls} ref={mergeRefs([controls, ref])} enableDamping {...props} />
})
