import * as React from 'react'
import * as THREE from 'three'
import { createWithEqualityFn } from 'zustand/traditional'
import type { ComputeFunction, EventManager } from './events'
import { useStore } from './hooks'
import { reconciler } from './reconciler'
import { context, type RootState, type RootStore } from './store'
import { updateCamera } from './utils'
import { useIsomorphicLayoutEffect, useMutableCallback } from './utils/react'

export type InjectState = Partial<
  Omit<RootState, 'events'> & {
    events?: {
      enabled?: boolean
      priority?: number
      compute?: ComputeFunction
      connected?: any
    }
  }
>

export function createPortal(
  children: React.ReactNode,
  container: THREE.Object3D,
  state?: InjectState,
): React.JSX.Element {
  return <Portal children={children} container={container} state={state} />
}

interface PortalProps {
  children: React.ReactNode
  state?: InjectState
  container: THREE.Object3D
}

interface PortalOptions {
  parentStore: RootStore
  container: THREE.Object3D
  raycaster: THREE.Raycaster
  pointer: THREE.Vector2
  events: InjectState['events']
  size: InjectState['size']
}

function initializePortal(options: PortalOptions, initialState: Partial<RootState>) {
  const { parentStore, container } = options
  const portalStore = createWithEqualityFn<RootState>(
    (set, get) =>
      ({
        ...initialState,
        set,
        get,
        // Create once with the store's setter, without retaining a state snapshot.
        setEvents: (events: Partial<EventManager<any>>) =>
          set((state) => ({ ...state, events: { ...state.events, ...events } })),
      } as RootState),
  )
  const parentStateRef = { current: parentStore.getState() }
  portalStore.setState((portalState) => inject(parentStateRef.current, portalState, options))

  return { parentStore, container, portalStore, parentStateRef }
}

function Portal({ state = {}, children, container }: PortalProps): React.JSX.Element {
  const parentStore = useStore()
  const { events, size, ...rest } = state
  const [raycaster] = React.useState(() => new THREE.Raycaster())
  const [pointer] = React.useState(() => new THREE.Vector2())
  const options = { parentStore, container, raycaster, pointer, events, size }
  const injectRef = useMutableCallback((parentState: RootState, portalState: RootState) =>
    inject(parentState, portalState, options),
  )

  // Initialize during render. Keep the store in state so Activity can preserve it.
  const [portal, setPortal] = React.useState(() => initializePortal(options, rest))
  if (portal.parentStore !== parentStore || portal.container !== container) {
    setPortal(initializePortal(options, rest))
  }

  const { portalStore, parentStateRef } = portal

  // Subscribe after commit and update the portal on each parent change.
  useIsomorphicLayoutEffect(() => {
    const update = (parentState: RootState) => {
      parentStateRef.current = parentState
      portalStore.setState((portalState) => injectRef.current(parentState, portalState))
    }
    const unsubscribe = parentStore.subscribe(update)

    // Catch up on changes made before subscribing or while Activity was hidden.
    const parentState = parentStore.getState()
    if (parentState !== parentStateRef.current) update(parentState)

    // Clean up when hidden, unmounted or switching stores.
    return unsubscribe
  }, [parentStore, portalStore, parentStateRef])

  return (
    <>
      {reconciler.createPortal(<context.Provider value={portalStore}>{children}</context.Provider>, portalStore, null)}
    </>
  )
}

function inject(parentState: RootState, portalState: RootState, options: PortalOptions): RootState {
  const { parentStore, container, raycaster, pointer, events, size } = options
  let viewport = undefined

  if (portalState.camera && size) {
    const camera = portalState.camera
    // Calculate the override viewport, if present
    viewport = parentState.viewport.getCurrentViewport(camera, new THREE.Vector3(), size)
    // Update the portal camera, if it differs from the previous layer
    if (camera !== parentState.camera) updateCamera(camera, size)
  }

  return {
    // Inherit parent values and preserve the portal's own state.
    ...parentState,
    ...portalState,
    // Portals have their own scene, raycaster and pointer.
    scene: container as THREE.Scene,
    raycaster,
    pointer,
    mouse: pointer,
    previousRoot: parentStore,
    // Apply the portal's event, size and viewport overrides.
    events: { ...parentState.events, ...portalState.events, ...events },
    size: { ...parentState.size, ...size },
    viewport: { ...parentState.viewport, ...viewport },
  }
}
