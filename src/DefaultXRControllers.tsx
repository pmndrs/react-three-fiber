import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory'
import { useXR, useXREvent, XREvent } from './XR'
import React, { useEffect } from 'react'
import { Color, Mesh, MeshBasicMaterial, BoxBufferGeometry } from 'three'
import { useFrame, useThree } from 'react-three-fiber'

const modelFactory = new XRControllerModelFactory()
export function DefaultXRControllers() {
  const { scene } = useThree()
  const { controllers } = useXR()
  const [rays] = React.useState(new Map<number, Mesh>())

  // Show ray line when hovering objects
  useFrame(() => {
    controllers.forEach((it) => {
      const ray = rays.get(it.controller.id)

      if (!ray) {
        return
      }

      if (it.hoverRayLength === undefined || it.inputSource.handedness === 'none') {
        ray.visible = false
        return
      }

      // Tiny offset to clip ray on AR devices
      // that don't have handedness set to 'none'
      const offset = -0.01
      ray.visible = true
      ray.scale.y = it.hoverRayLength + offset
      ray.position.z = -it.hoverRayLength / 2 - offset
    })
  })

  useXREvent('selectstart', (e: XREvent) => {
    const ray = rays.get(e.controller.controller.id)
    if (!ray) {
      return
    }
    const material = ray.material as MeshBasicMaterial
    material.color = new Color(0x192975)
  })

  useXREvent('selectend', (e: XREvent) => {
    const ray = rays.get(e.controller.controller.id)
    if (!ray) {
      return
    }
    const material = ray.material as MeshBasicMaterial
    material.color = new Color(0xffffff)
  })

  useEffect(() => {
    const cleanups: any[] = []

    controllers.forEach(({ controller, grip, inputSource }) => {
      // Attach 3D model of the controller
      const model = modelFactory.createControllerModel(controller)
      controller.dispatchEvent({ type: 'connected', data: inputSource, fake: true })
      grip.add(model)

      // Add Ray line (used for hovering)
      const ray = new Mesh()
      ray.rotation.set(Math.PI / 2, 0, 0)
      ray.material = new MeshBasicMaterial({ color: new Color(0xffffff), opacity: 0.8, transparent: true })
      ray.geometry = new BoxBufferGeometry(0.002, 1, 0.002)

      rays.set(controller.id, ray)
      controller.add(ray)

      cleanups.push(() => {
        grip.remove(model)
        controller.remove(ray)
      })
    })

    return () => {
      cleanups.forEach((fn) => fn())
    }
  }, [controllers, scene, rays])

  return null
}
