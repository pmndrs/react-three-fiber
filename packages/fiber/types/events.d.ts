import type * as THREE from 'three'

//* Event-related Types =====================================

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

// Re-export EventManager from events module for type usage
export type { EventManager, DomEvent, PointerCaptureTarget, ThreeEvent } from '../src/core/events'
