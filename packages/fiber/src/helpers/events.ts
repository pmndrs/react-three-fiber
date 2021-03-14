import { UseStore } from 'zustand'

import { RootState } from '../core/store'

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

interface IntesectionEvent<TSourceEvent> extends Intersection {
  intersections: Intersection[]
  stopped: boolean
  unprojectedPoint: THREE.Vector3
  ray: THREE.Ray
  camera: Camera
  stopPropagation: () => void
  sourceEvent: TSourceEvent
  delta: number
}

export type ThreeEvent<TEvent> = TEvent & IntesectionEvent<TEvent>

export type DomEvent = ThreeEvent<PointerEvent | MouseEvent | WheelEvent>

export const makeId = (event: Intersection): string => (event.eventObject || event.object).uuid + '/' + event.index

export const createCalculateDistance = (store: UseStore<RootState>): typeof calculateDistance => {
  const calculateDistance = (event: DomEvent) => {
    const { internal } = store.getState()
    const dx = event.offsetX - internal.initialClick[0]
    const dy = event.offsetY - internal.initialClick[1]
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }

  return calculateDistance
}

/** Sets up defaultRaycaster */
export const createPrepareRay = (store: UseStore<RootState>): typeof prepareRay => {
  const prepareRay = (event: DomEvent) => {
    const state = store.getState()
    const { raycaster, mouse, camera, size } = state

    // https://github.com/pmndrs/react-three-fiber/pull/782
    // Events trigger outside of canvas when moved
    const offsets = raycaster.computeOffsets?.(event, state) || event
    if (offsets) {
      const { offsetX, offsetY } = offsets
      const { width, height } = size
      mouse.set((offsetX / width) * 2 - 1, -(offsetY / height) * 2 + 1)
      raycaster.setFromCamera(mouse, camera)
    }
  }

  return prepareRay
}

export const createIntersect = (store: UseStore<RootState>): typeof intersect => {
  const intersect = (filter?: (objects: THREE.Object3D[]) => THREE.Object3D[]): Intersection[] => {
    const state = store.getState()
    const { raycaster, internal } = state
    // Skip event handling when noEvents is set
    if (!raycaster.enabled) return []

    const seen = new Set<string>()
    const hits: Intersection[] = []

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
        const handlers = (eventObject as any).__r3f.handlers
        if (handlers) hits.push({ ...intersect, eventObject })
        eventObject = eventObject.parent
      }
    }
    return hits
  }

  return intersect
}
