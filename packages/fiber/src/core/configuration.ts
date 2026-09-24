import * as THREE from 'three'
import type { ThreeElement } from '../three-types'
import type { EventManager } from './events'
import { advance, invalidate } from './loop'
import {
  type Dpr,
  type Frameloop,
  type Performance,
  type Renderer,
  type RootState,
  type RootStore,
  type Size,
  isRenderer,
} from './store'
import { applyProps, calculateDpr, type Camera, is, prepare, type Properties } from './utils'

// Shim for OffscreenCanvas since it was removed from DOM types
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/54988
interface OffscreenCanvas extends EventTarget {}

export type DefaultGLProps = Omit<THREE.WebGLRendererParameters, 'canvas'> & {
  canvas: HTMLCanvasElement | OffscreenCanvas
}

export type GLProps =
  | Renderer
  | ((defaultProps: DefaultGLProps) => Renderer)
  | ((defaultProps: DefaultGLProps) => Promise<Renderer>)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>

export type CameraProps = (
  | Camera
  | Partial<
      ThreeElement<typeof THREE.Camera> &
        ThreeElement<typeof THREE.PerspectiveCamera> &
        ThreeElement<typeof THREE.OrthographicCamera>
    >
) & {
  /** Flags the camera as manual, putting projection into your own hands */
  manual?: boolean
}

export interface RenderProps<TCanvas extends HTMLCanvasElement | OffscreenCanvas> {
  /** A threejs renderer instance or props that go into the default renderer */
  gl?: GLProps
  /** Dimensions to fit the renderer to. Will measure canvas dimensions if omitted */
  size?: Size
  /**
   * Enables shadows (by default PCFsoft). Can accept `gl.shadowMap` options for fine-tuning,
   * but also strings: 'basic' | 'percentage' | 'soft' | 'variance'.
   * @see https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
   */
  shadows?: boolean | 'basic' | 'percentage' | 'soft' | 'variance' | Partial<THREE.WebGLShadowMap>
  /**
   * Disables three r139 color management.
   * @see https://threejs.org/manual/#en/color-management
   */
  legacy?: boolean
  /** Switch off automatic sRGB encoding and gamma correction */
  linear?: boolean
  /** Use `THREE.NoToneMapping` instead of `THREE.ACESFilmicToneMapping` */
  flat?: boolean
  /** Creates an orthographic camera */
  orthographic?: boolean
  /**
   * R3F's render mode. Set to `demand` to only render on state change or `never` to take control.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#on-demand-rendering
   */
  frameloop?: Frameloop
  /**
   * R3F performance options for adaptive performance.
   * @see https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance#movement-regression
   */
  performance?: Partial<Omit<Performance, 'regress'>>
  /** Target pixel ratio. Can clamp between a range: `[min, max]` */
  dpr?: Dpr
  /** Props that go into the default raycaster */
  raycaster?: Partial<THREE.Raycaster>
  /** A `THREE.Scene` instance or props that go into the default scene */
  scene?: THREE.Scene | Partial<THREE.Scene>
  /** A `THREE.Camera` instance or props that go into the default camera */
  camera?: CameraProps
  /** An R3F event manager to manage elements' pointer events */
  events?: (store: RootStore) => EventManager<HTMLElement>
  /** Callback after the canvas has rendered (but not yet committed) */
  onCreated?: (state: RootState) => void
  /** Response for pointer clicks that have missed any target */
  onPointerMissed?: (event: MouseEvent) => void
}

type Canvas = DefaultGLProps['canvas']

export type Configuration = RenderProps<Canvas>

/** What a root has applied, so its next configuration applies only what changed */
export interface AppliedConfiguration {
  /** The last configuration applied in full */
  previous?: Configuration
  /** The camera prop that set the current camera */
  camera?: Configuration['camera']
}

const shallow = { objects: 'shallow' } as const

/** The renderer to configure, or a promise for one from an async factory */
export function createRenderer(canvas: Canvas, gl?: GLProps): Renderer | PromiseLike<Renderer> {
  const defaults: DefaultGLProps = { canvas, powerPreference: 'high-performance', antialias: true, alpha: true }
  if (typeof gl === 'function') return gl(defaults)
  if (isRenderer(gl)) return gl as Renderer
  return new THREE.WebGLRenderer({ ...defaults, ...(gl as object) })
}

function computeInitialSize(canvas: Canvas, size?: Size): Size {
  if (
    !size &&
    typeof HTMLCanvasElement !== 'undefined' &&
    canvas instanceof HTMLCanvasElement &&
    canvas.parentElement
  ) {
    const { width, height, top, left } = canvas.parentElement.getBoundingClientRect()
    return { width, height, top, left }
  } else if (!size && typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas) {
    return {
      width: canvas.width,
      height: canvas.height,
      top: 0,
      left: 0,
    }
  }

  return { width: 0, height: 0, top: 0, left: 0, ...size }
}

/**
 * Applies the inputs that changed since the last configuration applied in full, to a root whose
 * renderer is installed. A runtime change, such as setFrameloop or an edit to gl.shadowMap, lasts
 * until its input changes. The pixel ratio instead follows the device on every call. Objects and
 * arrays compare shallowly, so an equal inline value is unchanged.
 */
export function applyRootConfiguration(
  { store, configuration }: { store: RootStore; configuration: AppliedConfiguration },
  canvas: Canvas,
  props: Configuration,
) {
  const {
    gl: glConfig,
    scene: sceneOptions,
    camera: cameraOptions,
    shadows = false,
    linear = false,
    flat = false,
    legacy = false,
    frameloop = 'always',
    dpr = [1, 2],
    performance,
    onPointerMissed,
  } = props
  const size = computeInitialSize(canvas, props.size)
  const next: Configuration = { ...props, shadows, linear, flat, legacy, frameloop, size }

  const state = store.getState()
  const gl = state.gl
  const last = configuration.previous
  const changed = (key: keyof Configuration) => !last || !is.equ(next[key], last[key], shallow)
  // A failure can leave inputs partly applied, so the next configuration applies all of them
  configuration.previous = undefined

  // Set up raycaster (one time only!)
  let raycaster = state.raycaster
  if (!raycaster) state.set({ raycaster: (raycaster = new THREE.Raycaster()) })
  if (changed('raycaster')) {
    const { params, ...options } = props.raycaster ?? {}
    applyProps(raycaster, { ...options, params: { ...raycaster.params, ...params } } as any)
  }

  // Create default camera, don't overwrite any user-set state
  if (!state.camera || (state.camera === configuration.camera && changed('camera'))) {
    configuration.camera = cameraOptions
    const isCamera = (cameraOptions as unknown as THREE.Camera | undefined)?.isCamera
    const camera = isCamera
      ? (cameraOptions as Camera)
      : props.orthographic
      ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
      : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    if (!isCamera) {
      camera.position.z = 5
      if (cameraOptions) {
        applyProps(camera, cameraOptions as any)
        // Preserve user-defined frustum if possible
        // https://github.com/pmndrs/react-three-fiber/issues/3160
        if (!(camera as any).manual) {
          if (
            'aspect' in cameraOptions ||
            'left' in cameraOptions ||
            'right' in cameraOptions ||
            'bottom' in cameraOptions ||
            'top' in cameraOptions
          ) {
            ;(camera as any).manual = true
            camera.updateProjectionMatrix()
          }
        }
      }
      // Always look at center by default
      if (!state.camera && !cameraOptions?.rotation) camera.lookAt(0, 0, 0)
    }
    state.set({ camera })

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
      scene = new THREE.Scene()
      prepare(scene, store, '', {})
      if (sceneOptions) applyProps(scene as any, sceneOptions as any)
    }

    state.set({ scene })
  }

  // Store events internally
  if (props.events && !state.events.handlers) state.set({ events: props.events(store) })
  if (changed('size')) state.setSize(size.width, size.height, size.top, size.left)
  // The ratio follows window.devicePixelRatio, which changes with browser zoom or another display
  if (state.viewport.dpr !== calculateDpr(dpr)) state.setDpr(dpr)
  if (changed('frameloop')) state.setFrameloop(frameloop)
  if (changed('onPointerMissed')) state.set({ onPointerMissed })
  // Performance options merge, so removing them keeps the current settings
  if (performance && changed('performance')) {
    state.set((state) => ({ performance: { ...state.performance, ...performance } }))
  }

  // Set up XR (one time only!)
  if (!state.xr) {
    // Handle frame behavior in WebXR
    const handleXRFrame: XRFrameRequestCallback = (timestamp: number, frame?: XRFrame) => {
      const state = store.getState()
      if (state.frameloop === 'never') return
      advance(timestamp, true, state, frame)
    }

    // Toggle render switching on session
    const handleSessionChange = () => {
      const state = store.getState()
      state.gl.xr.enabled = state.gl.xr.isPresenting

      state.gl.xr.setAnimationLoop(state.gl.xr.isPresenting ? handleXRFrame : null)
      if (!state.gl.xr.isPresenting) invalidate(state)
    }

    // WebXR session manager
    const xr = {
      connect() {
        const gl = store.getState().gl
        gl.xr.addEventListener('sessionstart', handleSessionChange)
        gl.xr.addEventListener('sessionend', handleSessionChange)
      },
      disconnect() {
        const gl = store.getState().gl
        gl.xr.removeEventListener('sessionstart', handleSessionChange)
        gl.xr.removeEventListener('sessionend', handleSessionChange)
      },
    }

    // Subscribe to WebXR session events
    if (typeof gl.xr?.addEventListener === 'function') xr.connect()
    state.set({ xr })
  }

  // Set shadowmap
  if (gl.shadowMap && changed('shadows')) {
    const oldEnabled = gl.shadowMap.enabled
    const oldType = gl.shadowMap.type
    gl.shadowMap.enabled = !!shadows

    if (is.boo(shadows)) {
      gl.shadowMap.type = THREE.PCFSoftShadowMap
    } else if (is.str(shadows)) {
      const types = {
        basic: THREE.BasicShadowMap,
        percentage: THREE.PCFShadowMap,
        soft: THREE.PCFSoftShadowMap,
        variance: THREE.VSMShadowMap,
      }
      gl.shadowMap.type = types[shadows] ?? THREE.PCFSoftShadowMap
    } else if (is.obj(shadows)) {
      Object.assign(gl.shadowMap, shadows)
    }

    if (oldEnabled !== gl.shadowMap.enabled || oldType !== gl.shadowMap.type) gl.shadowMap.needsUpdate = true
  }

  // Explicit renderer options take precedence over the color shorthands
  const glProps =
    glConfig && !is.fun(glConfig) && !isRenderer(glConfig) ? (glConfig as Partial<THREE.WebGLRenderer>) : undefined
  if (changed('legacy')) {
    THREE.ColorManagement.enabled = !legacy
    state.set({ legacy })
  }
  if (changed('linear')) {
    if (glProps?.outputColorSpace === undefined) {
      gl.outputColorSpace = linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
    }
    state.set({ linear })
  }
  if (changed('flat')) {
    if (glProps?.toneMapping === undefined) gl.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping
    state.set({ flat })
  }

  // Set gl props
  if (glProps && changed('gl')) applyProps(gl, glProps as any)

  configuration.previous = next
}
