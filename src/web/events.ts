import * as React from 'react'
import * as THREE from 'three'
import { UseStore } from 'zustand'
import { RootState } from '../core/store'

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

type ThreeEvent<T> = T &
  Intersection & {
    intersections: Intersection[]
    stopped: boolean
    unprojectedPoint: THREE.Vector3
    ray: THREE.Ray
    camera: Camera
    stopPropagation: () => void
    sourceEvent: T
    delta: number
  }

export type PointerEvent = ThreeEvent<React.PointerEvent>
export type MouseEvent = ThreeEvent<React.MouseEvent>
export type WheelEvent = ThreeEvent<React.WheelEvent>

type DomEvent = PointerEvent | MouseEvent | WheelEvent

function createEvents(store: UseStore<RootState>) {
  const { raycaster, mouse, internal } = store.getState()

  const hovered = new Map<string, DomEvent>()
  const temp = new THREE.Vector3()

  /** Sets up defaultRaycaster */
  function prepareRay(event: DomEvent) {
    // https://github.com/pmndrs/react-three-fiber/pull/782
    // Events trigger outside of canvas when moved
    const offsets = raycaster?.computeOffsets?.(event, sharedState.current) || event.nativeEvent
    if (offsets) {
      const { offsetX, offsetY } = offsets
      const { width, height } = state.current.size
      mouse.set((offsetX / width) * 2 - 1, -(offsetY / height) * 2 + 1)
      defaultRaycaster.setFromCamera(mouse, state.current.camera)
    }
  }

  /** Intersects interaction objects using the event input */
  function intersect(filter?: (objects: THREE.Object3D[]) => THREE.Object3D[]) {
    // Skip event handling when noEvents is set
    if (state.current.noEvents) return []

    const seen = new Set<string>()
    const hits: Intersection[] = []

    // Allow callers to eliminate event objects
    const eventsObjects = filter
      ? filter((state.current.scene as any).__interaction)
      : (state.current.scene as any).__interaction

    // Intersect known handler objects and filter against duplicates
    let intersects = defaultRaycaster.intersectObjects(eventsObjects, true).filter((item) => {
      const id = makeId(item as DomEvent)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })

    // https://github.com/mrdoob/three.js/issues/16031
    // Allow custom userland intersect sort order
    if (raycaster && raycaster.filter && sharedState.current) {
      intersects = raycaster.filter(intersects, sharedState.current)
    }

    for (const intersect of intersects) {
      let eventObject: THREE.Object3D | null = intersect.object
      // Bubble event up
      while (eventObject) {
        const handlers = (eventObject as any).__handlers
        if (handlers) hits.push({ ...intersect, eventObject })
        eventObject = eventObject.parent
      }
    }
    return hits
  }

  /**  Calculates click deltas */
  function calculateDistance(event: DomEvent) {
    const dx = event.nativeEvent.offsetX - state.current.initialClick[0]
    const dy = event.nativeEvent.offsetY - state.current.initialClick[1]
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }

  function handlePointerCancel(event: DomEvent, hits?: Intersection[], prepare = true) {
    state.current.pointer.emit('pointerCancel', event)
    if (prepare) prepareRay(event)

    Array.from(hovered.values()).forEach((hoveredObj) => {
      // When no objects were hit or the the hovered object wasn't found underneath the cursor
      // we call onPointerOut and delete the object from the hovered-elements map
      if (
        hits &&
        (!hits.length || !hits.find((hit) => hit.object === hoveredObj.object && hit.index === hoveredObj.index))
      ) {
        const eventObject = hoveredObj.eventObject
        const handlers = (eventObject as any).__handlers
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
    // Get fresh intersects
    const intersections: Intersection[] = intersect(filter)
    // If the interaction is captured take that into account, the captured event has to be part of the intersects
    if (state.current.captured && event.type !== 'click' && event.type !== 'wheel') {
      state.current.captured.forEach((captured) => {
        if (!intersections.find((hit) => hit.eventObject === captured.eventObject)) intersections.push(captured)
      })
    }
    return intersections
  }

  /**  Handles intersections by forwarding them to handlers */
  function handleIntersects(intersections: Intersection[], event: DomEvent, fn: (event: DomEvent) => void) {
    // If anything has been found, forward it to the event listeners
    if (intersections.length) {
      const unprojectedPoint = temp.set(mouse.x, mouse.y, 0).unproject(state.current.camera)
      const delta = event.type === 'click' ? calculateDistance(event) : 0
      const releasePointerCapture = (id: any) => (event.target as any).releasePointerCapture(id)
      const localState = { stopped: false, captured: false }

      for (const hit of intersections) {
        const setPointerCapture = (id: any) => {
          // If the hit is going to be captured flag that we're in captured state
          if (!localState.captured) {
            localState.captured = true
            // The captured hit array is reset to collect hits
            state.current.captured = []
          }
          // Push hits to the array
          if (state.current.captured) {
            state.current.captured.push(hit)
          }
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
          ray: defaultRaycaster.ray,
          camera: state.current.camera,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => {
            // https://github.com/react-spring/react-three-fiber/issues/596
            // Events are not allowed to stop propagation if the pointer has been captured
            const cap = state.current.captured
            if (!cap || cap.find((h) => h.eventObject.id === hit.eventObject.id)) {
              raycastEvent.stopped = localState.stopped = true

              // Propagation is stopped, remove all other hover records
              // An event handler is only allowed to flush other handlers if it is hovered itself
              if (hovered.size && Array.from(hovered.values()).find((i) => i.eventObject === hit.eventObject)) {
                // Objects cannot flush out higher up objects that have already caught the event
                const higher = intersections.slice(0, intersections.indexOf(hit))
                handlePointerCancel(raycastEvent, [...higher, hit])
              }
            }
          },
          target: { ...event.target, setPointerCapture, releasePointerCapture },
          currentTarget: { ...event.currentTarget, setPointerCapture, releasePointerCapture },
          sourceEvent: event,
        }

        fn(raycastEvent)

        // Event bubbling may be interrupted by stopPropagation
        if (localState.stopped === true) break
      }
    }
    return intersections
  }

  function handlePointerMove(event: DomEvent, prepare = true) {
    state.current.pointer.emit('pointerMove', event)
    if (prepare) prepareRay(event)
    const hits = getIntersects(
      event,
      // This is onPointerMove, we're only interested in events that exhibit this particular event
      (objects: any) =>
        objects.filter((obj: any) =>
          ['Move', 'Over', 'Enter', 'Out', 'Leave'].some((name) => (obj as any).__handlers['pointer' + name])
        )
    )

    // Take care of unhover
    handlePointerCancel(event, hits)
    handleIntersects(hits, event, (data: DomEvent) => {
      const eventObject = data.eventObject
      const handlers = (eventObject as any).__handlers
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

  const handlePointer = (name: string) => (event: DomEvent, prepare = true) => {
    state.current.pointer.emit(name, event)
    if (prepare) prepareRay(event)
    const hits = getIntersects(event)
    handleIntersects(hits, event, (data: DomEvent) => {
      const eventObject = data.eventObject
      const handlers = (eventObject as any).__handlers
      if (handlers && handlers[name]) {
        // Forward all events back to their respective handlers with the exception of click events,
        // which must use the initial target
        if (
          (name !== 'click' && name !== 'contextMenu' && name !== 'doubleClick') ||
          state.current.initialHits.includes(eventObject)
        ) {
          handlers[name](data)
          pointerMissed(
            event,
            (defaultScene as any).__interaction as THREE.Object3D[],
            (object) => object !== eventObject
          )
        }
      }
    })
    // If a click yields no results, pass it back to the user as a miss
    if (name === 'pointerDown') {
      state.current.initialClick = [event.nativeEvent.offsetX, event.nativeEvent.offsetY]
      state.current.initialHits = hits.map((hit: any) => hit.eventObject)
    }

    if ((name === 'click' || name === 'contextMenu' || name === 'doubleClick') && !hits.length) {
      if (calculateDistance(event) <= 2) {
        pointerMissed(event, (defaultScene as any).__interaction as THREE.Object3D[])
        if (onPointerMissed) onPointerMissed()
      }
    }
  }
}

export { createEvents }
