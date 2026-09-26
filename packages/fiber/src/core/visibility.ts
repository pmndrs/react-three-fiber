//* Visibility System ==============================
// Manages visibility events: onFramed, onOccluded, onVisible
// Includes WebGPU occlusion query support via Node-based observer
// Author: DennisSmolek

import type { Frustum, Material, Mesh, Object3D } from 'three'
import type { Node } from 'three/webgpu'
import { updateFrustum } from './utils'
import { getThree } from './three'

//* Type Imports ==============================
import type { RootStore, RootState, VisibilityEntry, EventHandlers, OcclusionSupport } from '#types'

//* Module-level State ==============================
// Shared frustum for all visibility checks - avoids allocation per portal/root. Created on first
// check, from the root's own frustum: core has no three at module scope.
let tempFrustum: Frustum | undefined

// Track if we've already warned about WebGL occlusion (once per session)
let hasWarnedWebGL = false

/** Reset WebGL warning flag (for testing only) */
export function __resetWarningFlag() {
  hasWarnedWebGL = false
}

//* OcclusionObserverNode ==============================
// TSL Node that runs during render pass to cache isOccluded() results
// This is necessary because renderer.isOccluded() only works during render
// when _currentRenderContext is available.
//
// The node classes and TSL functions come from the WebGPU renderer support the root loaded
// (state.internal.support.occlusion): core imports neither three/webgpu nor three/tsl.

function createOcclusionObserverNode(store: RootStore, { Node, NodeUpdateType, uniform }: OcclusionSupport): Node {
  const node = new Node('float')
  node.updateType = NodeUpdateType.OBJECT

  // Override update method
  ;(node as any).update = function (frame: any) {
    const { internal } = store.getState()
    const registry = internal.visibilityRegistry
    const cache = internal.occlusionCache

    // During render, check ALL registered objects that need occlusion
    for (const entry of registry.values()) {
      const { object, handlers } = entry

      // Only check objects with occlusion-related handlers
      if (handlers.onOccluded || handlers.onVisible) {
        const isOccluded = frame.renderer.isOccluded(object)
        cache.set(object, isOccluded)
      }
    }
  }

  // Override setup method
  ;(node as any).setup = function () {
    return uniform(0)
  }

  return node
}

//* Occlusion Enable/Disable ==============================

/**
 * Enable the occlusion query system for this Canvas.
 * Creates an invisible observer mesh that caches isOccluded() results during render.
 *
 * @param store - The root store
 */
export function enableOcclusion(store: RootStore): void {
  const state = store.getState()
  const { internal, renderer } = state

  // Already enabled
  if (internal.occlusionEnabled) return

  // Check for WebGPU support
  const hasOcclusionSupport = typeof (renderer as any)?.isOccluded === 'function'

  if (!hasOcclusionSupport || internal.support?.kind !== 'webgpu') {
    // Warn once about WebGL limitation
    if (!hasWarnedWebGL) {
      console.warn(
        '[R3F] Warning: onOccluded/onVisible occlusion queries require WebGPU renderer. ' +
          'Occlusion events will not fire on WebGL.',
      )
      hasWarnedWebGL = true
    }
    return
  }

  setupOcclusion(store, internal.support.occlusion)
}

/** Internal setup for occlusion system */
function setupOcclusion(store: RootStore, occlusion: OcclusionSupport): void {
  const state = store.getState()
  const { internal, rootScene, set } = state
  const { Group, BoxGeometry, Mesh } = getThree()

  // Create internal helper group if it doesn't exist
  let helperGroup = internal.helperGroup
  if (!helperGroup) {
    helperGroup = new Group()
    helperGroup.name = '__r3fInternal'
    // @ts-ignore - mark as internal so users know not to mess with it
    helperGroup.__r3fInternal = true
    rootScene.add(helperGroup)
  }

  // Create the observer mesh with NodeMaterial
  const geometry = new BoxGeometry(1, 1, 1)
  const material = new occlusion.MeshBasicNodeMaterial({
    transparent: true,
    opacity: 0,
  })

  // Create and attach the observer node
  const observerNode = occlusion.nodeObject(createOcclusionObserverNode(store, occlusion))
  ;(material as any).colorNode = observerNode
  material.needsUpdate = true

  const mesh = new Mesh(geometry, material)
  mesh.name = '__r3fOcclusionObserver'
  mesh.scale.setScalar(0.0001) // Tiny
  mesh.frustumCulled = false // Always render so Node.update() runs
  // @ts-ignore
  mesh.__r3fInternal = true

  helperGroup.add(mesh)

  // Update internal state via Zustand's set() for proper reactivity
  set((state) => ({
    internal: {
      ...state.internal,
      helperGroup,
      occlusionObserver: mesh,
      occlusionEnabled: true,
    },
  }))
}

/**
 * Disable the occlusion query system and clean up resources.
 *
 * @param store - The root store
 */
export function disableOcclusion(store: RootStore): void {
  const { internal, set } = store.getState()

  if (!internal.occlusionEnabled) return

  // Remove observer mesh
  if (internal.occlusionObserver) {
    internal.occlusionObserver.removeFromParent()
    internal.occlusionObserver.geometry.dispose()
    ;(internal.occlusionObserver.material as Material).dispose()
  }

  // Clear cache
  internal.occlusionCache.clear()

  // Update internal state via Zustand's set() for proper reactivity
  set((state) => ({
    internal: {
      ...state.internal,
      occlusionObserver: null,
      occlusionEnabled: false,
    },
  }))
}

/**
 * Clean up the internal helper group (called on unmount).
 *
 * @param store - The root store
 */
export function cleanupHelperGroup(store: RootStore): void {
  const { internal, set } = store.getState()

  disableOcclusion(store)

  if (internal.helperGroup) {
    internal.helperGroup.removeFromParent()
    set((state) => ({
      internal: {
        ...state.internal,
        helperGroup: null,
      },
    }))
  }
}

//* Registration Functions ==============================

/**
 * Register an object for visibility tracking.
 * Called when an object has onFramed, onOccluded, or onVisible handlers.
 * Auto-enables occlusion if onOccluded or onVisible is used.
 *
 * @param store - The root store for this object
 * @param object - The THREE.Object3D to track
 * @param handlers - The visibility event handlers
 */
export function registerVisibility(
  store: RootStore,
  object: Object3D,
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

  // Auto-enable occlusion if needed
  if (handlers.onOccluded || handlers.onVisible) {
    // Set occlusionTest flag on the object
    ;(object as any).occlusionTest = true

    // Enable occlusion system if not already
    if (!internal.occlusionEnabled) {
      enableOcclusion(store)
    }
  }
}

/**
 * Unregister an object from visibility tracking.
 * Called when object is removed or handlers are cleared.
 *
 * @param store - The root store for this object
 * @param object - The THREE.Object3D to stop tracking
 */
export function unregisterVisibility(store: RootStore, object: Object3D): void {
  const { internal } = store.getState()
  internal.visibilityRegistry.delete(object.uuid)
  internal.occlusionCache.delete(object)
}

/**
 * Update the handlers of an already-registered object, in place.
 *
 * This exists because it is NOT equivalent to calling `registerVisibility` again.
 * `registerVisibility` builds a fresh entry with `lastFramedState`, `lastOccludedState` and
 * `lastVisibleState` reset to `null`, and the checker treats `null` as "no previous state, fire
 * on the next check". Re-registering an already-tracked object would therefore re-fire
 * `onFramed`/`onOccluded`/`onVisible` even though nothing about the object's visibility changed,
 * breaking the "fires only on state change" contract.
 *
 * Updating in place swaps the handler closures while preserving that state.
 *
 * @param store    - The root store for this object
 * @param object   - The THREE.Object3D to update
 * @param handlers - The new visibility event handlers
 * @returns `true` if an entry existed and was updated, `false` if the object is not registered
 *          (in which case the caller should register it).
 */
export function updateVisibilityHandlers(
  store: RootStore,
  object: Object3D,
  handlers: Pick<EventHandlers, 'onFramed' | 'onOccluded' | 'onVisible'>,
): boolean {
  const { internal } = store.getState()
  const entry = internal.visibilityRegistry.get(object.uuid)
  if (!entry) return false

  entry.handlers = handlers

  // Occlusion may have been switched on by this update (e.g. onVisible added alongside onFramed)
  if ((handlers.onOccluded || handlers.onVisible) && !internal.occlusionEnabled) {
    ;(object as any).occlusionTest = true
    enableOcclusion(store)
  }

  return true
}

//* Check Function ==============================

/**
 * Check visibility state for all registered objects.
 * Called each frame before the render phase (via the frustum/visibility jobs'
 * { before: 'render' } scheduling).
 *
 * @param state - The current root state
 */
export function checkVisibility(state: RootState): void {
  const { internal, camera } = state
  const registry = internal.visibilityRegistry

  // Early exit if no objects registered
  if (registry.size === 0) return

  // Update temp frustum from current camera
  tempFrustum ??= state.frustum.clone()
  updateFrustum(camera, tempFrustum)

  // Iterate registered objects
  for (const entry of registry.values()) {
    const { object, handlers, lastFramedState, lastOccludedState, lastVisibleState } = entry

    // Compute frustum state once per object (shared between onFramed and onVisible)
    let inFrustum: boolean | null = null
    const computeFrustum = () => {
      if (inFrustum === null) {
        // Ensure object has updated bounding sphere for accurate check
        if ((object as Mesh).geometry?.boundingSphere === null) {
          ;(object as Mesh).geometry?.computeBoundingSphere()
        }
        inFrustum = tempFrustum!.intersectsObject(object)
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

    //* Occlusion Check (onOccluded) - WebGPU only, reads from cache --------------------------------
    // The cache is populated by OcclusionObserverNode during render pass
    let currentOcclusion: boolean | null = null
    if (handlers.onOccluded && internal.occlusionEnabled) {
      currentOcclusion = internal.occlusionCache.get(object) ?? null

      // Fire only on state change (and only for definite true/false, not null)
      if (currentOcclusion !== null && currentOcclusion !== lastOccludedState) {
        entry.lastOccludedState = currentOcclusion
        handlers.onOccluded(currentOcclusion)
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

      // Read occlusion from cache if available
      let isOccluded = currentOcclusion
      if (isOccluded === null && internal.occlusionEnabled) {
        isOccluded = internal.occlusionCache.get(object) ?? null
      }
      // Default to not occluded if no occlusion data available
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
