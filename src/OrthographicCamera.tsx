import { OrthographicCamera as OrthographicCameraImpl } from 'three'
import React, { forwardRef, useLayoutEffect } from 'react'
import { useThree, useUpdate } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

type Props = JSX.IntrinsicElements['orthographicCamera'] & {
  makeDefault: boolean
  children: React.ReactNode
}

export const OrthographicCamera = forwardRef(({ children, makeDefault = false, ...props }: Props, ref) => {
  const { setDefaultCamera, camera, size } = useThree()
  const cameraRef = useUpdate<OrthographicCameraImpl>((cam) => cam.updateProjectionMatrix(), [size, props])

  useLayoutEffect(() => {
    if (makeDefault && cameraRef.current) {
      const oldCam = camera
      setDefaultCamera(cameraRef.current)
      return () => setDefaultCamera(oldCam)
    }
  }, [])

  return (
    <orthographicCamera
      left={size.width / -2}
      right={size.width / 2}
      top={size.height / 2}
      bottom={size.height / -2}
      ref={mergeRefs([cameraRef, ref])}
      {...props}>
      {children}
    </orthographicCamera>
  )
})
