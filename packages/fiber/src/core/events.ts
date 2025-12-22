import * as THREE from '#three'
import { getRootState } from './utils'

//* Type Imports ==============================
import type {
  Instance,
  RootState,
  RootStore,
  Intersection,
  ThreeEvent,
  DomEvent,
  Events,
  EventHandlers,
  EventManager,
  PointerCaptureTarget,
} from '#types'

function makeId(event: Intersection) {
  return (event.eventObject || event.object).uuid + '/' + event.index + event.instanceId
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

export function removeInteractivity(store: RootStore, object: THREE.Object3D) {
  const { internal } = store.getState()
  // Removes every trace of an object from the data store
  internal.interaction = internal.interaction.filter((o) => o !== object)
  internal.initialHits = internal.initialHits.filter((o) => o !== object)
  internal.hovered.forEach((value, key) => {
    if (value.eventObject === object || value.object === object) {
      // Clear out intersects, they are outdated by now
      internal.hovered.delete(key)
    }
  })
  internal.capturedMap.forEach((captures, pointerId) => {
    releaseInternalPointerCapture(internal.capturedMap, object, captures, pointerId)
  })
}

export function createEvents(store: RootStore) {
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
        (name) =>
          (obj as Instance<THREE.Object3D>['object']).__r3f?.handlers[('onPointer' + name) as keyof EventHandlers],
      ),
    )
  }

  function intersect(event: DomEvent, filter?: (objects: THREE.Object3D[]) => THREE.Object3D[]) {
    const state = store.getState()
    const duplicates = new Set<string>()
    const intersections: Intersection[] = []
    // Allow callers to eliminate event objects
    const eventsObjects = filter ? filter(state.internal.interaction) : state.internal.interaction
    // Reset all raycaster cameras to undefined
    for (let i = 0; i < eventsObjects.length; i++) {
      const state = getRootState(eventsObjects[i])
      if (state) {
        state.raycaster.camera = undefined!
      }
    }

    if (!state.previousRoot) {
      // Make sure root-level pointer and ray are set up
      state.events.compute?.(event, state)
    }

    function handleRaycast(obj: THREE.Object3D) {
      const state = getRootState(obj)
      // Skip event handling when noEvents is set, or when the raycasters camera is null
      if (!state || !state.events.enabled || state.raycaster.camera === null) return []

      // When the camera is undefined we have to call the event layers update function
      if (state.raycaster.camera === undefined) {
        state.events.compute?.(event, state, state.previousRoot?.getState())
        // If the camera is still undefined we have to skip this layer entirely
        if (state.raycaster.camera === undefined) state.raycaster.camera = null!
      }

      // Intersect object by object
      return state.raycaster.camera ? state.raycaster.intersectObject(obj, true) : []
    }
    //console.log('raw eventObjects', eventsObjects)

    // Collect events
    let hits: THREE.Intersection<THREE.Object3D>[] = eventsObjects
      // Intersect objects
      .flatMap(handleRaycast)
      // Sort by event priority and distance
      // Higher priority = processed first, then closer objects first
      .sort((a, b) => {
        const aState = getRootState(a.object)
        const bState = getRootState(b.object)
        // Default priority is 1 (from createPointerEvents), but may be undefined for some objects
        const aPriority = aState?.events?.priority ?? 1
        const bPriority = bState?.events?.priority ?? 1
        // Sort by priority descending (higher first), then by distance ascending (closer first)
        return bPriority - aPriority || a.distance - b.distance
      })
      // Filter out duplicates
      .filter((item) => {
        const id = makeId(item as Intersection)
        if (duplicates.has(id)) return false
        duplicates.add(id)
        return true
      })

    // DEBUG: Log hit priorities
    if (hits.length > 1) {
      console.log(
        '%c[Events Debug] Sorted hits:',
        'color: cyan',
        hits.map((h) => ({
          name: h.object.name || h.object.type,
          priority: getRootState(h.object)?.events?.priority ?? 1,
          distance: h.distance.toFixed(3),
        })),
      )
    }

    // https://github.com/mrdoob/three.js/issues/16031
    // Allow custom userland intersect sort order, this likely only makes sense on the root filter
    if (state.events.filter) hits = state.events.filter(hits, state)

    // Bubble up the events, find the event source (eventObject)
    for (const hit of hits) {
      let eventObject: THREE.Object3D | null = hit.object
      // Bubble event up
      while (eventObject) {
        if ((eventObject as Instance<THREE.Object3D>['object']).__r3f?.eventCount)
          intersections.push({ ...hit, eventObject })
        eventObject = eventObject.parent
      }
    }

    // If the interaction is captured, make all capturing targets part of the intersect.
    if ('pointerId' in event && state.internal.capturedMap.has(event.pointerId)) {
      for (let captureData of state.internal.capturedMap.get(event.pointerId)!.values()) {
        if (!duplicates.has(makeId(captureData.intersection))) intersections.push(captureData.intersection)
      }
    }
    return intersections
  }

  /**  Handles intersections by forwarding them to handlers */
  function handleIntersects(
    intersections: Intersection[],
    event: DomEvent,
    delta: number,
    callback: (event: ThreeEvent<DomEvent>) => void,
  ) {
    // If anything has been found, forward it to the event listeners
    if (intersections.length) {
      const localState = { stopped: false }
      for (const hit of intersections) {
        const state = getRootState(hit.object)

        if (state) {
          const { raycaster, pointer, camera, internal } = state
          const unprojectedPoint = new THREE.Vector3(pointer.x, pointer.y, 0).unproject(camera)

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

          let raycastEvent: ThreeEvent<DomEvent> = {
            ...hit,
            ...extractEventProps,
            pointer,
            intersections,
            stopped: localState.stopped,
            delta,
            unprojectedPoint,
            ray: raycaster.ray,
            camera: camera,
            // Hijack stopPropagation, which just sets a flag
            stopPropagation() {
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
            nativeEvent: event,
          }

          // Call subscribers
          callback(raycastEvent)
          // Event bubbling may be interrupted by stopPropagation
          if (localState.stopped === true) break
        }
      }
    }
    return intersections
  }

  function cancelPointer(intersections: Intersection[]) {
    const { internal } = store.getState()
    for (const hoveredObj of internal.hovered.values()) {
      // When no objects were hit or the the hovered object wasn't found underneath the cursor
      // we call onPointerOut and delete the object from the hovered-elements map
      if (
        !intersections.length ||
        !intersections.find(
          (hit) =>
            hit.object === hoveredObj.object &&
            hit.index === hoveredObj.index &&
            hit.instanceId === hoveredObj.instanceId,
        )
      ) {
        const eventObject = hoveredObj.eventObject
        const instance = (eventObject as Instance<THREE.Object3D>['object']).__r3f
        internal.hovered.delete(makeId(hoveredObj))
        if (instance?.eventCount) {
          const handlers = instance.handlers
          // Clear out intersects, they are outdated by now
          const data = { ...hoveredObj, intersections }
          handlers.onPointerOut?.(data as ThreeEvent<PointerEvent>)
          handlers.onPointerLeave?.(data as ThreeEvent<PointerEvent>)
        }
      }
    }
  }

  function pointerMissed(event: MouseEvent, objects: THREE.Object3D[]) {
    for (let i = 0; i < objects.length; i++) {
      const instance = (objects[i] as Instance<THREE.Object3D>['object']).__r3f
      instance?.handlers.onPointerMissed?.(event)
    }
  }

  function handlePointer(name: string) {
    // Deal with cancelation
    switch (name) {
      case 'onPointerLeave':
      case 'onPointerCancel':
        return () => cancelPointer([])
      case 'onLostPointerCapture':
        return (event: DomEvent) => {
          const { internal } = store.getState()
          if ('pointerId' in event && internal.capturedMap.has(event.pointerId)) {
            // If the object event interface had onLostPointerCapture, we'd call it here on every
            // object that's getting removed. We call it on the next frame because onLostPointerCapture
            // fires before onPointerUp. Otherwise pointerUp would never be called if the event didn't
            // happen in the object it originated from, leaving components in a in-between state.
            requestAnimationFrame(() => {
              // Only release if pointer-up didn't do it already
              if (internal.capturedMap.has(event.pointerId)) {
                internal.capturedMap.delete(event.pointerId)
                cancelPointer([])
              }
            })
          }
        }
    }

    // Any other pointer goes here ...
    return function handleEvent(event: DomEvent) {
      const { onPointerMissed, internal } = store.getState()

      // prepareRay(event)
      internal.lastEvent.current = event

      // Get fresh intersects
      const isPointerMove = name === 'onPointerMove'
      const isClickEvent = name === 'onClick' || name === 'onContextMenu' || name === 'onDoubleClick'
      const filter = isPointerMove ? filterPointerEvents : undefined

      const hits = intersect(event, filter)
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
          if (onPointerMissed) onPointerMissed(event)
        }
      }
      // Take care of unhover
      if (isPointerMove) cancelPointer(hits)

      function onIntersect(data: ThreeEvent<DomEvent>) {
        const eventObject = data.eventObject
        const instance = (eventObject as Instance<THREE.Object3D>['object']).__r3f

        // Check presence of handlers
        if (!instance?.eventCount) return
        const handlers = instance.handlers

        /*
        MAYBE TODO, DELETE IF NOT: 
          Check if the object is captured, captured events should not have intersects running in parallel
          But wouldn't it be better to just replace capturedMap with a single entry?
          Also, are we OK with straight up making picking up multiple objects impossible?
          
        const pointerId = (data as ThreeEvent<PointerEvent>).pointerId        
        if (pointerId !== undefined) {
          const capturedMeshSet = internal.capturedMap.get(pointerId)
          if (capturedMeshSet) {
            const captured = capturedMeshSet.get(eventObject)
            if (captured && captured.localState.stopped) return
          }
        }*/

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
            if (!isClickEvent || internal.initialHits.includes(eventObject)) {
              // Missed events have to come first
              pointerMissed(
                event,
                internal.interaction.filter((object) => !internal.initialHits.includes(object)),
              )
              // Now call the handler
              handler(data as ThreeEvent<PointerEvent>)
            }
          } else {
            // Trigger onPointerMissed on all elements that have pointer over/out handlers, but not click and weren't hit
            if (isClickEvent && internal.initialHits.includes(eventObject)) {
              pointerMissed(
                event,
                internal.interaction.filter((object) => !internal.initialHits.includes(object)),
              )
            }
          }
        }
      }

      handleIntersects(hits, event, delta, onIntersect)
    }
  }

  return { handlePointer }
}

//* Migrated from web only folder to core

const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
} as const

/** Default R3F event manager for web */
export function createPointerEvents(store: RootStore): EventManager<HTMLElement> {
  const { handlePointer } = createEvents(store)

  return {
    priority: 1,
    enabled: true,
    compute(event: DomEvent, state: RootState, previous?: RootState) {
      // https://github.com/pmndrs/react-three-fiber/pull/782
      // Events trigger outside of canvas when moved, use offsetX/Y by default and allow overrides
      state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    },

    connected: undefined,
    handlers: Object.keys(DOM_EVENTS).reduce(
      (acc, key) => ({ ...acc, [key]: handlePointer(key) }),
      {},
    ) as unknown as Events,
    update: () => {
      const { events, internal } = store.getState()
      if (internal.lastEvent?.current && events.handlers) events.handlers.onPointerMove(internal.lastEvent.current)
    },
    connect: (target: HTMLElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      if (events.handlers) {
        for (const name in events.handlers) {
          const event = events.handlers[name as keyof typeof events.handlers]
          const [eventName, passive] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
          target.addEventListener(eventName, event, { passive })
        }
      }
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        if (events.handlers) {
          for (const name in events.handlers) {
            const event = events.handlers[name as keyof typeof events.handlers]
            const [eventName] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
            events.connected.removeEventListener(eventName, event)
          }
        }
        set((state) => ({ events: { ...state.events, connected: undefined } }))
      }
    },
  }
}
