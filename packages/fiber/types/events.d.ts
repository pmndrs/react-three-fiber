import type * as THREE from 'three'
import type { Properties } from './utils'
import type { RootState } from './store'

//* Event-related Types =====================================

export interface Intersection extends THREE.Intersection {
  /** The event source (the object which registered the handler) */
  eventObject: THREE.Object3D
}

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

export interface IntersectionEvent<TSourceEvent> extends Intersection {
  /** The event source (the object which registered the handler) */
  eventObject: THREE.Object3D
  /** An array of intersections */
  intersections: Intersection[]
  /** vec3.set(pointer.x, pointer.y, 0).unproject(camera) */
  unprojectedPoint: THREE.Vector3
  /** Normalized event coordinates */
  pointer: THREE.Vector2
  /** Delta between first click and this event */
  delta: number
  /** The ray that pierced it */
  ray: THREE.Ray
  /** The camera that was used by the raycaster */
  camera: Camera
  /** stopPropagation will stop underlying handlers from firing */
  stopPropagation: () => void
  /** The original host event */
  nativeEvent: TSourceEvent
  /** If the event was stopped by calling stopPropagation */
  stopped: boolean
}

export type ThreeEvent<TEvent> = IntersectionEvent<TEvent> & Properties<TEvent>
export type DomEvent = PointerEvent | MouseEvent | WheelEvent

/** DOM event handlers registered on the canvas element */
export interface Events {
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
  onDragEnter: EventListener
  onDragLeave: EventListener
  onDragOver: EventListener
  onDrop: EventListener
}

/** Event handlers that can be attached to R3F objects (meshes, groups, etc.) */
export interface EventHandlers {
  onClick?: (event: ThreeEvent<MouseEvent>) => void
  onContextMenu?: (event: ThreeEvent<MouseEvent>) => void
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void
  /** Fires continuously while dragging over the object */
  onDragOver?: (event: ThreeEvent<DragEvent>) => void
  /** Fires once when drag enters the object */
  onDragOverEnter?: (event: ThreeEvent<DragEvent>) => void
  /** Fires once when drag leaves the object */
  onDragOverLeave?: (event: ThreeEvent<DragEvent>) => void
  /** Fires when drag misses this object (for objects that have drag handlers) */
  onDragOverMissed?: (event: DragEvent) => void
  /** Fires when a drop occurs on this object */
  onDrop?: (event: ThreeEvent<DragEvent>) => void
  /** Fires when a drop misses this object (for objects that have drop handlers) */
  onDropMissed?: (event: DragEvent) => void
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
  onLostPointerCapture?: (event: ThreeEvent<PointerEvent>) => void

  //* Visibility Events --------------------------------
  /** Fires when object enters/exits camera frustum. Receives true when in view, false when out. */
  onFramed?: (inView: boolean) => void
  /** Fires when object occlusion state changes (WebGPU only, requires occlusionTest=true on object) */
  onOccluded?: (occluded: boolean) => void
  /** Fires when combined visibility changes (frustum + occlusion + visible prop) */
  onVisible?: (visible: boolean) => void
}

export type FilterFunction = (items: THREE.Intersection[], state: RootState) => THREE.Intersection[]
export type ComputeFunction = (event: DomEvent, root: RootState, previous?: RootState) => void

export interface EventManager<TTarget> {
  /** Determines if the event layer is active */
  enabled: boolean
  /** Event layer priority, higher prioritized layers come first and may stop(-propagate) lower layer  */
  priority: number
  /** The compute function needs to set up the raycaster and an xy- pointer  */
  compute?: ComputeFunction
  /** The filter can re-order or re-structure the intersections  */
  filter?: FilterFunction
  /** The target node the event layer is tied to */
  connected?: TTarget
  /** All the pointer event handlers through which the host forwards native events */
  handlers?: Events
  /** Allows re-connecting to another target */
  connect?: (target: TTarget) => void
  /** Removes all existing events handlers from the target */
  disconnect?: () => void
  /** Triggers a onPointerMove with the last known event. This can be useful to enable raycasting without
   *  explicit user interaction, for instance when the camera moves a hoverable object underneath the cursor.
   */
  update?: () => void
}

export interface PointerCaptureTarget {
  intersection: Intersection
  target: Element
}

//* Visibility System Types =====================================

/** Entry in the visibility registry for tracking object visibility state */
export interface VisibilityEntry {
  object: THREE.Object3D
  handlers: Pick<EventHandlers, 'onFramed' | 'onOccluded' | 'onVisible'>
  lastFramedState: boolean | null
  lastOccludedState: boolean | null
  lastVisibleState: boolean | null
}
