import * as React from 'react'
import { Object3D, Matrix4, Raycaster, Intersection } from 'three'
import { Canvas, useThree, useFrame } from 'react-three-fiber'
import { ARButton } from 'three/examples/jsm/webxr/ARButton'
import { VRButton } from 'three/examples/jsm/webxr/VRButton'
import { XRHandedness } from './webxr'
import { XRController } from './XRController'
import { ContainerProps } from 'react-three-fiber/targets/shared/web/ResizeContainer'

export interface XRContextValue {
  controllers: XRController[]
  addInteraction: (object: Object3D, eventType: XRInteractionType, handler: XRInteractionHandler) => any
}
const XRContext = React.createContext<XRContextValue>({} as any)

export interface XRInteractionEvent {
  intersection?: Intersection
  controller: XRController
}

export type XRInteractionType = 'onHover' | 'onBlur'

export type XRInteractionHandler = (event: XRInteractionEvent) => any

const useControllers = (): XRController[] => {
  const { gl, scene } = useThree()
  const [controllers, setControllers] = React.useState<XRController[]>([])

  React.useEffect(() => {
    const ids = [0, 1]
    ids.forEach((id) => {
      XRController.make(
        id,
        gl,
        (controller) => {
          scene.add(controller.controller)
          scene.add(controller.grip)
          setControllers((it) => [...it, controller])
        },
        (controller) => {
          scene.remove(controller.controller)
          scene.remove(controller.grip)
          setControllers((existing) => existing.filter((it) => it !== controller))
        }
      )
    })
  }, [gl, scene])

  return controllers
}

export function XR(props: { children: React.ReactNode }) {
  const controllers = useControllers()

  const interactionState = React.useRef({
    interactable: new Set<Object3D>(),
    handlers: {
      onHover: new WeakMap<Object3D, XRInteractionHandler>(),
      onBlur: new WeakMap<Object3D, XRInteractionHandler>()
    }
  })

  const addInteraction = React.useCallback((object: Object3D, eventType: XRInteractionType, handler: any) => {
    interactionState.current.interactable.add(object)
    interactionState.current.handlers[eventType].set(object, handler)
  }, [])

  const [raycaster] = React.useState(() => new Raycaster())

  const intersect = React.useCallback(
    (controller: Object3D) => {
      const objects = Array.from(interactionState.current.interactable)
      const tempMatrix = new Matrix4()
      tempMatrix.identity().extractRotation(controller.matrixWorld)
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix)

      return raycaster.intersectObjects(objects, true)
    },
    [raycaster]
  )

  useFrame(() => {
    const { handlers } = interactionState.current

    if (interactionState.current.interactable.size === 0) {
      return
    }

    controllers.forEach((it) => {
      const { controller, hovering } = it
      const hits = new Set()
      const intersections = intersect(controller)

      it.hoverRayLength = undefined

      intersections.forEach((intersection) => {
        let eventObject: Object3D | null = intersection.object
        while (eventObject) {
          if (handlers.onHover.has(eventObject)) {
            it.hoverRayLength = Math.min(it.hoverRayLength ?? Infinity, intersection.distance)

            if (!hovering.has(eventObject) && handlers.onHover.has(eventObject)) {
              hovering.add(eventObject)
              handlers.onHover.get(eventObject)?.({ controller: it, intersection })
            }
          }
          hits.add(eventObject.id)
          eventObject = eventObject.parent
        }
      })

      hovering.forEach((object) => {
        if (!hits.has(object.id)) {
          hovering.delete(object)
          if (handlers.onBlur.has(object)) {
            handlers.onBlur.get(object)?.({ controller: it })
          }
        }
      })
    })
  })

  const value = React.useMemo(() => ({ controllers, addInteraction }), [controllers, addInteraction])

  return <XRContext.Provider value={value}>{props.children}</XRContext.Provider>
}

function XRCanvas({ children, ...rest }: ContainerProps) {
  return (
    <Canvas vr colorManagement {...rest}>
      <XR>{children}</XR>
    </Canvas>
  )
}

export function VRCanvas({ children, ...rest }: ContainerProps) {
  return (
    <XRCanvas onCreated={({ gl }) => void document.body.appendChild(VRButton.createButton(gl))} {...rest}>
      {children}
    </XRCanvas>
  )
}

export function ARCanvas({ children, ...rest }: ContainerProps) {
  return (
    <XRCanvas onCreated={({ gl }) => void document.body.appendChild(ARButton.createButton(gl))} {...rest}>
      {children}
    </XRCanvas>
  )
}

export const useXR = () => React.useContext(XRContext)

export const useController = (handedness: XRHandedness) => {
  const { controllers } = useXR()

  const controller = React.useMemo(() => controllers.find((it) => it.inputSource.handedness === handedness), [handedness, controllers])

  return controller
}

export interface XREvent {
  originalEvent: any
  controller: XRController
}

export type XREventType = 'select' | 'selectstart' | 'selectend' | 'squeeze' | 'squeezestart' | 'squeezeend'

export const useXREvent = (
  event: XREventType,
  handler: (e: XREvent) => any,
  {
    handedness
  }: {
    handedness?: XRHandedness
  } = {}
) => {
  const { controllers: allControllers } = useXR()

  const handleEvent = React.useCallback((controller: XRController) => (e: any) => handler({ originalEvent: e, controller }), [handler])

  React.useEffect(() => {
    const controllers = handedness ? allControllers.filter((it) => it.inputSource.handedness === handedness) : allControllers

    const cleanups: any[] = []

    controllers.forEach((it) => {
      const listener = handleEvent(it)
      it.controller.addEventListener(event, listener)
      cleanups.push(() => it.controller.removeEventListener(event, listener))
    })

    return () => cleanups.forEach((fn) => fn())
  }, [event, handleEvent, allControllers, handedness])
}
