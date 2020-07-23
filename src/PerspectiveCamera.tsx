import { PerspectiveCamera as PerspectiveCameraImpl } from 'three'
import React, { forwardRef, useLayoutEffect } from 'react'
import { useThree, useUpdate } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

type Props = JSX.IntrinsicElements['perspectiveCamera'] & {
  makeDefault: boolean
  children: React.ReactNode
}

export const PerspectiveCamera = forwardRef(({ children, makeDefault = false, ...props }: Props, ref) => {
  const { setDefaultCamera, camera, size } = useThree()
  const cameraRef = useUpdate<PerspectiveCameraImpl>(
    (cam) => {
      cam.aspect = size.width / size.height
      cam.updateProjectionMatrix()
    },
    [size, props]
  )

  useLayoutEffect(() => {
    if (makeDefault && cameraRef.current) {
      const oldCam = camera
      setDefaultCamera(cameraRef.current)
      return () => setDefaultCamera(oldCam)
    }
  }, [])

  return (
    <perspectiveCamera ref={mergeRefs([cameraRef, ref])} {...props}>
      {children}
    </perspectiveCamera>
  )
})
