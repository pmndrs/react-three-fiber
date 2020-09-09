import React, { forwardRef, useMemo, useEffect } from 'react'
import { ReactThreeFiber, useThree, Overwrite } from 'react-three-fiber'
import { PointerLockControls as PointerLockControlsImpl } from 'three/examples/jsm/controls/PointerLockControls'

export type PointerLockControls = Overwrite<
  ReactThreeFiber.Object3DNode<PointerLockControlsImpl, typeof PointerLockControlsImpl>,
  { target?: ReactThreeFiber.Vector3 }
>

export const PointerLockControls = forwardRef((props: PointerLockControls, ref) => {
  const { camera, gl, invalidate } = useThree()
  const controls = useMemo(() => new PointerLockControlsImpl(camera, gl.domElement), [camera, gl.domElement])

  useEffect(() => {
    controls?.addEventListener?.('change', invalidate)
    return () => controls?.removeEventListener?.('change', invalidate)
  }, [controls, invalidate])

  useEffect(() => {
    const handler = () => controls.lock()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [controls])

  return <primitive dispose={null} object={controls} ref={ref} {...props} />
})
