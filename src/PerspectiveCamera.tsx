import { PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import React, { forwardRef, useLayoutEffect } from 'react'
import { ReactThreeFiber, useThree, useUpdate } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

type Props = ReactThreeFiber.Object3DNode<PerspectiveCameraImpl, typeof PerspectiveCameraImpl> & {
  makeDefault: boolean
  children: React.ReactNode
}

export const PerspectiveCamera = forwardRef(({ children, makeDefault = true, ...props }: Props, ref) => {
  const { setDefaultCamera, camera, size } = useThree()
  const cameraRef = useUpdate<PerspectiveCameraImpl>(
    (cam) => {
      cam.aspect = size.width / size.height
      cam.updateProjectionMatrix()
    },
    [size, props]
  )

  useLayoutEffect(() => {
    if (makeDefault) {
      const oldCam = camera
      setDefaultCamera(cameraRef.current)
      return () => setDefaultCamera(oldCam)
    }
  }, [])

  return (
    <perspectiveCamera {...props} ref={mergeRefs([cameraRef, ref])}>
      {children}
    </perspectiveCamera>
  )
})
