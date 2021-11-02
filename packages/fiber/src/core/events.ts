import * as THREE from 'three'
import type { UseStore } from 'zustand'
import type { Instance } from './renderer'
import type { InternalState, RootState } from './store'

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export interface IntesectionEvent<TSourceEvent> extends Intersection {
  intersections: Intersection[]
  stopped: boolean
  unprojectedPoint: THREE.Vector3
  ray: THREE.Ray
  camera: Camera
  stopPropagation: () => void
  sourceEvent: TSourceEvent // deprecated
  nativeEvent: TSourceEvent
  delta: number
  spaceX: number
  spaceY: number
}

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export type ThreeEvent<TEvent> = TEvent & IntesectionEvent<TEvent>
export type DomEvent = ThreeEvent<PointerEvent | MouseEvent | WheelEvent>

export type Events = {
  onClick: EventListener
  onContextMenu: EventListener
  onDoubleClick: EventListener
  onWheel: EventListener
  onPointerDown: EventListener
  onPointerUp: EventListener
  onPointerLeave: EventListener
  onPointerMove: EventListener
  onPointerCancel: EventListener
  onLostPointerCapture: EventListener
}

export type EventHandlers = {
  onClick?: (event: ThreeEvent<MouseEvent>) => void
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOver?: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut?: (event: ThreeEvent<PointerEvent>) => void
  onPointerEnter?: (event: ThreeEvent<PointerEvent>) => void
  onPointerLeave?: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void
  onPointerMissed?: (event: ThreeEvent<PointerEvent>) => void
  onPointerCancel?: (event: ThreeEvent<PointerEvent>) => void
  onWheel?: (event: ThreeEvent<WheelEvent>) => void
}

export interface EventManager<TTarget> {
  connected: TTarget | boolean
  handlers?: Events
  connect?: (target: TTarget) => void
  disconnect?: () => void
}

export interface PointerCaptureTarget {
  intersection: Intersection
  target: Element
}

function makeId(event: Intersection) {
  return (event.eventObject || event.object).uuid + '/' + event.index + event.instanceId
}

/** Release pointer captures.
 * This is called by releasePointerCapture in the API, and when an object is removed.
 */
function releaseInternalPointerCapture(
  capturedMap: Map<number, Map<THREE.Object3D, PointerCaptureTarget>>,
  obj: THREE.Object3D,
  captures: Map<THREE.Object3D, PointerCaptureTarget>,
  pointerId: number,
): void {
  const captureData: PointerCaptureTarget | undefined = captures.get(obj)
  if (captureData) {
    captures.delete(obj)
    // If this was the last capturing object for this pointer
    if (captures.size === 0) {
      capturedMap.delete(pointerId)
      captureData.target.releasePointerCapture(pointerId)
    }
  }
}

export function removeInteractivity(store: UseStore<RootState>, object: THREE.Object3D) {
  const { internal } = store.getState()
  // Removes every trace of an object from the data store
  internal.interaction = internal.interaction.filter((o) => o !== object)
  internal.initialHits = internal.initialHits.filter((o) => o !== object)
  internal.hovered.forEach((value, key) => {
    if (value.eventObject === object || value.object === object) {
      internal.hovered.delete(key)
    }
  })
  internal.capturedMap.forEach((captures, pointerId) => {
    releaseInternalPointerCapture(internal.capturedMap, object, captures, pointerId)
  })
}

export function createEvents(store: UseStore<RootState>) {
  const temp = new THREE.Vector3()

  /** Sets up defaultRaycaster */
  function prepareRay(event: DomEvent) {
    const state = store.getState()
    const { raycaster, mouse, camera, size } = state
    // https://github.com/pmndrs/react-three-fiber/pull/782
    // Events trigger outside of canvas when moved
    const { offsetX, offsetY } = raycaster.computeOffsets?.(event, state) ?? event
    const { width, height } = size
    mouse.set((offsetX / width) * 2 - 1, -(offsetY / height) * 2 + 1)
    raycaster.setFromCamera(mouse, camera)
  }

  /** Calculates delta */
  function calculateDistance(event: DomEvent) {
    const { internal } = store.getState()
    const dx = event.offsetX - internal.initialClick[0]
    const dy = event.offsetY - internal.initialClick[1]
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }

  /** Returns true if an instance has a valid pointer-event registered, this excludes scroll, clicks etc */
  function filterPointerEvents(objects: THREE.Object3D[]) {
    return objects.filter((obj) =>
      ['Move', 'Over', 'Enter', 'Out', 'Leave'].some(
        (name) => (obj as unknown as Instance).__r3f?.handlers[('onPointer' + name) as keyof EventHandlers],
      ),
    )
  }

  function intersect(filter?: (objects: THREE.Object3D[]) => THREE.Object3D[]) {
    const state = store.getState()
    const { raycaster, internal } = state
    // Skip event handling when noEvents is set
    if (!raycaster.enabled) return []

    const seen = new Set<string>()
    const intersections: Intersection[] = []

    // Allow callers to eliminate event objects
    const eventsObjects = filter ? filter(internal.interaction) : internal.interaction

    // Intersect known handler objects and filter against duplicates
    let intersects = raycaster.intersectObjects(eventsObjects, true).filter((item) => {
      const id = makeId(item as Intersection)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    // https://github.com/mrdoob/three.js/issues/16031
    // Allow custom userland intersect sort order
    if (raycaster.filter) intersects = raycaster.filter(intersects, state)

    for (const intersect of intersects) {
      let eventObject: THREE.Object3D | null = intersect.object
      // Bubble event up
      while (eventObject) {
        if ((eventObject as unknown as Instance).__r3f?.eventCount) intersections.push({ ...intersect, eventObject })
        eventObject = eventObject.parent
      }
    }
    return intersections
  }

  /**  Creates filtered intersects and returns an array of positive hits */
  function patchIntersects(intersections: Intersection[], event: DomEvent) {
    const { internal } = store.getState()
    // If the interaction is captured, make all capturing targets  part of the
    // intersect.
    if ('pointerId' in event && internal.capturedMap.has(event.pointerId)) {
      for (let captureData of internal.capturedMap.get(event.pointerId)!.values()) {
        intersections.push(captureData.intersection)
      }
    }
    return intersections
  }

  /**  Handles intersections by forwarding them to handlers */
  function handleIntersects(
    intersections: Intersection[],
    event: DomEvent,
    delta: number,
    callback: (event: DomEvent) => void,
  ) {
    const { raycaster, mouse, camera, internal } = store.getState()
    // If anything has been found, forward it to the event listeners
    if (intersections.length) {
      const unprojectedPoint = temp.set(mouse.x, mouse.y, 0).unproject(camera)

      const localState = { stopped: false }

      for (const hit of intersections) {
        const hasPointerCapture = (id: number) => internal.capturedMap.get(id)?.has(hit.eventObject) ?? false

        const setPointerCapture = (id: number) => {
          const captureData = { intersection: hit, target: event.target as Element }
          if (internal.capturedMap.has(id)) {
            // if the pointerId was previously captured, we add the hit to the
            // event capturedMap.
            internal.capturedMap.get(id)!.set(hit.eventObject, captureData)
          } else {
            // if the pointerId was not previously captured, we create a map
            // containing the hitObject, and the hit. hitObject is used for
            // faster access.
            internal.capturedMap.set(id, new Map([[hit.eventObject, captureData]]))
          }
          // Call the original event now
          ;(event.target as Element).setPointerCapture(id)
        }

        const releasePointerCapture = (id: number) => {
          const captures = internal.capturedMap.get(id)
          if (captures) {
            releaseInternalPointerCapture(internal.capturedMap, hit.eventObject, captures, id)
          }
        }

        // Add native event props
        let extractEventProps: any = {}
        // This iterates over the event's properties including the inherited ones. Native PointerEvents have most of their props as getters which are inherited, but polyfilled PointerEvents have them all as their own properties (i.e. not inherited). We can't use Object.keys() or Object.entries() as they only return "own" properties; nor Object.getPrototypeOf(event) as that *doesn't* return "own" properties, only inherited ones.
        for (let prop in event) {
          let property = event[prop as keyof DomEvent]
          // Only copy over atomics, leave functions alone as these should be
          // called as event.nativeEvent.fn()
          if (typeof property !== 'function') extractEventProps[prop] = property
        }

        let raycastEvent: any = {
          ...hit,
          ...extractEventProps,
          spaceX: mouse.x,
          spaceY: mouse.y,
          intersections,
          stopped: localState.stopped,
          delta,
          unprojectedPoint,
          ray: raycaster.ray,
          camera: camera,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => {
            // https://github.com/pmndrs/react-three-fiber/issues/596
            // Events are not allowed to stop propagation if the pointer has been captured
            const capturesForPointer = 'pointerId' in event && internal.capturedMap.get(event.pointerId)

            // We only authorize stopPropagation...
            if (
              // ...if this pointer hasn't been captured
              !capturesForPointer ||
              // ... or if the hit object is capturing the pointer
              capturesForPointer.has(hit.eventObject)
            ) {
              raycastEvent.stopped = localState.stopped = true
              // Propagation is stopped, remove all other hover records
              // An event handler is only allowed to flush other handlers if it is hovered itself
              if (
                internal.hovered.size &&
                Array.from(internal.hovered.values()).find((i) => i.eventObject === hit.eventObject)
              ) {
                // Objects cannot flush out higher up objects that have already caught the event
                const higher = intersections.slice(0, intersections.indexOf(hit))
                cancelPointer([...higher, hit])
              }
            }
          },
          // there should be a distinction between target and currentTarget
          target: { hasPointerCapture, setPointerCapture, releasePointerCapture },
          currentTarget: { hasPointerCapture, setPointerCapture, releasePointerCapture },
          sourceEvent: event, // deprecated
          nativeEvent: event,
        }

        // Call subscribers
        callback(raycastEvent as DomEvent)
        // Event bubbling may be interrupted by stopPropagation
        if (localState.stopped === true) break
      }
    }
    return intersections
  }

  function cancelPointer(hits: Intersection[]) {
    const { internal } = store.getState()
    Array.from(internal.hovered.values()).forEach((hoveredObj) => {
      // When no objects were hit or the the hovered object wasn't found underneath the cursor
      // we call onPointerOut and delete the object from the hovered-elements map
      if (
        !hits.length ||
        !hits.find(
          (hit) =>
            hit.object === hoveredObj.object &&
            hit.index === hoveredObj.index &&
            hit.instanceId === hoveredObj.instanceId,
        )
      ) {
        const eventObject = hoveredObj.eventObject
        const instance = (eventObject as unknown as Instance).__r3f
        const handlers = instance?.handlers
        internal.hovered.delete(makeId(hoveredObj))
        if (instance?.eventCount) {
          // Clear out intersects, they are outdated by now
          const data = { ...hoveredObj, intersections: hits || [] }
          handlers.onPointerOut?.(data as ThreeEvent<PointerEvent>)
          handlers.onPointerLeave?.(data as ThreeEvent<PointerEvent>)
        }
      }
    })
  }

  const handlePointer = (name: string) => {
    // Deal with cancelation
    switch (name) {
      case 'onPointerLeave':
      case 'onPointerCancel':
        return () => cancelPointer([])
      case 'onLostPointerCapture':
        return (event: DomEvent) => {
          if ('pointerId' in event) {
            // If the object event interface had onLostPointerCapture, we'd call it here on every
            // object that's getting removed.
            store.getState().internal.capturedMap.delete(event.pointerId)
          }
          cancelPointer([])
        }
    }

    // Any other pointer goes here ...
    return (event: DomEvent) => {
      const { onPointerMissed, internal } = store.getState()

      prepareRay(event)

      // Get fresh intersects
      const isPointerMove = name === 'onPointerMove'
      const isClickEvent = name === 'onClick' || name === 'onContextMenu' || name === 'onDoubleClick'
      const filter = isPointerMove ? filterPointerEvents : undefined
      const hits = patchIntersects(intersect(filter), event)
      const delta = isClickEvent ? calculateDistance(event) : 0

      // Save initial coordinates on pointer-down
      if (name === 'onPointerDown') {
        internal.initialClick = [event.offsetX, event.offsetY]
        internal.initialHits = hits.map((hit) => hit.eventObject)
      }

      // If a click yields no results, pass it back to the user as a miss
      // Missed events have to come first in order to establish user-land side-effect clean up
      if (isClickEvent && !hits.length) {
        if (delta <= 2) {
          pointerMissed(event, internal.interaction)
          if (onPointerMissed) onPointerMissed(event as ThreeEvent<PointerEvent>)
        }
      }

      // Take care of unhover
      if (isPointerMove) cancelPointer(hits)

      handleIntersects(hits, event, delta, (data: DomEvent) => {
        const eventObject = data.eventObject
        const instance = (eventObject as unknown as Instance).__r3f
        const handlers = instance?.handlers
        // Check presence of handlers
        if (!instance?.eventCount) return

        if (isPointerMove) {
          // Move event ...
          if (handlers.onPointerOver || handlers.onPointerEnter || handlers.onPointerOut || handlers.onPointerLeave) {
            // When enter or out is present take care of hover-state
            const id = makeId(data)
            const hoveredItem = internal.hovered.get(id)
            if (!hoveredItem) {
              // If the object wasn't previously hovered, book it and call its handler
              internal.hovered.set(id, data)
              handlers.onPointerOver?.(data as ThreeEvent<PointerEvent>)
              handlers.onPointerEnter?.(data as ThreeEvent<PointerEvent>)
            } else if (hoveredItem.stopped) {
              // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
              data.stopPropagation()
            }
          }
          // Call mouse move
          handlers.onPointerMove?.(data as ThreeEvent<PointerEvent>)
        } else {
          // All other events ...
          const handler = handlers[name as keyof EventHandlers] as (event: ThreeEvent<PointerEvent>) => void
          if (handler) {
            // Forward all events back to their respective handlers with the exception of click events,
            // which must use the initial target
            if (
              (name !== 'onClick' && name !== 'onContextMenu' && name !== 'onDoubleClick') ||
              internal.initialHits.includes(eventObject)
            ) {
              // Missed events have to come first
              pointerMissed(
                event,
                internal.interaction.filter((object) => !internal.initialHits.includes(object)),
              )
              // Now call the handler
              handler(data as ThreeEvent<PointerEvent>)
            }
          }
        }
      })
    }
  }

  function pointerMissed(event: MouseEvent, objects: THREE.Object3D[]) {
    objects.forEach((object: THREE.Object3D) =>
      (object as unknown as Instance).__r3f?.handlers.onPointerMissed?.(event as ThreeEvent<PointerEvent>),
    )
  }

  return { handlePointer }
}
