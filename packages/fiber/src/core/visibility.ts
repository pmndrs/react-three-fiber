//* Visibility System ==============================
// Manages visibility events: onFramed, onOccluded, onVisible
// Includes WebGPU occlusion query support via Node-based observer
// Author: DennisSmolek

import * as THREE from '#three'
import { updateFrustum } from './utils'

//* Type Imports ==============================
import type { RootStore, RootState, VisibilityEntry, EventHandlers } from '#types'

//* Module-level State ==============================
// Shared frustum for all visibility checks - avoids allocation per portal/root
const tempFrustum = new THREE.Frustum()

// Track if we've already warned about WebGL occlusion (once per session)
let hasWarnedWebGL = false

// Cached TSL imports (loaded dynamically for WebGPU only)
let tslModule: { uniform: any; nodeObject: any } | null = null

/** Reset WebGL warning flag (for testing only) */
export function __resetWarningFlag() {
  hasWarnedWebGL = false
}

/** Load TSL module dynamically (WebGPU only) */
async function loadTSL(): Promise<{ uniform: any; nodeObject: any } | null> {
  if (tslModule) return tslModule
  try {
    const tsl = await import('three/tsl')
    tslModule = { uniform: tsl.uniform, nodeObject: tsl.nodeObject }
    return tslModule
  } catch {
    // TSL not available (WebGL build)
    return null
  }
}

//* OcclusionObserverNode ==============================
// TSL Node that runs during render pass to cache isOccluded() results
// This is necessary because renderer.isOccluded() only works during render
// when _currentRenderContext is available.

// Factory function to create the OcclusionObserverNode class
// (needs to be created after TSL is loaded)
function createOcclusionObserverNode(store: RootStore, uniform: any): THREE.Node {
  const node = new THREE.Node('float')
  node.updateType = THREE.NodeUpdateType.OBJECT

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

// Track if occlusion setup is in progress (to avoid duplicate async calls)
let occlusionSetupPromise: Promise<void> | null = null

/**
 * Enable the occlusion query system for this Canvas.
 * Creates an invisible observer mesh that caches isOccluded() results during render.
 *
 * @param store - The root store
 */
export function enableOcclusion(store: RootStore): void {
  const state = store.getState()
  const { internal, renderer, rootScene } = state

  // Already enabled or in progress
  if (internal.occlusionEnabled || occlusionSetupPromise) return

  // Check for WebGPU support
  const hasOcclusionSupport = typeof (renderer as any)?.isOccluded === 'function'

  if (!hasOcclusionSupport) {
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

  // Start async setup
  occlusionSetupPromise = setupOcclusion(store)
}

/** Internal async setup for occlusion system */
async function setupOcclusion(store: RootStore): Promise<void> {
  const state = store.getState()
  const { internal, rootScene, set } = state

  // Load TSL module
  const tsl = await loadTSL()
  if (!tsl) {
    console.warn('[R3F] Warning: TSL module not available. Occlusion queries disabled.')
    occlusionSetupPromise = null
    return
  }

  const { uniform, nodeObject } = tsl

  // Create internal helper group if it doesn't exist
  let helperGroup = internal.helperGroup
  if (!helperGroup) {
    helperGroup = new THREE.Group()
    helperGroup.name = '__r3fInternal'
    // @ts-ignore - mark as internal so users know not to mess with it
    helperGroup.__r3fInternal = true
    rootScene.add(helperGroup)
  }

  // Create the observer mesh with NodeMaterial
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    opacity: 0,
  })

  // Create and attach the observer node
  const observerNode = nodeObject(createOcclusionObserverNode(store, uniform))
  ;(material as any).colorNode = observerNode
  material.needsUpdate = true

  const mesh = new THREE.Mesh(geometry, material)
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

  occlusionSetupPromise = null
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
    ;(internal.occlusionObserver.material as THREE.Material).dispose()
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
export function unregisterVisibility(store: RootStore, object: THREE.Object3D): void {
  const { internal } = store.getState()
  internal.visibilityRegistry.delete(object.uuid)
  internal.occlusionCache.delete(object)
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

    // Enable occlusion if newly added
    if ((handlers.onOccluded || handlers.onVisible) && !internal.occlusionEnabled) {
      ;(object as any).occlusionTest = true
      enableOcclusion(store)
    }
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
  const { internal, camera } = state
  const registry = internal.visibilityRegistry

  // Early exit if no objects registered
  if (registry.size === 0) return

  // Update temp frustum from current camera
  updateFrustum(camera, tempFrustum)

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
