import React, { useRef, useEffect, useCallback, ReactNode } from 'react'
import { useXR, useXREvent, XRInteractionEvent, XREvent } from './XR'
import { XRHandedness } from './webxr'
import { Object3D, Group, Matrix4 } from 'three'
import { useFrame } from 'react-three-fiber'

export function Hover({ onChange, children }: any) {
  const ref = useRef<Object3D>()
  const { addInteraction } = useXR()
  const hovering = useRef(new Set<XRHandedness | undefined>())

  useEffect(() => {
    addInteraction(ref.current as Object3D, 'onHover', (e: XRInteractionEvent) => {
      if (hovering.current.size === 0) {
        onChange(true)
      }
      hovering.current.add(e.controller.inputSource?.handedness)
    })
    addInteraction(ref.current as Object3D, 'onBlur', (e: XRInteractionEvent) => {
      hovering.current.delete(e.controller.inputSource?.handedness)
      if (hovering.current.size === 0) {
        onChange(false)
      }
    })
  }, [onChange, addInteraction])

  return <group ref={ref}>{children}</group>
}

export function Select({ onSelect, children }: any) {
  const ref = useRef<Object3D>()
  const { addInteraction } = useXR()

  const hoveredHandedness = useRef<Set<XRHandedness | undefined>>(new Set())

  const onEnd = useCallback(
    (e: XREvent) => {
      if (hoveredHandedness.current.has(e.controller.inputSource?.handedness)) {
        onSelect()
      }
    },
    [onSelect]
  )

  useXREvent('selectend', onEnd)

  useEffect(() => {
    addInteraction(ref.current as Object3D, 'onHover', (e: XRInteractionEvent) => {
      hoveredHandedness.current.add(e.controller.inputSource?.handedness)
    })
    addInteraction(ref.current as Object3D, 'onBlur', (e: XRInteractionEvent) => {
      hoveredHandedness.current.delete(e.controller.inputSource?.handedness)
    })
  }, [addInteraction])

  return <group ref={ref}>{children}</group>
}

export function RayGrab({ children }: { children: ReactNode }) {
  const { addInteraction } = useXR()

  const hoveredHandedness = useRef<Set<XRHandedness | undefined>>(new Set())
  const grabbingController = useRef<Object3D>()
  const groupRef = useRef<Group>()

  const previousTransform = useRef<Matrix4 | undefined>(undefined)

  const onEnd = useCallback((_: XREvent) => {
    grabbingController.current = undefined
    previousTransform.current = undefined
  }, [])

  const onStart = useCallback((e: XREvent) => {
    if (hoveredHandedness.current.has(e.controller.inputSource.handedness)) {
      grabbingController.current = e.controller.controller
      previousTransform.current = new Matrix4().getInverse(e.controller.controller.matrixWorld)
    }
  }, [])

  useXREvent('selectstart', onStart)
  useXREvent('selectend', onEnd)

  useFrame(() => {
    if (!grabbingController.current || !previousTransform.current || !groupRef.current) {
      return
    }

    const controller = grabbingController.current
    const group = groupRef.current

    group.applyMatrix4(previousTransform.current)
    group.applyMatrix4(controller.matrixWorld)
    group.updateWorldMatrix(false, true)

    previousTransform.current.getInverse(controller.matrixWorld)
  })

  useEffect(() => {
    addInteraction(groupRef.current as Object3D, 'onHover', (e: XRInteractionEvent) => {
      hoveredHandedness.current.add(e.controller.inputSource.handedness)
    })
    addInteraction(groupRef.current as Object3D, 'onBlur', (e: XRInteractionEvent) => {
      hoveredHandedness.current.delete(e.controller.inputSource.handedness)
    })
  }, [addInteraction])

  return <group ref={groupRef}>{children}</group>
}
