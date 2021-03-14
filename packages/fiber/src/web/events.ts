import * as THREE from 'three'
import { UseStore } from 'zustand'
import { EventManager, RootState } from '../core/store'

import type { DomEvent, Intersection } from '../helpers/events'
import { createCalculateDistance, makeId, createPrepareRay, createIntersect } from '../helpers/events'

function createEvents(store: UseStore<RootState>): EventManager<HTMLCanvasElement> {
  const hovered = new Map<string, DomEvent>()
  const temp = new THREE.Vector3()

  /**
   * Sets up helper functions that are
   * shared between target event handling
   */
  /**  Calculates click deltas */
  const calculateDistance = createCalculateDistance(store)
  /** Sets up defaultRaycaster */
  const prepareRay = createPrepareRay(store)
  /** Intersects interaction objects using the event input */
  const intersect = createIntersect(store)

  function handlePointerCancel(event: DomEvent, hits?: Intersection[], prepare = true) {
    if (prepare) prepareRay(event)

    Array.from(hovered.values()).forEach((hoveredObj) => {
      // When no objects were hit or the the hovered object wasn't found underneath the cursor
      // we call onPointerOut and delete the object from the hovered-elements map
      if (
        hits &&
        (!hits.length || !hits.find((hit) => hit.object === hoveredObj.object && hit.index === hoveredObj.index))
      ) {
        const eventObject = hoveredObj.eventObject
        const handlers = (eventObject as any).__r3f.handlers
        hovered.delete(makeId(hoveredObj))
        if (handlers) {
          // Clear out intersects, they are outdated by now
          const data = { ...hoveredObj, intersections: hits || [] }
          if (handlers.pointerOut) handlers.pointerOut({ ...data, type: 'pointerout' })
          if (handlers.pointerLeave) handlers.pointerLeave({ ...data, type: 'pointerleave' })
        }
      }
    })
  }

  /**  Creates filtered intersects and returns an array of positive hits */
  function getIntersects(event: DomEvent, filter?: (objects: THREE.Object3D[]) => THREE.Object3D[]) {
    const { internal } = store.getState()
    // Get fresh intersects
    const intersections: Intersection[] = intersect(filter)
    // If the interaction is captured take that into account, the captured event has to be part of the intersects
    if (internal.captured && event?.type !== 'click' && event?.type !== 'wheel') {
      internal.captured.forEach((captured) => {
        if (!intersections.find((hit) => hit.eventObject === captured.eventObject)) intersections.push(captured)
      })
    }
    return intersections
  }

  /**  Handles intersections by forwarding them to handlers */
  function handleIntersects(intersections: Intersection[], event: DomEvent, fn: (event: DomEvent) => void) {
    const { raycaster, mouse, camera, internal } = store.getState()
    // If anything has been found, forward it to the event listeners
    if (intersections.length) {
      const unprojectedPoint = temp.set(mouse.x, mouse.y, 0).unproject(camera)
      const delta = event.type === 'click' ? calculateDistance(event) : 0
      const releasePointerCapture = (id: any) => (event.target as any).releasePointerCapture(id)
      const localState = { stopped: false, captured: false }

      for (const hit of intersections) {
        const setPointerCapture = (id: any) => {
          // If the hit is going to be captured flag that we're in captured state
          if (!localState.captured) {
            localState.captured = true
            // The captured hit array is reset to collect hits
            internal.captured = []
          }
          // Push hits to the array
          if (internal.captured)
            internal.captured.push(hit)
            // Call the original event now
          ;(event.target as any).setPointerCapture(id)
        }

        const raycastEvent = {
          ...event,
          ...hit,
          intersections,
          stopped: localState.stopped,
          delta,
          unprojectedPoint,
          ray: raycaster.ray,
          camera: camera,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => {
            // https://github.com/react-spring/react-three-fiber/issues/596
            // Events are not allowed to stop propagation if the pointer has been captured
            const cap = internal.captured
            if (!cap || cap.find((h) => h.eventObject.id === hit.eventObject.id)) {
              raycastEvent.stopped = localState.stopped = true

              // Propagation is stopped, remove all other hover records
              // An event handler is only allowed to flush other handlers if it is hovered itself
              if (hovered.size && Array.from(hovered.values()).find((i) => i.eventObject === hit.eventObject)) {
                // Objects cannot flush out higher up objects that have already caught the event
                const higher = intersections.slice(0, intersections.indexOf(hit))
                handlePointerCancel(raycastEvent as DomEvent, [...higher, hit])
              }
            }
          },
          target: { ...event.target, setPointerCapture, releasePointerCapture },
          currentTarget: { ...event.currentTarget, setPointerCapture, releasePointerCapture },
          sourceEvent: event,
        }

        fn(raycastEvent as DomEvent)

        // Event bubbling may be interrupted by stopPropagation
        if (localState.stopped === true) break
      }
    }
    return intersections
  }

  function handlePointerMove(event: DomEvent, prepare = true) {
    if (prepare) prepareRay(event)
    const hits = getIntersects(
      event,
      // This is onPointerMove, we're only interested in events that exhibit this particular event
      (objects: any) =>
        objects.filter((obj: any) =>
          ['Move', 'Over', 'Enter', 'Out', 'Leave'].some((name) => (obj as any).__r3f.handlers['pointer' + name]),
        ),
    )

    // Take care of unhover
    handlePointerCancel(event, hits)
    handleIntersects(hits, event, (data: DomEvent) => {
      const eventObject = data.eventObject
      const handlers = (eventObject as any).__r3f.handlers
      // Check presence of handlers
      if (!handlers) return
      // Check if mouse enter or out is present
      if (handlers.pointerOver || handlers.pointerEnter || handlers.pointerOut || handlers.pointerLeave) {
        const id = makeId(data)
        const hoveredItem = hovered.get(id)
        if (!hoveredItem) {
          // If the object wasn't previously hovered, book it and call its handler
          hovered.set(id, data)
          if (handlers.pointerOver) handlers.pointerOver({ ...data, type: 'pointerover' })
          if (handlers.pointerEnter) handlers.pointerEnter({ ...data, type: 'pointerenter' })
        } else if (hoveredItem.stopped) {
          // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
          data.stopPropagation()
        }
      }
      // Call mouse move
      if (handlers.pointerMove) handlers.pointerMove(data)
    })
    return hits
  }

  function pointerMissed(event: MouseEvent, objects: THREE.Object3D[], filter = (object: THREE.Object3D) => true) {
    objects.filter(filter).forEach((object: THREE.Object3D) => (object as any).__r3f.handlers.pointerMissed?.(event))
  }

  const handlePointer = (name: string) => (event: DomEvent, prepare = true) => {
    const { onPointerMissed, internal } = store.getState()

    if (prepare) prepareRay(event)
    const hits = getIntersects(event)
    handleIntersects(hits, event, (data: DomEvent) => {
      const eventObject = data.eventObject
      const handlers = (eventObject as any).__r3f.handlers
      if (handlers && handlers[name]) {
        // Forward all events back to their respective handlers with the exception of click events,
        // which must use the initial target
        if (
          (name !== 'click' && name !== 'contextMenu' && name !== 'doubleClick') ||
          internal.initialHits.includes(eventObject)
        ) {
          handlers[name](data)
          pointerMissed(event, internal.interaction as THREE.Object3D[], (object) => object !== eventObject)
        }
      }
    })
    // If a click yields no results, pass it back to the user as a miss
    if (name === 'pointerDown') {
      internal.initialClick = [event.offsetX, event.offsetY]
      internal.initialHits = hits.map((hit: any) => hit.eventObject)
    }

    if ((name === 'click' || name === 'contextMenu' || name === 'doubleClick') && !hits.length) {
      if (calculateDistance(event) <= 2) {
        pointerMissed(event, internal.interaction as THREE.Object3D[])
        if (onPointerMissed) onPointerMissed()
      }
    }
  }

  return {
    connected: false,
    handlers: {
      click: handlePointer('click') as EventListener,
      contextmenu: handlePointer('contextMenu') as EventListener,
      dblclick: handlePointer('doubleClick') as EventListener,
      wheel: handlePointer('wheel') as EventListener,
      pointerdown: handlePointer('pointerDown') as EventListener,
      pointerup: handlePointer('pointerUp') as EventListener,
      pointerleave: ((e: any) => handlePointerCancel(e, [])) as EventListener,
      pointermove: (handlePointerMove as unknown) as EventListener,
      lostpointercapture: ((e: any) => (
        (store.getState().internal.captured = undefined), handlePointerCancel(e)
      )) as EventListener,
    },
    connect: (target: HTMLElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      Object.entries(events?.handlers ?? []).forEach(([name, event]) =>
        target.addEventListener(name, event, { passive: true }),
      )
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        Object.entries(events.handlers ?? []).forEach(([name, event]) => {
          if (events && events.connected instanceof HTMLElement) {
            events.connected.removeEventListener(name, event)
          }
        })
        set((state) => ({ events: { ...state.events, connected: false } }))
      }
    },
  }
}

export { createEvents }
