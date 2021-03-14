import * as THREE from 'three'
import { UseStore } from 'zustand'
import { Instance } from './renderer'
import { RootState } from './store'

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
  sourceEvent: TSourceEvent
  delta: number
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
  onWheel?: (event: ThreeEvent<WheelEvent>) => void
}

export interface EventManager<TTarget> {
  connected: TTarget | null
  handlers?: Events
  connect?: (target: TTarget) => void
  disconnect?: () => void
}

export function createEvents(store: UseStore<RootState>) {  
  const hovered = new Map<string, DomEvent>()

  function makeId(event: Intersection) {
    return (event.eventObject || event.object).uuid + '/' + event.index
  }

  /** Sets up defaultRaycaster */
  function prepareRay(event: DomEvent) {
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
        const handlers = (eventObject as unknown as Instance).__r3f.handlers
        if (handlers) intersections.push({ ...intersect, eventObject })
        eventObject = eventObject.parent
      }
    }
    return intersections
  }

  /**  Creates filtered intersects and returns an array of positive hits */
  function patchIntersects(intersections: Intersection[], event: DomEvent) {
    const { internal } = store.getState()
    // If the interaction is captured take that into account, the captured event has to be part of the intersects
    if (internal.captured && event.type !== 'click' && event.type !== 'wheel') {
      internal.captured.forEach((captured) => {
        if (!intersections.find((hit) => hit.eventObject === captured.eventObject)) intersections.push(captured)
      })
    }
    return intersections
  }

  return { hovered, makeId, prepareRay, intersect, patchIntersects }
}
