import { WebGLRenderer, WebGPURenderer, Scene, Raycaster, Vector2, Vector3, Inspector } from '#three'
import * as React from 'react'
import { createWithEqualityFn } from 'zustand/traditional'

//* Type Imports ==============================
import type {
  Dpr,
  Size,
  Frameloop,
  Viewport,
  RenderCallback,
  XRManager,
  RootState,
  RootStore,
  DomEvent,
  EventManager,
  ThreeEvent,
  ThreeCamera,
} from '#types'

import { calculateDpr, isOrthographicCamera, updateCamera } from './utils'
import { notifyDepreciated } from './notices'

export const context = /* @__PURE__ */ React.createContext<RootStore>(null!)

export const createStore = (
  invalidate: (state?: RootState, frames?: number) => void,
  advance: (timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: XRFrame) => void,
): RootStore => {
  const rootStore = createWithEqualityFn<RootState>((set, get) => {
    const position = new Vector3()
    const defaultTarget = new Vector3()
    const tempTarget = new Vector3()
    function getCurrentViewport(
      camera: ThreeCamera = get().camera,
      target: Vector3 | Parameters<Vector3['set']> = defaultTarget,
      size: Size = get().size,
    ): Omit<Viewport, 'dpr' | 'initialDpr'> {
      const { width, height, top, left } = size
      const aspect = width / height
      if ((target as Vector3).isVector3) tempTarget.copy(target as Vector3)
      else tempTarget.set(...(target as Parameters<Vector3['set']>))
      const distance = camera.getWorldPosition(position).distanceTo(tempTarget)
      if (isOrthographicCamera(camera)) {
        return { width: width / camera.zoom, height: height / camera.zoom, top, left, factor: 1, distance, aspect }
      } else {
        const fov = (camera.fov * Math.PI) / 180 // convert vertical fov to radians
        const h = 2 * Math.tan(fov / 2) * distance // visible height
        const w = h * (width / height)
        return { width: w, height: h, top, left, factor: width / w, distance, aspect }
      }
    }

    let performanceTimeout: ReturnType<typeof setTimeout> | undefined = undefined
    const setPerformanceCurrent = (current: number) =>
      set((state) => ({ performance: { ...state.performance, current } }))

    const pointer = new Vector2()

    const rootState: RootState = {
      set,
      get,

      // Mock objects that have to be configured
      gl: null as unknown as WebGLRenderer,
      renderer: null as unknown as WebGPURenderer,
      camera: null as unknown as ThreeCamera,
      raycaster: null as unknown as Raycaster,
      events: { priority: 1, enabled: true, connected: false },
      scene: null as unknown as Scene,
      rootScene: null as unknown as Scene,
      xr: null as unknown as XRManager,
      inspector: null as unknown as Inspector,

      invalidate: (frames = 1) => invalidate(get(), frames),
      advance: (timestamp: number, runGlobalEffects?: boolean) => advance(timestamp, runGlobalEffects, get()),

      legacy: false,
      linear: false,
      flat: false,
      isLegacy: false,
      webGPUSupported: false,
      isNative: false,

      controls: null,
      pointer,
      mouse: pointer,

      frameloop: 'always',
      onPointerMissed: undefined,

      performance: {
        current: 1,
        min: 0.5,
        max: 1,
        debounce: 200,
        regress: () => {
          const state = get()
          // Clear timeout
          if (performanceTimeout) clearTimeout(performanceTimeout)
          // Set lower bound performance
          if (state.performance.current !== state.performance.min) setPerformanceCurrent(state.performance.min)
          // Go back to upper bound performance after a while unless something regresses meanwhile
          performanceTimeout = setTimeout(
            () => setPerformanceCurrent(get().performance.max),
            state.performance.debounce,
          )
        },
      },

      size: { width: 0, height: 0, top: 0, left: 0 },
      viewport: {
        initialDpr: 0,
        dpr: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        aspect: 0,
        distance: 0,
        factor: 0,
        getCurrentViewport,
      },

      setEvents: (events: Partial<EventManager<any>>) =>
        set((state) => ({ ...state, events: { ...state.events, ...events } })),
      setSize: (width: number, height: number, top: number = 0, left: number = 0) => {
        const camera = get().camera
        const size = { width, height, top, left }
        set((state) => ({ size, viewport: { ...state.viewport, ...getCurrentViewport(camera, defaultTarget, size) } }))
      },
      setDpr: (dpr: Dpr) =>
        set((state) => {
          const resolved = calculateDpr(dpr)
          return { viewport: { ...state.viewport, dpr: resolved, initialDpr: state.viewport.initialDpr || resolved } }
        }),
      setFrameloop: (frameloop: Frameloop = 'always') => {
        set(() => ({ frameloop }))
      },
      setError: (error: Error | null) => set(() => ({ error })),
      error: null as Error | null,

      //* TSL State (managed via hooks: useUniforms, useNodes, useTextures, usePostProcessing) ==============================
      uniforms: {},
      nodes: {},
      textures: new Map(),
      postProcessing: null,
      passes: {},

      previousRoot: undefined,
      internal: {
        // Events
        interaction: [],
        hovered: new Map<string, ThreeEvent<DomEvent>>(),
        subscribers: [],
        initialClick: [0, 0],
        initialHits: [],
        capturedMap: new Map(),
        lastEvent: React.createRef(),

        // Updates
        active: false,
        frames: 0,
        priority: 0,
        subscribe: (ref: React.RefObject<RenderCallback>, priority: number, store: RootStore) => {
          const internal = get().internal
          // If this subscription was given a priority, it takes rendering into its own hands
          // For that reason we switch off automatic rendering and increase the manual flag
          // As long as this flag is positive there can be no internal rendering at all
          // because there could be multiple render subscriptions
          internal.priority = internal.priority + (priority > 0 ? 1 : 0)
          internal.subscribers.push({ ref, priority, store })
          // Register subscriber and sort layers from lowest to highest, meaning,
          // highest priority renders last (on top of the other frames)
          internal.subscribers = internal.subscribers.sort((a, b) => a.priority - b.priority)
          return () => {
            const internal = get().internal
            if (internal?.subscribers) {
              // Decrease manual flag if this subscription had a priority
              internal.priority = internal.priority - (priority > 0 ? 1 : 0)
              // Remove subscriber from list
              internal.subscribers = internal.subscribers.filter((s) => s.ref !== ref)
            }
          }
        },

        // Renderer Storage (single source of truth)
        actualRenderer: null as unknown as WebGLRenderer | WebGPURenderer,

        // Scheduler for useFrameNext (initialized in renderer.tsx)
        scheduler: null,
      },
    }

    return rootState
  })

  const state = rootStore.getState()

  //* Setup Renderer Accessors ==============================
  // Both state.gl and state.renderer map to internal.actualRenderer
  // state.gl shows deprecation warning in WebGPU mode for backwards compatibility

  // state.gl - backwards compatibility with deprecation warning
  Object.defineProperty(state, 'gl', {
    get() {
      const currentState = rootStore.getState()

      // Warn if accessing gl in WebGPU mode (not legacy)
      if (!currentState.isLegacy && currentState.internal.actualRenderer) {
        // Capture stack trace to show where gl was accessed
        const stack = new Error().stack || ''

        // Skip warning if access is from internal operations (zustand setState, Object.assign, etc.)
        const isInternalAccess =
          stack.includes('zustand') ||
          stack.includes('setState') ||
          stack.includes('Object.assign') ||
          stack.includes('react-three-fiber/packages/fiber/src/core')

        if (!isInternalAccess) {
          const cleanedStack = stack.split('\n').slice(2).join('\n') || 'Stack trace unavailable'

          notifyDepreciated({
            heading: 'Accessing state.gl in WebGPU mode',
            body:
              'Please use state.renderer instead. state.gl is deprecated and will be removed in future versions.\n\n' +
              'For backwards compatibility, state.gl currently maps to state.renderer, but this may cause issues with libraries expecting WebGLRenderer.\n\n' +
              'Accessed from:\n' +
              cleanedStack,
          })
        }
      }

      return currentState.internal.actualRenderer as WebGLRenderer
    },
    set(value: WebGLRenderer) {
      rootStore.getState().internal.actualRenderer = value
    },
    enumerable: true,
    configurable: true,
  })

  // state.renderer - modern accessor (no warning)
  Object.defineProperty(state, 'renderer', {
    get() {
      return rootStore.getState().internal.actualRenderer
    },
    set(value: WebGPURenderer | WebGLRenderer) {
      rootStore.getState().internal.actualRenderer = value
    },
    enumerable: true,
    configurable: true,
  })

  //* Scene Sync Subscription ==============================
  // If someone sets scene to an actual THREE.Scene (not a portal container),
  // automatically sync rootScene to match
  let oldScene = state.scene
  rootStore.subscribe(() => {
    const currentState = rootStore.getState()
    const { scene, rootScene, set } = currentState

    // Only sync if scene changed and it's an actual Scene (has isScene property)
    if (scene !== oldScene) {
      oldScene = scene
      // If the new scene is a real THREE.Scene and different from rootScene, update rootScene
      if ((scene as any)?.isScene && scene !== rootScene) {
        set({ rootScene: scene })
      }
    }
  })

  let oldSize = state.size
  let oldDpr = state.viewport.dpr
  let oldCamera = state.camera
  rootStore.subscribe(() => {
    const { camera, size, viewport, set, internal } = rootStore.getState()

    const actualRenderer = internal.actualRenderer
    // Resize camera and renderer on changes to size and pixelratio
    if (size.width !== oldSize.width || size.height !== oldSize.height || viewport.dpr !== oldDpr) {
      oldSize = size
      oldDpr = viewport.dpr
      // Update camera & renderer
      updateCamera(camera, size)
      if (viewport.dpr > 0) actualRenderer.setPixelRatio(viewport.dpr)

      const updateStyle =
        typeof HTMLCanvasElement !== 'undefined' && actualRenderer.domElement instanceof HTMLCanvasElement
      actualRenderer.setSize(size.width, size.height, updateStyle)
    }

    // Update viewport once the camera changes
    if (camera !== oldCamera) {
      oldCamera = camera
      // Update viewport
      set((state) => ({ viewport: { ...state.viewport, ...state.viewport.getCurrentViewport(camera) } }))
    }
  })

  // Invalidate on any change
  rootStore.subscribe((state) => invalidate(state))

  // Return root state
  return rootStore
}
