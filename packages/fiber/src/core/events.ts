import * as THREE from '#three'
import { getRootState } from './utils'
import { unregisterVisibility } from './visibility'

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
  PointerState,
  XRPointerConfig,
} from '#types'

/** Default pointer ID for events without a pointer ID (e.g., mouse events) */
const DEFAULT_POINTER_ID = 0
/** Starting ID for XR pointers to avoid collision with DOM pointer IDs */
const XR_POINTER_ID_START = 1000

/** Get or create pointer state for a specific pointer ID */
function getPointerState(internal: RootState['internal'], pointerId: number): PointerState {
  let state = internal.pointerMap.get(pointerId)
  if (!state) {
    state = {
      hovered: new Map(),
      captured: new Map(),
      initialClick: [0, 0],
      initialHits: [],
    }
    internal.pointerMap.set(pointerId, state)
  }
  return state
}

/** Get pointer ID from event, defaulting to DEFAULT_POINTER_ID */
function getPointerId(event: DomEvent): number {
  return 'pointerId' in event ? event.pointerId : DEFAULT_POINTER_ID
}

function makeId(event: Intersection) {
  return (event.eventObject || event.object).uuid + '/' + event.index + event.instanceId
}

/**
 * Release pointer captures.
 * This is called by releasePointerCapture in the API, and when an object is removed.
 */
function releaseInternalPointerCapture(internal: RootState['internal'], obj: THREE.Object3D, pointerId: number): void {
  const pointerState = internal.pointerMap.get(pointerId)
  if (!pointerState) return

  const captureData = pointerState.captured.get(obj)
  if (captureData) {
    pointerState.captured.delete(obj)
    captureData.target.releasePointerCapture(pointerId)
  }
}

export function removeInteractivity(store: RootStore, object: THREE.Object3D) {
  const { internal } = store.getState()
  // Removes every trace of an object from the data store
  internal.interaction = internal.interaction.filter((o) => o !== object)

  // Clean up from all pointer states
  for (const [pointerId, pointerState] of internal.pointerMap) {
    // Remove from initialHits
    pointerState.initialHits = pointerState.initialHits.filter((o) => o !== object)
    // Remove from hovered
    pointerState.hovered.forEach((value, key) => {
      if (value.eventObject === object || value.object === object) {
        pointerState.hovered.delete(key)
      }
    })
    // Release any captures
    if (pointerState.captured.has(object)) {
      releaseInternalPointerCapture(internal, object, pointerId)
    }
  }

  // Remove from visibility registry (onFramed, onOccluded, onVisible)
  unregisterVisibility(store, object)
}

export function createEvents(store: RootStore) {
  /** Calculates delta from initial click position */
  function calculateDistance(event: DomEvent, pointerId: number) {
    const { internal } = store.getState()
    const pointerState = internal.pointerMap.get(pointerId)
    if (!pointerState) return 0
    const [initialX, initialY] = pointerState.initialClick
    const dx = event.offsetX - initialX
    const dy = event.offsetY - initialY
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }

  /** Returns true if an instance has a valid pointer-event registered, this excludes scroll, clicks etc */
  function filterPointerEvents(objects: THREE.Object3D[]) {
    return objects.filter(
      (obj) =>
        ['Move', 'Over', 'Enter', 'Out', 'Leave'].some(
          (name) =>
            (obj as Instance<THREE.Object3D>['object']).__r3f?.handlers[('onPointer' + name) as keyof EventHandlers],
        ) ||
        ['OverEnter', 'OverLeave', 'Over'].some(
          (name) =>
            (obj as Instance<THREE.Object3D>['object']).__r3f?.handlers[('onDrag' + name) as keyof EventHandlers],
        ) ||
        (obj as Instance<THREE.Object3D>['object']).__r3f?.handlers.onDrop,
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
    /*
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
      */

    // https://github.com/mrdoob/three.js/issues/16031
    // Allow custom userland intersect sort order, this likely only makes sense on the root filter
    if (state.events.filter) hits = state.events.filter(hits, state)

    // Bubble up the events, find the event source (eventObject)
    for (const hit of hits) {
      let eventObject: THREE.Object3D | null = hit.object
      // Bubble event up
      while (eventObject) {
        if ((eventObject as Instance<THREE.Object3D>['object']).__r3f?.eventCount) {
          intersections.push({ ...hit, eventObject })
        }
        eventObject = eventObject.parent
      }
    }

    // If the interaction is captured, make all capturing targets part of the intersect.
    if ('pointerId' in event) {
      const pointerId = event.pointerId
      const pointerState = state.internal.pointerMap.get(pointerId)
      if (pointerState?.captured.size) {
        for (const captureData of pointerState.captured.values()) {
          if (!duplicates.has(makeId(captureData.intersection))) intersections.push(captureData.intersection)
        }
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

          const hasPointerCapture = (id: number) => {
            const pointerState = internal.pointerMap.get(id)
            return pointerState?.captured.has(hit.eventObject) ?? false
          }

          const setPointerCapture = (id: number) => {
            const captureData = { intersection: hit, target: event.target as Element }
            const pointerState = getPointerState(internal, id)
            pointerState.captured.set(hit.eventObject, captureData)
            ;(event.target as Element).setPointerCapture(id)
          }

          const releasePointerCapture = (id: number) => {
            releaseInternalPointerCapture(internal, hit.eventObject, id)
          }

          // Add native event props
          const extractEventProps: any = {}
          // This iterates over the event's properties including the inherited ones. Native PointerEvents have most of their props as getters which are inherited, but polyfilled PointerEvents have them all as their own properties (i.e. not inherited). We can't use Object.keys() or Object.entries() as they only return "own" properties; nor Object.getPrototypeOf(event) as that *doesn't* return "own" properties, only inherited ones.
          for (const prop in event) {
            const property = event[prop as keyof DomEvent]
            // Only copy over atomics, leave functions alone as these should be
            // called as event.nativeEvent.fn()
            if (typeof property !== 'function') extractEventProps[prop] = property
          }

          // Extract pointerId from the event, handling both pointer events and fallback cases
          const eventPointerId = 'pointerId' in event ? event.pointerId : undefined

          const raycastEvent: ThreeEvent<DomEvent> = {
            ...hit,
            ...extractEventProps,
            pointer,
            intersections,
            stopped: localState.stopped,
            delta,
            unprojectedPoint,
            ray: raycaster.ray,
            camera: camera,
            pointerId: eventPointerId,
            // Hijack stopPropagation, which just sets a flag
            stopPropagation() {
              // https://github.com/pmndrs/react-three-fiber/issues/596
              // Events are not allowed to stop propagation if the pointer has been captured
              const pointerState = eventPointerId !== undefined ? internal.pointerMap.get(eventPointerId) : undefined

              // We only authorize stopPropagation...
              if (
                // ...if this pointer hasn't been captured
                !pointerState?.captured.size ||
                // ... or if the hit object is capturing the pointer
                pointerState.captured.has(hit.eventObject)
              ) {
                raycastEvent.stopped = localState.stopped = true
                // Propagation is stopped, remove all other hover records
                // An event handler is only allowed to flush other handlers if it is hovered itself
                if (
                  pointerState?.hovered.size &&
                  Array.from(pointerState.hovered.values()).find((i) => i.eventObject === hit.eventObject)
                ) {
                  // Objects cannot flush out higher up objects that have already caught the event
                  const higher = intersections.slice(0, intersections.indexOf(hit))
                  cancelPointer([...higher, hit], eventPointerId)
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

  function cancelPointer(intersections: Intersection[], pointerId?: number) {
    const { internal } = store.getState()
    const pid = pointerId ?? DEFAULT_POINTER_ID

    // Get pointer state
    const pointerState = internal.pointerMap.get(pid)
    if (!pointerState) return

    // Process hovered objects for this pointer
    for (const [hoveredId, hoveredObj] of pointerState.hovered) {
      // When no objects were hit or the hovered object wasn't found underneath the cursor
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
        pointerState.hovered.delete(hoveredId)
        if (instance?.eventCount) {
          const handlers = instance.handlers
          // Clear out intersects, they are outdated by now
          const data = { ...hoveredObj, intersections }
          handlers.onPointerOut?.(data as ThreeEvent<PointerEvent>)
          handlers.onPointerLeave?.(data as ThreeEvent<PointerEvent>)
          handlers.onDragOverLeave?.(data as ThreeEvent<DragEvent>)
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

  function dragOverMissed(event: DragEvent, objects: THREE.Object3D[]) {
    for (let i = 0; i < objects.length; i++) {
      const instance = (objects[i] as Instance<THREE.Object3D>['object']).__r3f
      instance?.handlers.onDragOverMissed?.(event)
    }
  }

  function dropMissed(event: DragEvent, objects: THREE.Object3D[]) {
    for (let i = 0; i < objects.length; i++) {
      const instance = (objects[i] as Instance<THREE.Object3D>['object']).__r3f
      instance?.handlers.onDropMissed?.(event)
    }
  }

  /** Clean up pointer state (called on pointerup/pointercancel) */
  function cleanupPointer(pointerId: number) {
    const { internal } = store.getState()
    const pointerState = internal.pointerMap.get(pointerId)
    if (pointerState) {
      // Fire pointer out for all hovered objects
      for (const [, hoveredObj] of pointerState.hovered) {
        const eventObject = hoveredObj.eventObject
        const instance = (eventObject as Instance<THREE.Object3D>['object']).__r3f
        if (instance?.eventCount) {
          const handlers = instance.handlers
          const data = { ...hoveredObj, intersections: [] as Intersection[] }
          handlers.onPointerOut?.(data as unknown as ThreeEvent<PointerEvent>)
          handlers.onPointerLeave?.(data as unknown as ThreeEvent<PointerEvent>)
        }
      }
      // Remove pointer state
      internal.pointerMap.delete(pointerId)
    }
    // Clean from dirty set
    internal.pointerDirty.delete(pointerId)
  }

  /** Process a deferred pointer event (raycasting) */
  function processDeferredPointer(event: DomEvent, pointerId: number) {
    const state = store.getState()
    const { onPointerMissed, onDragOverMissed, internal } = state

    // Early exit if events are disabled
    if (!state.events.enabled) return

    const isPointerMove = true // Deferred events are always pointer moves
    const filter = filterPointerEvents

    const hits = intersect(event, filter)

    // Take care of unhover
    cancelPointer(hits, pointerId)

    function onIntersect(data: ThreeEvent<DomEvent>) {
      const eventObject = data.eventObject
      const instance = (eventObject as Instance<THREE.Object3D>['object']).__r3f

      if (!instance?.eventCount) return
      const handlers = instance.handlers

      // Move event - handle hover state
      if (handlers.onPointerOver || handlers.onPointerEnter || handlers.onPointerOut || handlers.onPointerLeave) {
        const id = makeId(data)
        const pointerState = getPointerState(internal, pointerId)
        const hoveredItem = pointerState.hovered.get(id)
        if (!hoveredItem) {
          pointerState.hovered.set(id, data)
          handlers.onPointerOver?.(data as ThreeEvent<PointerEvent>)
          handlers.onPointerEnter?.(data as ThreeEvent<PointerEvent>)
        } else if (hoveredItem.stopped) {
          data.stopPropagation()
        }
      }
      handlers.onPointerMove?.(data as ThreeEvent<PointerEvent>)
    }

    handleIntersects(hits, event, 0, onIntersect)
  }

  function handlePointer(name: string) {
    // Deal with cancelation
    switch (name) {
      case 'onPointerLeave':
      case 'onDragLeave':
        return () => cancelPointer([]) // Global cancel of these events
      case 'onPointerCancel':
        return (event: DomEvent) => {
          const pointerId = getPointerId(event)
          cleanupPointer(pointerId)
        }
      case 'onLostPointerCapture':
        return (event: DomEvent) => {
          const { internal } = store.getState()
          const pointerId = getPointerId(event)
          const pointerState = internal.pointerMap.get(pointerId)
          if (pointerState?.captured.size) {
            // Call on the next frame because onLostPointerCapture fires before onPointerUp
            requestAnimationFrame(() => {
              const pointerState = internal.pointerMap.get(pointerId)
              if (pointerState?.captured.size) {
                pointerState.captured.clear()
              }
              cancelPointer([], pointerId)
            })
          }
        }
    }

    // Any other pointer goes here ...
    return function handleEvent(event: DomEvent) {
      const state = store.getState()
      const { onPointerMissed, onDragOverMissed, onDropMissed, internal, events } = state
      const pointerId = getPointerId(event)

      // Store last event for events.update()
      internal.lastEvent.current = event

      // Early exit if events are disabled - prevents raycasting and intersection checks
      if (!events.enabled) return

      // Get event type flags
      const isPointerMove = name === 'onPointerMove'
      const isDragOver = name === 'onDragOver'
      const isDrop = name === 'onDrop'
      const isClickEvent = name === 'onClick' || name === 'onContextMenu' || name === 'onDoubleClick'
      const isPointerDown = name === 'onPointerDown'
      const isPointerUp = name === 'onPointerUp'
      const isWheel = name === 'onWheel'

      // Frame-timed raycasting: defer pointer move if enabled and frameloop is 'always'
      // When frameloop is 'demand' or 'never', we must process immediately since the loop may not run
      const canDeferRaycasts = events.frameTimedRaycasts && state.frameloop === 'always'

      if (isPointerMove && canDeferRaycasts) {
        // Update pointer position immediately for responsive feel
        events.compute?.(event, state)
        // Mark pointer as dirty - will be processed at frame start
        internal.pointerDirty.set(pointerId, event)
        return
      }

      // For wheel events, check alwaysFireOnScroll setting
      if (isWheel && canDeferRaycasts && !events.alwaysFireOnScroll) {
        events.compute?.(event, state)
        internal.pointerDirty.set(pointerId, event)
        return
      }

      // For click events, flush any pending move raycasts first for accuracy
      if ((isClickEvent || isPointerDown || isPointerUp) && internal.pointerDirty.has(pointerId)) {
        const deferredEvent = internal.pointerDirty.get(pointerId)!
        internal.pointerDirty.delete(pointerId)
        processDeferredPointer(deferredEvent, pointerId)
      }

      // Filter interaction objects for pointer move and drag events
      const filter = isPointerMove || isDragOver || isDrop ? filterPointerEvents : undefined

      const hits = intersect(event, filter)
      const delta = isClickEvent ? calculateDistance(event, pointerId) : 0

      // Save initial coordinates on pointer-down
      if (isPointerDown) {
        const pointerState = getPointerState(internal, pointerId)
        pointerState.initialClick = [event.offsetX, event.offsetY]
        pointerState.initialHits = hits.map((hit) => hit.eventObject)
      }

      // Get initialHits from pointerMap
      const pointerState = internal.pointerMap.get(pointerId)
      const initialHits = pointerState?.initialHits ?? []

      // If a click yields no results, pass it back to the user as a miss
      if (isClickEvent && !hits.length) {
        if (delta <= 2) {
          pointerMissed(event, internal.interaction)
          if (onPointerMissed) onPointerMissed(event)
        }
      }

      // If a dragover yields no results, fire the missed callback
      if (isDragOver && !hits.length) {
        dragOverMissed(event as DragEvent, internal.interaction)
        if (onDragOverMissed) onDragOverMissed(event as DragEvent)
      }

      // If a drop yields no results, fire the missed callback
      if (isDrop && !hits.length) {
        dropMissed(event as DragEvent, internal.interaction)
        if (onDropMissed) onDropMissed(event as DragEvent)
      }

      // Take care of unhover
      if (isPointerMove || isDragOver) {
        cancelPointer(hits, pointerId)
      }

      function onIntersect(data: ThreeEvent<DomEvent>) {
        const eventObject = data.eventObject
        const instance = (eventObject as Instance<THREE.Object3D>['object']).__r3f

        // Check presence of handlers
        if (!instance?.eventCount) return
        const handlers = instance.handlers

        if (isPointerMove) {
          // Move event ...
          if (handlers.onPointerOver || handlers.onPointerEnter || handlers.onPointerOut || handlers.onPointerLeave) {
            const id = makeId(data)
            const pointerState = getPointerState(internal, pointerId)
            const hoveredItem = pointerState.hovered.get(id)
            if (!hoveredItem) {
              pointerState.hovered.set(id, data)
              handlers.onPointerOver?.(data as ThreeEvent<PointerEvent>)
              handlers.onPointerEnter?.(data as ThreeEvent<PointerEvent>)
            } else if (hoveredItem.stopped) {
              data.stopPropagation()
            }
          }
          handlers.onPointerMove?.(data as ThreeEvent<PointerEvent>)
        } else if (isDragOver) {
          // Handle dragover enter/leave state tracking
          const id = makeId(data)
          const pointerState = getPointerState(internal, pointerId)
          const hoveredItem = pointerState.hovered.get(id)
          if (!hoveredItem) {
            pointerState.hovered.set(id, data)
            handlers.onDragOverEnter?.(data as ThreeEvent<DragEvent>)
          } else if (hoveredItem.stopped) {
            data.stopPropagation()
          }
          handlers.onDragOver?.(data as ThreeEvent<DragEvent>)
        } else if (isDrop) {
          handlers.onDrop?.(data as ThreeEvent<DragEvent>)
        } else {
          // All other events ...
          const handler = handlers[name as keyof EventHandlers] as (event: ThreeEvent<PointerEvent>) => void
          if (handler) {
            if (!isClickEvent || initialHits.includes(eventObject)) {
              pointerMissed(
                event,
                internal.interaction.filter((object) => !initialHits.includes(object)),
              )
              handler(data as ThreeEvent<PointerEvent>)
            }
          } else {
            if (isClickEvent && initialHits.includes(eventObject)) {
              pointerMissed(
                event,
                internal.interaction.filter((object) => !initialHits.includes(object)),
              )
            }
          }
        }
      }

      handleIntersects(hits, event, delta, onIntersect)

      // Note: Don't clear initialHits/initialClick on pointerUp!
      // The click event fires AFTER pointerUp and needs access to them.
      // They get overwritten on the next pointerDown, which is correct behavior.
    }
  }

  /** Flush all pending pointer raycasts (called at frame start) */
  function flushDeferredPointers() {
    const { internal, events } = store.getState()
    if (!events.frameTimedRaycasts) return

    for (const [pointerId, event] of internal.pointerDirty) {
      processDeferredPointer(event, pointerId)
    }
    internal.pointerDirty.clear()
  }

  return { handlePointer, flushDeferredPointers, processDeferredPointer }
}

//* Migrated from web only folder to core

const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onDragEnter: ['dragenter', false],
  onDragLeave: ['dragleave', false],
  onDragOver: ['dragover', false],
  onDrop: ['drop', false],
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
  const { handlePointer, flushDeferredPointers, processDeferredPointer } = createEvents(store)

  // Counter for XR pointer IDs
  let nextXRPointerId = XR_POINTER_ID_START
  // Store XR pointer configs
  const xrPointers = new Map<number, XRPointerConfig>()

  //* EventManager object ==============================
  // For portals and others we do it as a SPREADABLE object instead of a class.
  return {
    priority: 1,
    enabled: true,
    frameTimedRaycasts: true,
    alwaysFireOnScroll: true,
    updateOnFrame: false,

    compute(event: DomEvent, state: RootState) {
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

    update: (pointerId?: number) => {
      const { events, internal } = store.getState()
      if (!events.handlers) return

      if (pointerId !== undefined) {
        // Re-raycast specific pointer
        const event = internal.pointerDirty.get(pointerId)
        if (event) {
          internal.pointerDirty.delete(pointerId)
          processDeferredPointer(event, pointerId)
        } else if (internal.lastEvent?.current) {
          // Use last event if no pending event for this pointer
          processDeferredPointer(internal.lastEvent.current, pointerId)
        }
      } else {
        // Flush all dirty pointers, then re-raycast with last event
        flushDeferredPointers()
        // If updateOnFrame is enabled or called manually, also fire with lastEvent
        if (internal.lastEvent?.current) {
          events.handlers.onPointerMove(internal.lastEvent.current)
        }
      }
    },

    flush: () => {
      const { events, internal } = store.getState()
      // Flush deferred pointer raycasts
      flushDeferredPointers()
      // If updateOnFrame is enabled, also re-raycast with last event for moving objects
      if (events.updateOnFrame && internal.lastEvent?.current && events.handlers) {
        events.handlers.onPointerMove(internal.lastEvent.current)
      }
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

    registerPointer: (config: XRPointerConfig) => {
      const pointerId = nextXRPointerId++
      xrPointers.set(pointerId, config)
      // Initialize pointer state
      const { internal } = store.getState()
      getPointerState(internal, pointerId)
      return pointerId
    },

    unregisterPointer: (pointerId: number) => {
      xrPointers.delete(pointerId)
      // Clean up pointer state
      const { internal } = store.getState()
      const pointerState = internal.pointerMap.get(pointerId)
      if (pointerState) {
        // Fire pointer out for all hovered objects
        for (const [, hoveredObj] of pointerState.hovered) {
          const eventObject = hoveredObj.eventObject
          const instance = (eventObject as Instance<THREE.Object3D>['object']).__r3f
          if (instance?.eventCount) {
            const handlers = instance.handlers
            const data = { ...hoveredObj, intersections: [] as Intersection[] }
            handlers.onPointerOut?.(data as unknown as ThreeEvent<PointerEvent>)
            handlers.onPointerLeave?.(data as unknown as ThreeEvent<PointerEvent>)
          }
        }
        internal.pointerMap.delete(pointerId)
      }
      internal.pointerDirty.delete(pointerId)
    },
  }
}
