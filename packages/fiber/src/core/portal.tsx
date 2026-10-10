import type * as THREE from 'three'
import type { Object3D } from 'three'
import { useCallback, useMemo, useRef, useState, type JSX, type ReactNode, type RefObject } from 'react'
import { createWithEqualityFn } from 'zustand/traditional'
import { useStore } from './hooks'
import { context } from './store'
import { reconciler } from './reconciler'
import { getThree } from './three'
import { updateCamera, useIsomorphicLayoutEffect, useMutableCallback } from './utils'
import { cloneState, isAccessor, keepAccessors } from './utils/stateAccessors'
import type { RootState, EventManager, InjectState } from '#types'

export function createPortal(
  children: ReactNode,
  container: THREE.Object3D | RefObject<THREE.Object3D | null> | RefObject<THREE.Object3D>,
  state?: InjectState,
): JSX.Element {
  return <Portal children={children} container={container} state={state} />
}

interface PortalInnerProps {
  children: ReactNode
  state?: InjectState
  container: Object3D
}

interface PortalProps {
  children: ReactNode
  state?: InjectState
  container: Object3D | RefObject<Object3D | null> | RefObject<Object3D>
}

//* Portal Wrapper - Handles Ref Resolution ==============================
export function Portal({ children, container, state }: PortalProps): JSX.Element {
  const isRef = useCallback((obj: any): obj is RefObject<Object3D> => obj && 'current' in obj, [])
  const [resolvedContainer, _setResolvedContainer] = useState<Object3D | null>(() => {
    if (isRef(container)) return container.current ?? null
    return container as Object3D
  })
  const setResolvedContainer = useCallback(
    (newContainer: Object3D | null) => {
      if (!newContainer || newContainer === resolvedContainer) return
      _setResolvedContainer(isRef(newContainer) ? newContainer.current : newContainer)
    },
    [resolvedContainer, _setResolvedContainer, isRef],
  )

  // Watch for ref changes if container is a RefObject
  useMemo(() => {
    if (isRef(container) && !container.current) {
      // If ref is currently null, set up a check to resolve it
      // Use microtask to check if ref gets populated after render
      return queueMicrotask(() => {
        setResolvedContainer(container.current)
      })
    }
    setResolvedContainer(container as Object3D)
  }, [container, isRef, setResolvedContainer])

  // Don't render portal until we have a valid container
  if (!resolvedContainer) return <></>

  // Render the actual portal with resolved container
  // Use container.uuid as key to force remount when container changes
  // Fallback to container reference if uuid doesn't exist (defensive)
  const portalKey = resolvedContainer.uuid ?? `portal-${resolvedContainer.id ?? 'unknown'}`
  return <PortalInner key={portalKey} children={children} container={resolvedContainer} state={state} />
}

//* Portal - Actual Portal Implementation ==============================
function PortalInner({ state = {}, children, container }: PortalInnerProps): JSX.Element {
  /** This has to be a component because it would not be able to call useThree/useStore otherwise since
   *  if this is our environment, then we are not in r3f's renderer but in react-dom, it would trigger
   *  the "R3F hooks can only be used within the Canvas component!" warning:
   *  <Canvas>
   *    {createPortal(...)} */
  const { events, size, injectScene = true, ...rest } = state
  const previousRoot = useStore()
  const [raycaster] = useState(() => new (getThree().Raycaster)())
  const [pointer] = useState(() => new (getThree().Vector2)())

  //* Portal Scene Injection ==============================
  // https://github.com/pmndrs/react-three-fiber/issues/2725
  // Ensure scene is always a real THREE.Scene so properties like background, environment, fog work
  // If container is already a Scene, use it directly
  // Otherwise inject a Scene as CHILD of container (children attach to injected scene)
  // Set injectScene: false to skip injection (anti-pattern, for edge cases)
  const [portalScene] = useState(() => {
    // If container is already a Scene, use it directly
    if ('isScene' in container && (container as THREE.Scene).isScene) return container as THREE.Scene
    // If injection disabled, use container directly (anti-pattern)
    if (!injectScene) return container as THREE.Scene
    // Inject a Scene as child of container
    return new (getThree().Scene)()
  })

  // Attachment follows effect connectivity: Activity hides and reconnects this layer.
  // The reconciler owns child disposal on removal; a layout cleanup must not free them.
  useIsomorphicLayoutEffect(() => {
    if (portalScene === container || !injectScene) return
    container.add(portalScene)
    return () => {
      container.remove(portalScene)
    }
  }, [portalScene, container, injectScene])

  // The parent state at the last sync, to tell which parent fields have changed since.
  const lastRootState = useRef<RootState | null>(null)

  const inject = useMutableCallback((rootState: RootState, injectState: RootState) => {
    // The portal's state holds a copy of every parent field, so `...injectState` alone would freeze
    // inherited fields at mount (a later uniform, controls, renderer...). A parent change comes
    // through only for a field the portal still inherits: not one set through its `state` prop, and
    // not one it set itself (its value no longer matches what it last got from the parent) -- e.g.
    // a camera or controls made default inside the portal (drei's Hud, RenderTexture, View).
    const followed: Partial<RootState> = {}
    const lastRoot = lastRootState.current
    if (lastRoot) {
      for (const key in rootState) {
        // `gl` / `renderer` are accessors over `internal`, which is merged below; reading them here
        // would log `gl`'s deprecation notice
        if (isAccessor(rootState, key)) continue
        const field = key as keyof RootState
        const changed = rootState[field] !== lastRoot[field]
        const inherited = !(key in rest) && injectState[field] === lastRoot[field]
        if (changed && inherited) (followed as any)[field] = rootState[field]
      }
    }
    lastRootState.current = rootState

    // Resolve size: parent → portal's accumulated state → explicit prop override
    // This ensures portal size persists through parent resize events
    const resolvedSize = { ...rootState.size, ...injectState.size, ...size }

    let viewport = undefined
    const portalCamera = followed.camera ?? injectState.camera
    if (portalCamera && (size || injectState.size)) {
      const camera = portalCamera
      // Calculate the override viewport, if present
      viewport = rootState.viewport.getCurrentViewport(camera, new (getThree().Vector3)(), resolvedSize)
      // Update the portal camera, if it differs from the previous layer
      if (camera !== rootState.camera) updateCamera(camera, resolvedSize)
    }

    // Capture only the stable Zustand setter, not the whole injectState. Referencing
    // injectState.set inside the setEvents closure below would anchor the entire previous
    // portal state in memory, chaining every replaced state through setEvents → unbounded leak (#3751).
    const set = injectState.set

    // The intersect consists of the previous root state. Copied with its accessors, not spread: a
    // spread would read `state.gl` and log its deprecation notice for every portal on a WebGPU root
    return Object.assign(cloneState<RootState>(rootState, injectState, followed), {
      // Portals have their own scene - always a real THREE.Scene (injected if needed)
      scene: portalScene,
      // rootScene always points to the actual THREE.Scene, even inside portals
      rootScene: rootState.rootScene,
      raycaster,
      pointer,
      mouse: pointer,
      // Their previous root is the layer before it
      previousRoot,
      // Events, size and viewport can be overridden by the inject layer
      events: { ...rootState.events, ...injectState.events, ...events },
      size: resolvedSize,
      viewport: { ...rootState.viewport, ...viewport },
      // Layers are allowed to override events
      setEvents: (events: Partial<EventManager<any>>) => set((state) => ({ events: { ...state.events, ...events } })),
      // Container for child attachment - the portalScene (injected or container itself). A portal
      // renders with its parent's renderer, which `renderer` / `gl` read from `actualRenderer`
      internal: {
        ...rootState.internal,
        ...injectState.internal,
        actualRenderer: rootState.internal.actualRenderer,
        container: portalScene,
      },
    } as Partial<RootState>) as RootState
  })

  const usePortalStore = useMemo(() => {
    // Create a mirrored store, based on the previous root with a few overrides ...
    const store = createWithEqualityFn<RootState>(keepAccessors((set, get) => ({ ...rest, set, get }) as RootState))

    // Initialize with current state synchronously (required for reconciler.createPortal)
    const onMutate = (prev: RootState) => store.setState((state) => inject.current(prev, state))
    onMutate(previousRoot.getState())

    return store
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previousRoot, container])

  // Subscribe to previous root-state and copy changes over to the mirrored portal-state
  // This must be in useEffect to properly clean up on unmount (fixes memory leak)
  // Note: inject is a stable ref from useMutableCallback, so not needed in deps
  useIsomorphicLayoutEffect(() => {
    const onMutate = (prev: RootState) => usePortalStore.setState((state) => inject.current(prev, state))
    const unsubscribe = previousRoot.subscribe(onMutate)
    return unsubscribe
  }, [previousRoot, usePortalStore])

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
