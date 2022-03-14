import * as THREE from 'three'
// @ts-ignore
import { ContinuousEventPriority, DiscreteEventPriority, DefaultEventPriority } from 'react-reconciler/constants'
import type { UseStore } from 'zustand'
import type { Instance } from './renderer'
import type { ComputeOffsetsFunction, FilterFunction, RootState } from './store'

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export interface IntersectionEvent<TSourceEvent> extends Intersection {
  intersections: Intersection[]
  stopped: boolean
  unprojectedPoint: THREE.Vector3
  ray: THREE.Ray
  camera: Camera
  stopPropagation: () => void
  /**
   * @deprecated in favour of nativeEvent. Please use that instead.
   */
  sourceEvent: TSourceEvent
  nativeEvent: TSourceEvent
  delta: number
  spaceX: number
  spaceY: number
}

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export type ThreeEvent<TEvent> = IntersectionEvent<TEvent>
export type DomEvent = PointerEvent | MouseEvent | WheelEvent

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
  onPointerMissed?: (event: MouseEvent) => void
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

export class EventLayer {
  raycaster: THREE.Raycaster
  allowPassthrough: 'never' | 'nohits' | 'always'
  enabled: boolean
  filter?: FilterFunction
  computeOffsets?: ComputeOffsetsFunction
  onPointerMissed?: (event: MouseEvent) => void

  readonly update = (event: DomEvent) => {
    return this.onUpdate(this, event)
  }

  constructor(
    public priority: number,
    public onUpdate: (thisEventLayer: EventLayer, event: DomEvent) => boolean,
    options: {
      enabled?: boolean
      allowPassthrough?: 'never' | 'nohits' | 'always'
      filter?: FilterFunction
      computeOffsets?: ComputeOffsetsFunction
      onPointerMissed?: (event: MouseEvent) => void
      raycaster?: THREE.Raycaster
    } = {},
  ) {
    this.raycaster = options.raycaster ?? new THREE.Raycaster()
    this.enabled = options.enabled ?? true
    this.allowPassthrough = options.allowPassthrough ?? 'nohits'
    this.filter = options.filter
    this.computeOffsets = options.computeOffsets
    this.onPointerMissed = options.onPointerMissed
  }
}

export function getEventLayerForObject(object: THREE.Object3D): EventLayer | undefined {
  let eventLayer: EventLayer | undefined = undefined
  let closestAncestorWithEventLayer: THREE.Object3D | null = object
  while (closestAncestorWithEventLayer) {
    if ((eventLayer = (closestAncestorWithEventLayer as unknown as Instance).__r3f?.eventLayer)) {
      break
    }
    closestAncestorWithEventLayer = closestAncestorWithEventLayer.parent
  }

  return eventLayer
}

function makeId(event: Intersection) {
  return (event.eventObject || event.object).uuid + '/' + event.index + event.instanceId
}

// https://github.com/facebook/react/tree/main/packages/react-reconciler#getcurrenteventpriority
// Gives React a clue as to how import the current interaction is
export function getEventPriority() {
  let name = window?.event?.type
  switch (name) {
    case 'click':
    case 'contextmenu':
    case 'dblclick':
    case 'pointercancel':
    case 'pointerdown':
    case 'pointerup':
      return DiscreteEventPriority
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'pointerenter':
    case 'pointerleave':
    case 'wheel':
      return ContinuousEventPriority
    default:
      return DefaultEventPriority
  }
}

/**
 * Release pointer captures.
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
  const state = store.getState()
  const { internal } = state
  const eventLayer = getEventLayerForObject(object) ?? store.getState().defaultEventLayer
  // Removes every trace of an object from the data store
  internal.interaction = internal.interaction.filter((o) => o !== object)

  internal.initialHits.set(
    eventLayer,
    internal.initialHits.get(eventLayer)!.filter((o) => o !== object),
  )
  internal.hovered.forEach((hoverMap, eventLayer) => {
    hoverMap.forEach((value, key) => {
      if (value.eventObject === object || value.object === object) {
        internal.hovered.get(eventLayer)!.delete(key)
      }
    })
  })
  internal.capturedMap.forEach((captures, pointerId) => {
    releaseInternalPointerCapture(internal.capturedMap, object, captures, pointerId)
  })
}

export function createEvents(store: UseStore<RootState>) {
  const temp = new THREE.Vector3()

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

  function intersect(
    eventLayer: EventLayer,
    objects: THREE.Object3D[],
    filter?: (objects: THREE.Object3D[]) => THREE.Object3D[],
  ) {
    const state = store.getState()
    // Skip event handling when noEvents is set
    if (!eventLayer.enabled) return []

    const seen = new Set<string>()
    const intersections: Intersection[] = []

    // Allow callers to eliminate event objects
    const eventsObjects = filter ? filter(objects) : objects

    // Intersect known handler objects and filter against duplicates
    let intersects = eventLayer.raycaster.intersectObjects(eventsObjects, true).filter((item) => {
      const id = makeId(item as Intersection)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    // https://github.com/mrdoob/three.js/issues/16031
    // Allow custom userland intersect sort order
    if (eventLayer.filter) intersects = eventLayer.filter(intersects, state)

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
    eventLayer: EventLayer,
    intersections: Intersection[],
    event: DomEvent,
    delta: number,
    callback: (event: ThreeEvent<DomEvent>) => void,
  ) {
    const { mouse, camera, internal } = store.getState()
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
          ray: eventLayer.raycaster.ray,
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
                Array.from(internal.hovered.get(eventLayer)!.values()).find((i) => i.eventObject === hit.eventObject)
              ) {
                // Objects cannot flush out higher up objects that have already caught the event
                const higher = intersections.slice(0, intersections.indexOf(hit))
                cancelPointer(eventLayer, [...higher, hit])
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
        callback(raycastEvent)
        // Event bubbling may be interrupted by stopPropagation
        if (localState.stopped === true) break
      }
    }
    return intersections
  }

  function cancelPointer(eventLayer: EventLayer, hits: Intersection[]) {
    const { internal } = store.getState()
    const hovered = internal.hovered.get(eventLayer)
    if (!hovered) {
      return
    }
    Array.from(hovered.values()).forEach((hoveredObj) => {
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
        hovered.delete(makeId(hoveredObj))
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
    // Any other pointer goes here ...
    return (event: DomEvent) => {
      const { internal } = store.getState()

      const layers = new Map<EventLayer, THREE.Object3D[]>()

      for (const [eventLayer] of internal.hovered) {
        if (!layers.has(eventLayer)) {
          cancelPointer(eventLayer, [])
        }
      }

      for (const object of internal.interaction) {
        const eventLayer = getEventLayerForObject(object) ?? store.getState().defaultEventLayer
        if (!layers.get(eventLayer)) {
          layers.set(eventLayer, [])
        }
        layers.get(eventLayer)!.push(object)
      }

      const sortedLayers = [...layers.entries()].sort((a, b) => b[0].priority - a[0].priority)

      let occludeLayers = false

      for (const [eventLayer, objects] of sortedLayers) {
        // Deal with cancelation
        switch (name) {
          case 'onPointerLeave':
          case 'onPointerCancel':
            return () => cancelPointer(eventLayer, [])
          case 'onLostPointerCapture':
            return (event: DomEvent) => {
              const { internal } = store.getState()
              if ('pointerId' in event && !internal.capturedMap.has(event.pointerId)) {
                // If the object event interface had onLostPointerCapture, we'd call it here on every
                // object that's getting removed.
                internal.capturedMap.delete(event.pointerId)
                cancelPointer(eventLayer, [])
              }
            }
        }

        const isActive = eventLayer.update(event)

        if (!isActive || occludeLayers) {
          cancelPointer(eventLayer, [])
          continue
        }

        internal.lastEvent.current = event

        // Get fresh intersects
        const isPointerMove = name === 'onPointerMove'
        const isClickEvent = name === 'onClick' || name === 'onContextMenu' || name === 'onDoubleClick'
        const filter = isPointerMove ? filterPointerEvents : undefined
        // If a higher priority layer occludes this one, set the intersections to empty
        const hits = patchIntersects(intersect(eventLayer, objects, filter), event)
        const delta = isClickEvent ? calculateDistance(event) : 0

        // If there's a hit, and passthrough is not allowed, occlude the rest of the layers
        if (
          (isActive && eventLayer.allowPassthrough === 'never') ||
          (hits.length && eventLayer.allowPassthrough === 'nohits')
        ) {
          occludeLayers = true
        }

        // Save initial coordinates on pointer-down
        if (name === 'onPointerDown') {
          internal.initialClick = [event.offsetX, event.offsetY]
          internal.initialHits.set(
            eventLayer,
            hits.map((hit) => hit.eventObject),
          )
        }

        // If a click yields no results, pass it back to the user as a miss
        // Missed events have to come first in order to establish user-land side-effect clean up
        if (isClickEvent && !hits.length) {
          if (delta <= 2) {
            pointerMissed(event, objects)
            if (eventLayer.onPointerMissed) eventLayer.onPointerMissed(event)
          }
        }

        // Take care of unhover
        if (isPointerMove) cancelPointer(eventLayer, hits)

        handleIntersects(eventLayer, hits, event, delta, (data: ThreeEvent<DomEvent>) => {
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
              const hoveredItem = internal.hovered.get(eventLayer)?.get(id)
              if (!hoveredItem) {
                // If the object wasn't previously hovered, book it and call its handler
                internal.hovered.get(eventLayer)!.set(id, data)
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
              if (!isClickEvent || internal.initialHits.get(eventLayer)!.includes(eventObject)) {
                // Missed events have to come first
                pointerMissed(
                  event,
                  objects.filter((object) => !internal.initialHits.get(eventLayer)!.includes(object)),
                )
                // Now call the handler
                handler(data as ThreeEvent<PointerEvent>)
              }
            } else {
              // Trigger onPointerMissed on all elements that have pointer over/out handlers, but not click and weren't hit
              if (isClickEvent && internal.initialHits.get(eventLayer)!.includes(eventObject)) {
                pointerMissed(
                  event,
                  objects.filter((object) => !internal.initialHits.get(eventLayer)!.includes(object)),
                )
              }
            }
          }
        })
      }
    }
  }

  function pointerMissed(event: MouseEvent, objects: THREE.Object3D[]) {
    objects.forEach((object: THREE.Object3D) =>
      (object as unknown as Instance).__r3f?.handlers.onPointerMissed?.(event),
    )
  }

  return { handlePointer }
}
