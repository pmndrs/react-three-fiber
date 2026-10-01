import type * as THREE from 'three'
import type { WebGLRenderer } from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import { getThree } from './three'
import { configureSize } from './store'
import { advance, invalidate } from './loop'
import { applyProps, calculateDpr, is, prepare } from './utils'
import { isDevelopment, notifyDepreciated } from './utils/notices'
import { enableOcclusion } from './visibility'
import type { RootStore, RenderProps, ThreeCamera, EquConfig, ShadowsConfig } from '#types'

import {
  isRenderer,
  settingsBag,
  isInstanceOrFactory,
  assertNoRemovedConfig,
  NON_APPLIED_RENDERER_PROPS,
} from './renderer'
import { computeInitialSize } from './utils/three'

const shallowLoose = { objects: 'shallow', strict: false } as EquConfig

/**
 * Calls `onChange` whenever window.devicePixelRatio changes: moving to another display or zooming.
 * Neither resizes the canvas, so resize observers won't see it. A resolution query only matches the
 * current ratio, so it is re-created after every change.
 *
 * @param onChange - Called after each change
 * @returns Function that stops watching
 */
function watchDpr(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function' || !window.devicePixelRatio) {
    return () => {}
  }

  // Partial matchMedia polyfills (test setups, older environments) may return no listener methods,
  // or throw on a query they can't parse. Following the ratio is best-effort: it runs inside
  // configure, which must not fail because of it
  let watching = true
  let query: Partial<MediaQueryList> | undefined
  const listen = () => {
    try {
      query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      if (typeof query?.addEventListener === 'function') query.addEventListener('change', handleChange)
      else query?.addListener?.(handleChange)
    } catch {
      query = undefined
    }
  }
  const unlisten = () => {
    if (typeof query?.removeEventListener === 'function') query.removeEventListener('change', handleChange)
    else query?.removeListener?.(handleChange)
    query = undefined
  }
  const handleChange = () => {
    if (!watching) return
    unlisten()
    listen()
    onChange()
  }

  listen()
  return () => {
    watching = false
    unlisten()
  }
}

/** Applies changed inputs to an initialized store; root.tsx owns readiness and lifecycle. */
export function createRootConfiguration<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  store: RootStore,
  canvas: TCanvas,
): (props: RenderProps<TCanvas>) => void {
  let previous: (RenderProps<TCanvas> & { shadows?: ShadowsConfig }) | undefined
  let lastCamera: RenderProps<TCanvas>['camera']

  // Track last configured props for diffing - prevents imperative setter values
  // from being overwritten when Canvas re-configures (e.g., on resize)
  const lastConfiguredProps: Partial<{
    dpr: RenderProps<TCanvas>['dpr']
    textureColorSpace: THREE.ColorSpace
  }> = {}

  // The pixel ratio last resolved from the dpr prop, and whether a display change waits on XR
  let resolvedDpr = 0
  let dprChangedInXR = false
  let unwatchDpr: (() => void) | undefined

  // A display change doesn't resize the canvas or change the prop, so re-resolve the prop here. A
  // setDpr() since the last resolve owns the value, the same as across re-configures
  const resolveDpr = () => {
    const state = store.getState()
    // three doesn't resize during XR and restores its own pixel ratio once the session ends. It holds
    // the session before it sets isPresenting
    const xr = state.internal.actualRenderer?.xr as { isPresenting?: boolean; getSession?: () => unknown } | undefined
    if (xr?.isPresenting || xr?.getSession?.()) {
      dprChangedInXR = true
      return
    }
    dprChangedInXR = false
    const dpr = lastConfiguredProps.dpr
    if (dpr === undefined || state.viewport.dpr !== resolvedDpr || calculateDpr(dpr) === resolvedDpr) return
    state.setDpr(dpr)
    resolvedDpr = store.getState().viewport.dpr
  }

  let warnedSharedSettings = false
  let configured = false
  return (props) => {
    const {
      gl: glConfig,
      renderer: rendererConfig,
      size: propsSize,
      scene: sceneOptions,
      events,
      orthographic = false,
      frameloop = 'always',
      dpr = [1, 2],
      performance,
      raycaster: raycastOptions,
      camera: cameraOptions,
      onPointerMissed,
      onDragOverMissed,
      onDropMissed,
      autoUpdateFrustum = true,
      occlusion = false,
      _sizeProps,
      forceEven,
    } = props

    //* Removed Props ==============================
    assertNoRemovedConfig(props)

    //* Renderer Settings ==============================
    // R3F's own settings live in the gl/renderer props bag next to the renderer's parameters. They
    // are not renderer properties: textureColorSpace is this root's loader state, and shadows go
    // to renderer.shadowMap below.
    const rendererBag = settingsBag(rendererConfig)
    const settings = settingsBag(glConfig) ?? rendererBag
    // The sRGB default is applied below, once three's constants are loaded.
    const requestedTextureColorSpace: THREE.ColorSpace | undefined = settings?.textureColorSpace || undefined
    // Shadows configure a renderer R3F builds (a props bag, `true`, or no prop). A renderer instance
    // or factory result keeps the shadowMap its creator gave it.
    const shadows: ShadowsConfig | undefined = isInstanceOrFactory(glConfig ?? rendererConfig)
      ? undefined
      : (settings?.shadows ?? false)

    const next = { ...props, shadows, frameloop, autoUpdateFrustum, occlusion }
    const last = previous
    const changed = (key: keyof typeof next) => !last || !is.equ(next[key], last[key], { objects: 'shallow' })
    previous = undefined
    const state = store.getState()
    const renderer = state.internal.actualRenderer as WebGPURenderer | WebGLRenderer
    // The renderer support is loaded: three's shared core is available from here on
    const three = getThree()

    // A secondary that borrows the primary's renderer: renderer-wide settings and XR wiring
    // belong to the owner alone (#3981). A WebGL2-fallback secondary (#3965) owns its
    // renderer and is deliberately not `isSecondary`, so it keeps full control.
    const borrowsRenderer = state.internal.isSecondary === true

    // So a sharing canvas ignores its renderer settings (shadows, tone mapping, constructor
    // parameters, ...). textureColorSpace stays: it is this root's texture-loading state, not the
    // renderer's.
    if (
      borrowsRenderer &&
      !warnedSharedSettings &&
      rendererBag &&
      Object.keys(rendererBag).some((key) => key !== 'textureColorSpace') &&
      isDevelopment()
    ) {
      warnedSharedSettings = true
      console.warn(
        'R3F: renderer settings on a sharing canvas are ignored; set them on the <Canvas primary>. ' +
          "This canvas borrows the primary's renderer, so renderer-wide settings come from the primary. " +
          'Pass share={false} to give this canvas its own renderer.',
      )
    }

    //* Default Raycaster Initialization ==============================
    // Set up raycaster (one time only!)
    let raycaster = state.raycaster
    if (!raycaster) state.set({ raycaster: (raycaster = new three.Raycaster()) })

    // Set raycaster options only when their input changes
    if (changed('raycaster')) {
      const { params, ...options } = raycastOptions || {}
      if (!is.equ(options, raycaster, shallowLoose)) applyProps(raycaster, { ...options } as any)
      if (!is.equ(params, raycaster.params, shallowLoose)) {
        applyProps(raycaster, { params: { ...raycaster.params, ...params } } as any)
      }
    }

    //* Default Camera Initialization ==============================
    // for temp purposes and to pass to later conditionals BEFORE the set value store a local ref
    let tempCamera: THREE.Camera | null = state.camera

    // Create default camera, don't overwrite any user-set state
    if (!state.camera || (state.camera === lastCamera && changed('camera'))) {
      lastCamera = cameraOptions
      const isCamera = (cameraOptions as unknown as ThreeCamera | undefined)?.isCamera
      const camera = isCamera
        ? (cameraOptions as ThreeCamera)
        : orthographic
          ? new three.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
          : new three.PerspectiveCamera(50, 0, 0.1, 1000)
      if (!isCamera) {
        camera.position.z = 5
        if (cameraOptions) {
          applyProps(camera, cameraOptions as any)
          // Preserve user-defined frustum if possible
          // https://github.com/pmndrs/react-three-fiber/issues/3160
          if (!(camera as any).manual) {
            const projectionProps = ['aspect', 'left', 'right', 'bottom', 'top']
            if (projectionProps.some((prop) => prop in cameraOptions)) {
              ;(camera as any).manual = true
              camera.updateProjectionMatrix()
            }
          }
        }
        // Always look at center by default
        if (!state.camera && !cameraOptions?.rotation) camera.lookAt(0, 0, 0)
      }
      state.set({ camera })

      // set local camera
      tempCamera = camera

      // Configure raycaster
      // https://github.com/pmndrs/react-xr/issues/300
      raycaster.camera = camera
    }

    // Set up scene (one time only!)
    if (!state.scene) {
      let scene: THREE.Scene

      if ((sceneOptions as unknown as THREE.Scene | undefined)?.isScene) {
        scene = sceneOptions as THREE.Scene
        prepare(scene, store, '', {})
      } else {
        scene = new three.Scene()
        prepare(scene, store, '', {})
        if (sceneOptions) applyProps(scene as any, sceneOptions as any)
      }

      // Set both scene and rootScene - rootScene always points to the actual THREE.Scene
      // even when scene is overridden in portals
      // Also set internal.container for consistent child attachment in reconciler
      state.set((prev) => ({
        scene,
        rootScene: scene,
        internal: { ...prev.internal, container: scene },
      }))

      // Add camera to scene if it exists and has no parent
      // This ensures camera children (HUDs, etc.) render properly
      // https://github.com/pmndrs/react-three-fiber/issues/3632
      const camera = tempCamera
      if (camera && !camera.parent) scene.add(camera)
    }

    // Store events internally
    if (events && !state.events.handlers) {
      state.set({ events: events(store) })

      // Subscribe to enabled changes to auto-trigger raycaster update
      let wasEnabled = true
      store.subscribe((state) => {
        const { enabled } = state.events
        // When re-enabled, trigger raycaster to detect hover state
        if (enabled && !wasEnabled) {
          state.events.update?.()
        }
        wasEnabled = enabled
      })
    }
    // Store size props for reset functionality
    if (_sizeProps !== undefined && changed('_sizeProps')) {
      state.set({ _sizeProps })
    }
    // Store forceEven in internal state for Drei access
    if (forceEven !== undefined && state.internal.forceEven !== forceEven) {
      state.set((prev) => ({ internal: { ...prev.internal, forceEven } }))
    }
    // Configuration resolves the requested dimensions; the store decides whether they may apply.
    configureSize(store, computeInitialSize(canvas, propsSize))
    // Check pixelratio - only update if the PROP changed (not if state differs from prop)
    // This preserves imperative setDpr() changes across Canvas re-configures
    if (dpr !== undefined && (!last || !is.equ(dpr, lastConfiguredProps.dpr, shallowLoose))) {
      state.setDpr(dpr)
      lastConfiguredProps.dpr = dpr
      resolvedDpr = store.getState().viewport.dpr
    }
    // Read internal fresh: configure may have replaced it above
    const internal = store.getState().internal
    // One watcher per root, bound to the handle configuring it. Only a range follows the display: a
    // fixed dpr never touches matchMedia
    if (Array.isArray(dpr) && (!unwatchDpr || internal.unwatchDpr !== unwatchDpr)) {
      internal.unwatchDpr?.()
      internal.unwatchDpr = unwatchDpr = watchDpr(resolveDpr)
    }
    resolveDpr()
    // Check frameloop - only update if the PROP changed
    // This preserves imperative setFrameloop() changes across Canvas re-configures
    if (frameloop !== undefined && changed('frameloop')) {
      state.setFrameloop(frameloop)
    }
    // Check pointer missed
    if (changed('onPointerMissed')) state.set({ onPointerMissed })
    // Check dragover missed
    if (changed('onDragOverMissed')) state.set({ onDragOverMissed })
    // Check drop missed
    if (changed('onDropMissed')) state.set({ onDropMissed })
    // Set autoUpdateFrustum flag
    if (changed('autoUpdateFrustum') && state.autoUpdateFrustum !== autoUpdateFrustum) {
      state.set({ autoUpdateFrustum })
    }
    // Enable occlusion if requested via prop (auto-enables on handler registration too)
    if (occlusion && !state.internal.occlusionEnabled) {
      enableOcclusion(store)
    }
    // Check performance - only update if the PROP changed
    // This preserves any runtime performance changes across Canvas re-configures
    if (performance && changed('performance')) {
      state.set((state) => ({ performance: { ...state.performance, ...performance } }))
    }

    // Set up XR (one time only!)
    if (!state.xr) {
      // Handle frame behavior in WebXR
      const handleXRFrame: XRFrameRequestCallback = (timestamp: number, _frame?: XRFrame) => {
        const state = store.getState()
        if (state.frameloop === 'never') return
        advance(timestamp, true, state)
      }

      const actualRenderer = state.internal.actualRenderer

      // Toggle render switching on session
      const handleSessionChange = () => {
        const state = store.getState()
        const renderer = state.internal.actualRenderer
        actualRenderer.xr.enabled = actualRenderer.xr.isPresenting

        // Cast to any - both renderer XR managers have setAnimationLoop but with slightly different types
        ;(renderer.xr as any).setAnimationLoop(renderer.xr.isPresenting ? handleXRFrame : null)
        if (!renderer.xr.isPresenting) {
          if (dprChangedInXR) resolveDpr()
          invalidate(state)
        }
      }

      // WebXR session manager
      // Cast xr to any - both renderer XR managers have these methods but with slightly different event type signatures
      const xr = {
        connect() {
          const { gl, renderer } = store.getState()
          const xrManager = (renderer || gl).xr as any
          xrManager.addEventListener('sessionstart', handleSessionChange)
          xrManager.addEventListener('sessionend', handleSessionChange)
        },
        disconnect() {
          const { gl, renderer } = store.getState()
          const xrManager = (renderer || gl).xr as any
          xrManager.removeEventListener('sessionstart', handleSessionChange)
          xrManager.removeEventListener('sessionend', handleSessionChange)
        },
      }

      // Subscribe to WebXR session events
      if (!borrowsRenderer && typeof renderer.xr?.addEventListener === 'function') xr.connect()
      state.set({ xr })
    }

    //* Shadow Map ==============================
    // Only update if the shadows PROP changed (not just if state differs)
    if (!borrowsRenderer && shadows !== undefined && renderer.shadowMap && changed('shadows')) {
      const oldEnabled = renderer.shadowMap.enabled
      const oldType = renderer.shadowMap.type
      renderer.shadowMap.enabled = !!shadows

      if (is.boo(shadows)) {
        renderer.shadowMap.type = three.PCFShadowMap
      } else if (is.str(shadows)) {
        if (shadows === 'soft') {
          notifyDepreciated({
            heading: 'shadows="soft" is deprecated',
            body: 'Three has depreciated soft and improved basic PCFShadows, we converted for you.',
            link: 'https://github.com/mrdoob/three.js/wiki/Migration-Guide?utm_source=chatgpt.com#181--182',
          })
        }
        const types = {
          basic: three.BasicShadowMap,
          percentage: three.PCFShadowMap,
          soft: three.PCFShadowMap,
          variance: three.VSMShadowMap,
        }
        renderer.shadowMap.type = types[shadows as keyof typeof types] ?? three.PCFShadowMap
      } else if (is.obj(shadows)) {
        Object.assign(renderer.shadowMap as any, shadows)
      }

      if (oldEnabled !== renderer.shadowMap.enabled || oldType !== renderer.shadowMap.type) {
        ;(renderer.shadowMap as any).needsUpdate = true
      }
    }

    //* Color Management ==============================
    // Set sensible defaults on first configure only - gl/renderer props can override via applyProps
    if (!configured && !borrowsRenderer) {
      renderer.outputColorSpace = three.SRGBColorSpace
      renderer.toneMapping = three.ACESFilmicToneMapping
    }

    // Update textureColorSpace state (color space for 8-bit input textures)
    // Only update if the PROP changed
    const textureColorSpace: THREE.ColorSpace = requestedTextureColorSpace ?? three.SRGBColorSpace
    if (textureColorSpace !== lastConfiguredProps.textureColorSpace) {
      if (state.textureColorSpace !== textureColorSpace) state.set(() => ({ textureColorSpace }))
      lastConfiguredProps.textureColorSpace = textureColorSpace
    }

    // Set gl props - filter out non-applicable props
    if (glConfig && !is.fun(glConfig) && !isRenderer(glConfig) && changed('gl')) {
      const glProps: Record<string, any> = {}
      for (const key in glConfig as Record<string, any>) {
        if (!NON_APPLIED_RENDERER_PROPS.has(key)) glProps[key] = (glConfig as any)[key]
      }
      applyProps(renderer, glProps as any)
    }

    // Set renderer props (WebGPU) - filter out non-applicable props
    if (
      rendererConfig &&
      !is.fun(rendererConfig) &&
      !isRenderer(rendererConfig) &&
      state.renderer &&
      !borrowsRenderer
    ) {
      const currentRenderer = state.renderer
      if (changed('renderer')) {
        const rendererProps: Record<string, any> = {}
        for (const key in rendererConfig as Record<string, any>) {
          if (!NON_APPLIED_RENDERER_PROPS.has(key)) rendererProps[key] = (rendererConfig as any)[key]
        }
        applyProps(currentRenderer, rendererProps as any)
      }
    }

    configured = true
    previous = next
  }
}
