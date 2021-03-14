import * as THREE from 'three'
import { UseStore } from 'zustand'
import { RootState } from '../core/store'
import type { DomEvent, EventManager, Intersection, ThreeEvent } from '../core/events'
import { createEvents, EventHandlers } from '../core/events'
import { Instance } from '../core/renderer'

export function createDOMEvents(store: UseStore<RootState>): EventManager<HTMLElement> {
  const temp = new THREE.Vector3()
  const { hovered, makeId, prepareRay, intersect, patchIntersects } = createEvents(store)

  function calculateDistance(event: DomEvent) {
    const { internal } = store.getState()
    const dx = event.offsetX - internal.initialClick[0]
    const dy = event.offsetY - internal.initialClick[1]
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }

  /**  Handles intersections by forwarding them to handlers */
  function handleIntersects(intersections: Intersection[], event: DomEvent, callback: (event: DomEvent) => void) {
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

        callback(raycastEvent as DomEvent)

        // Event bubbling may be interrupted by stopPropagation
        if (localState.stopped === true) break
      }
    }
    return intersections
  }

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
        const handlers = ((eventObject as unknown) as Instance).__r3f.handlers
        hovered.delete(makeId(hoveredObj))
        if (handlers) {
          // Clear out intersects, they are outdated by now
          const data = { ...hoveredObj, intersections: hits || [] }
          handlers.onPointerOut?.(data as ThreeEvent<PointerEvent>)
          handlers.onPointerLeave?.(data as ThreeEvent<PointerEvent>)
        }
      }
    })
  }

  function pointerEventsOnly(objects: THREE.Object3D[]) {
    return objects.filter((obj) =>
      ['Move', 'Over', 'Enter', 'Out', 'Leave'].some(
        (name) => ((obj as unknown) as Instance).__r3f.handlers?.[('onPointer' + name) as keyof EventHandlers],
      ),
    )
  }

  function handlePointerMove(event: DomEvent, prepare = true) {
    if (prepare) prepareRay(event)
    // Get fresh intersects
    const hits = patchIntersects(intersect(pointerEventsOnly), event)
    // Take care of unhover
    handlePointerCancel(event, hits)
    handleIntersects(hits, event, (data: DomEvent) => {
      const eventObject = data.eventObject
      const handlers = ((eventObject as unknown) as Instance).__r3f.handlers
      // Check presence of handlers
      if (!handlers) return
      // Check if mouse enter or out is present
      if (handlers.onPointerOver || handlers.onPointerEnter || handlers.onPointerOut || handlers.onPointerLeave) {
        const id = makeId(data)
        const hoveredItem = hovered.get(id)
        if (!hoveredItem) {
          // If the object wasn't previously hovered, book it and call its handler
          hovered.set(id, data)
          handlers.onPointerOver?.(data as ThreeEvent<PointerEvent>)
          handlers.onPointerEnter?.(data as ThreeEvent<PointerEvent>)
        } else if (hoveredItem.stopped) {
          // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
          data.stopPropagation()
        }
      }
      // Call mouse move
      handlers.onPointerMove?.(data as ThreeEvent<PointerEvent>)
    })
    return hits
  }

  function pointerMissed(event: MouseEvent, objects: THREE.Object3D[]) {
    objects.forEach((object: THREE.Object3D) =>
      ((object as unknown) as Instance).__r3f.handlers?.onPointerMissed?.(event as ThreeEvent<PointerEvent>),
    )
  }

  const handlePointer = (name: string) => (event: DomEvent, prepare = true) => {
    const { onPointerMissed, internal } = store.getState()

    if (prepare) prepareRay(event)
    // Get fresh intersects
    const hits = patchIntersects(intersect(), event)
    handleIntersects(hits, event, (data: DomEvent) => {
      const eventObject = data.eventObject
      const handlers = ((eventObject as unknown) as Instance).__r3f.handlers
      const handler = handlers?.[name as keyof EventHandlers] as (event: ThreeEvent<PointerEvent>) => void
      if (handler) {
        // Forward all events back to their respective handlers with the exception of click events,
        // which must use the initial target
        if (
          (name !== 'onClick' && name !== 'onContextMenu' && name !== 'onDoubleClick') ||
          internal.initialHits.includes(eventObject)
        ) {
          handler(data as ThreeEvent<PointerEvent>)
          pointerMissed(
            event,
            internal.interaction.filter((object) => object !== eventObject),
          )
        }
      }
    })
    // If a click yields no results, pass it back to the user as a miss
    if (name === 'onPointerDown') {
      internal.initialClick = [event.offsetX, event.offsetY]
      internal.initialHits = hits.map((hit: any) => hit.eventObject)
    }

    if ((name === 'onClick' || name === 'onContextMenu' || name === 'onDoubleClick') && !hits.length) {
      if (calculateDistance(event) <= 2) {
        pointerMissed(event, internal.interaction)
        if (onPointerMissed) onPointerMissed()
      }
    }
  }

  const mapNames = {
    onClick: 'click',
    onContextMenu: 'contextmenu',
    onDoubleClick: 'dblclick',
    onWheel: 'wheel',
    onPointerDown: 'pointerdown',
    onPointerUp: 'pointerup',
    onPointerLeave: 'pointerleave',
    onPointerMove: 'pointermove',
    onLostPointerCapture: 'lostpointercapture',
  }

  return {
    connected: false,
    handlers: {
      onClick: handlePointer('onClick') as EventListener,
      onContextMenu: handlePointer('onContextMenu') as EventListener,
      onDoubleClick: handlePointer('onDoubleClick') as EventListener,
      onWheel: handlePointer('onWheel') as EventListener,
      onPointerDown: handlePointer('onPointerDown') as EventListener,
      onPointerUp: handlePointer('onPointerUp') as EventListener,
      onPointerLeave: ((e: any) => handlePointerCancel(e, [])) as EventListener,
      onPointerMove: (handlePointerMove as unknown) as EventListener,
      onLostPointerCapture: ((e: any) => (
        (store.getState().internal.captured = undefined), handlePointerCancel(e)
      )) as EventListener,
    },
    connect: <TElement extends HTMLElement>(target: TElement) => {
      const { set, events } = store.getState()
      events.disconnect?.()
      set((state) => ({ events: { ...state.events, connected: target } }))
      Object.entries(events?.handlers ?? []).forEach(([name, event]) =>
        target.addEventListener(mapNames[name as keyof typeof mapNames], event, { passive: true }),
      )
    },
    disconnect: () => {
      const { set, events } = store.getState()
      if (events.connected) {
        Object.entries(events.handlers ?? []).forEach(([name, event]) => {
          if (events && events.connected instanceof HTMLElement) {
            events.connected.removeEventListener(mapNames[name as keyof typeof mapNames], event)
          }
        })
        set((state) => ({ events: { ...state.events, connected: null } }))
      }
    },
  }
}
