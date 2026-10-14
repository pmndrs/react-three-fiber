import * as React from 'react'
import * as THREE from 'three'
import { createWithEqualityFn } from 'zustand/traditional'
import type { ComputeFunction, EventManager } from './events'
import { useStore } from './hooks'
import { reconciler } from './reconciler'
import { context, type RootState } from './store'
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

function Portal({ state = {}, children, container }: PortalProps): React.JSX.Element {
  /** This has to be a component because it would not be able to call useThree/useStore otherwise since
   *  if this is our environment, then we are not in r3f's renderer but in react-dom, it would trigger
   *  the "R3F hooks can only be used within the Canvas component!" warning:
   *  <Canvas>
   *    {createPortal(...)} */
  const { events, size, ...rest } = state
  const previousRoot = useStore()
  const [raycaster] = React.useState(() => new THREE.Raycaster())
  const [pointer] = React.useState(() => new THREE.Vector2())

  const inject = useMutableCallback((rootState: RootState, injectState: RootState) => {
    let viewport = undefined
    if (injectState.camera && size) {
      const camera = injectState.camera
      // Calculate the override viewport, if present
      viewport = rootState.viewport.getCurrentViewport(camera, new THREE.Vector3(), size)
      // Update the portal camera, if it differs from the previous layer
      if (camera !== rootState.camera) updateCamera(camera, size)
    }

    // Capture only the stable Zustand setter, not the whole injectState. Referencing
    // injectState.set inside the setEvents closure below would anchor the entire previous
    // portal state in memory, chaining every replaced state through setEvents → unbounded leak (#3751).
    const set = injectState.set

    return {
      // The intersect consists of the previous root state
      ...rootState,
      ...injectState,
      // Portals have their own scene, which forms the root, a raycaster and a pointer
      scene: container as THREE.Scene,
      raycaster,
      pointer,
      mouse: pointer,
      // Their previous root is the layer before it
      previousRoot,
      // Events, size and viewport can be overridden by the inject layer
      events: { ...rootState.events, ...injectState.events, ...events },
      size: { ...rootState.size, ...size },
      viewport: { ...rootState.viewport, ...viewport },
      // Layers are allowed to override events
      setEvents: (events: Partial<EventManager<any>>) =>
        set((state) => ({ ...state, events: { ...state.events, ...events } })),
    } as RootState
  })

  const [usePortalStore, initialRootState] = React.useMemo(() => {
    // Create a mirrored store, based on the previous root with a few overrides ...
    const store = createWithEqualityFn<RootState>((set, get) => ({ ...rest, set, get } as RootState))

    // Initialize with current state synchronously (required for reconciler.createPortal)
    const rootState = previousRoot.getState()
    store.setState((state) => inject.current(rootState, state))

    return [store, rootState] as const
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousRoot, container])

  // Subscribe to previous root-state and copy changes over to the mirrored portal-state.
  // This lives in a layout effect so the unsubscribe runs on unmount; subscribing inside
  // useMemo leaked every portal into the parent's listener set (#3676).
  // Note: inject is a stable ref from useMutableCallback, so not needed in deps
  useIsomorphicLayoutEffect(() => {
    const onMutate = (prev: RootState) => usePortalStore.setState((state) => inject.current(prev, state))
    const unsubscribe = previousRoot.subscribe(onMutate)

    // Catch up on parent changes made between the useMemo snapshot and this subscription,
    // e.g. by layout effects of earlier siblings or of the portal's own children
    const rootState = previousRoot.getState()
    if (rootState !== initialRootState) onMutate(rootState)

    return unsubscribe
  }, [previousRoot, usePortalStore, initialRootState])

  return (
    // @ts-ignore, reconciler types are not maintained
    <>
      {reconciler.createPortal(
        <context.Provider value={usePortalStore}>{children}</context.Provider>,
        usePortalStore,
        null,
      )}
    </>
  )
}
