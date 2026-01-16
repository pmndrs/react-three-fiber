//* Visibility System ==============================
// Manages visibility events: onFramed, onOccluded, onVisible
// Author: DennisSmolek

import * as THREE from '#three'
import { updateFrustum } from './utils'

//* Type Imports ==============================
import type { RootStore, RootState, VisibilityEntry, EventHandlers } from '#types'

//* Module-level Temp Frustum ==============================
// Shared frustum for all visibility checks - avoids allocation per portal/root
const tempFrustum = new THREE.Frustum()

//* Registration Functions ==============================

/**
 * Register an object for visibility tracking.
 * Called when an object has onFramed, onOccluded, or onVisible handlers.
 *
 * @param store - The root store for this object
 * @param object - The THREE.Object3D to track
 * @param handlers - The visibility event handlers
 */
export function registerVisibility(
  store: RootStore,
  object: THREE.Object3D,
  handlers: Pick<EventHandlers, 'onFramed' | 'onOccluded' | 'onVisible'>,
): void {
  const { internal } = store.getState()
  const registry = internal.visibilityRegistry

  // Create entry with null initial states (will fire on first check)
  const entry: VisibilityEntry = {
    object,
    handlers,
    lastFramedState: null,
    lastOccludedState: null,
    lastVisibleState: null,
  }

  registry.set(object.uuid, entry)

  // NOTE: We don't set occlusionTest here because the object might not be
  // attached to the scene yet. We'll set it on the first visibility check
  // when we can verify the object is in the scene graph.
}

/**
 * Unregister an object from visibility tracking.
 * Called when object is removed or handlers are cleared.
 *
 * @param store - The root store for this object
 * @param object - The THREE.Object3D to stop tracking
 */
export function unregisterVisibility(store: RootStore, object: THREE.Object3D): void {
  const { internal } = store.getState()
  internal.visibilityRegistry.delete(object.uuid)
}

/**
 * Update visibility handlers for an already registered object.
 * Used when handlers change but object stays mounted.
 *
 * @param store - The root store for this object
 * @param object - The THREE.Object3D to update
 * @param handlers - The new visibility event handlers
 */
export function updateVisibilityHandlers(
  store: RootStore,
  object: THREE.Object3D,
  handlers: Pick<EventHandlers, 'onFramed' | 'onOccluded' | 'onVisible'>,
): void {
  const { internal } = store.getState()
  const entry = internal.visibilityRegistry.get(object.uuid)

  if (entry) {
    entry.handlers = handlers
    // NOTE: occlusionTest flag will be set during visibility check
    // when the object is confirmed to be in the scene
  }
}

//* Check Function ==============================

/**
 * Check visibility state for all registered objects.
 * Called each frame in the preRender phase.
 *
 * @param state - The current root state
 */
export function checkVisibility(state: RootState): void {
  const { internal, camera, renderer } = state
  const registry = internal.visibilityRegistry

  // Early exit if no objects registered
  if (registry.size === 0) return

  // Update temp frustum from current camera
  updateFrustum(camera, tempFrustum)

  // Check if we have WebGPU occlusion support
  const hasOcclusionSupport = typeof (renderer as any)?.isOccluded === 'function'

  // Iterate registered objects
  for (const entry of registry.values()) {
    const { object, handlers, lastFramedState, lastOccludedState, lastVisibleState } = entry

    // Compute frustum state once per object (shared between onFramed and onVisible)
    let inFrustum: boolean | null = null
    const computeFrustum = () => {
      if (inFrustum === null) {
        // Ensure object has updated bounding sphere for accurate check
        if ((object as THREE.Mesh).geometry?.boundingSphere === null) {
          ;(object as THREE.Mesh).geometry?.computeBoundingSphere()
        }
        inFrustum = tempFrustum.intersectsObject(object)
      }
      return inFrustum
    }

    //* Frustum Check (onFramed) --------------------------------
    if (handlers.onFramed) {
      const currentInFrustum = computeFrustum()

      // Fire only on state change
      if (currentInFrustum !== lastFramedState) {
        entry.lastFramedState = currentInFrustum
        handlers.onFramed(currentInFrustum)
      }
    }

    //* Occlusion Check (onOccluded) - WebGPU only --------------------------------
    // NOTE: WebGPU occlusion queries are only valid during the render pass.
    // For reliable occlusion detection, use the Node-based approach with
    // THREE.NodeUpdateType.OBJECT and check frame.renderer.isOccluded() in update().
    // The event-based onOccluded fires when isOccluded() returns true/false,
    // but may not work reliably outside the render pass context.
    let currentOcclusion: boolean | null = null
    if (handlers.onOccluded) {
      // Ensure occlusionTest flag is set on the object (do this at check time
      // because at registration time the object might not be in the scene yet)
      if (!(object as any).occlusionTest && object.parent !== null) {
        ;(object as any).occlusionTest = true
      }

      if (hasOcclusionSupport) {
        currentOcclusion = (renderer as any).isOccluded(object)

        // Fire only on state change (and only for definite true/false, not null)
        if (currentOcclusion !== null && currentOcclusion !== lastOccludedState) {
          entry.lastOccludedState = currentOcclusion
          handlers.onOccluded(currentOcclusion)
        }
      }
    }

    //* Combined Visibility Check (onVisible) --------------------------------
    if (handlers.onVisible) {
      // Always compute fresh frustum state for visibility check
      const currentInFrustum = computeFrustum()

      // Keep lastFramedState in sync even if onFramed isn't registered
      if (!handlers.onFramed && currentInFrustum !== lastFramedState) {
        entry.lastFramedState = currentInFrustum
      }

      // Use computed occlusion or check now if not done
      let isOccluded = currentOcclusion
      if (isOccluded === null && hasOcclusionSupport) {
        isOccluded = (renderer as any).isOccluded(object)
      }
      // Default to not occluded if no occlusion support
      if (isOccluded === null) isOccluded = false

      // Combined visibility: in frustum AND not occluded AND visible property is true
      const isVisible = currentInFrustum && !isOccluded && object.visible

      // Fire only on state change
      if (isVisible !== lastVisibleState) {
        entry.lastVisibleState = isVisible
        handlers.onVisible(isVisible)
      }
    }
  }
}

//* Utility Functions ==============================

/**
 * Check if an object has any visibility handlers registered.
 *
 * @param handlers - The event handlers to check
 * @returns true if any visibility handler is present
 */
export function hasVisibilityHandlers(
  handlers: Partial<EventHandlers> | undefined,
): handlers is Pick<EventHandlers, 'onFramed' | 'onOccluded' | 'onVisible'> {
  if (!handlers) return false
  return !!(handlers.onFramed || handlers.onOccluded || handlers.onVisible)
}
