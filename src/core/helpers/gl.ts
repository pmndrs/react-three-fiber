import * as THREE from 'three'
import { WebGLRenderer } from 'three'
import { TinyEmitter } from 'tiny-emitter'

import { RendererFunctions } from '../renderer'

import { CanvasProps, CanvasContext, RenderCallback, DomEventHandlers } from '../../types/index'
import { DomEvent, ThreeScene } from '../../types/internal'

export const createContextState = (
  container: HTMLCanvasElement,
  props: Omit<CanvasProps, 'children'>,
  { invalidate, applyProps }: RendererFunctions
): CanvasContext => {
  console.log('creating context')
  const {
    gl = {},
    renderer = WebGLRenderer,
    camera,
    orthographic,
    raycaster,
    pixelRatio,
    vr = false,
    concurrent = false,
    shadowMap = false,
    colorManagement = true,
    invalidateFrameloop = false,
    updateDefaultCamera = true,
    noEvents = false,
    onCreated,
    onPointerMissed,
  } = props

  // set up renderer
  const glParams = { antialias: true, alpha: true, ...gl }
  const defaultRenderer = new renderer({
    powerPreference: 'high-performance',
    canvas: container,
    ...glParams,
  })

  // set up the scene
  const defaultScene: ThreeScene = new THREE.Scene()
  defaultScene.__interaction = []
  defaultScene.__objects = []

  // set up the camera
  // camera can be modified
  let defaultCam: THREE.Camera = orthographic
    ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
    : new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
  defaultCam.position.z = 5
  if (camera) {
    applyProps(defaultCam, camera, {})
  }
  defaultCam.lookAt(0, 0, 0) // Always look at [0, 0, 0]

  //set up the raycaster
  const defaultRaycaster = new THREE.Raycaster()
  if (raycaster) {
    // do not pass filter & computeOffsets
    const { filter, computeOffsets, ...raycasterProps } = raycaster
    applyProps(defaultRaycaster, raycasterProps, {})
  }

  // set up subscribe func
  const subscribe = (ref: React.MutableRefObject<RenderCallback>, priority = 0) => {
    // If this subscription was given a priority, it takes rendering into its own hands
    // For that reason we switch off automatic rendering and increase the manual flag
    // As long as this flag is positive (there could be multiple render subscription)
    // ..there can be no internal rendering at all
    if (priority) state.manual++

    state.subscribers.push({ ref, priority: priority })
    // Sort layers from lowest to highest, meaning, highest priority renders last (on top of the other frames)
    state.subscribers = state.subscribers.sort((a, b) => a.priority - b.priority)
    return () => {
      if (state.subscribers) {
        // Decrease manual flag if this subscription had a priority
        if (priority) state.manual--
        state.subscribers = state.subscribers.filter((s) => s.ref !== ref)
      }
    }
  }

  const state: CanvasContext = {
    gl: defaultRenderer,
    camera: defaultCam,
    scene: defaultScene,
    raycaster: defaultRaycaster,
    ready: true,
    active: true,
    manual: 0,
    invalidateFrameloop: false,
    frames: 0,
    aspect: 0,
    colorManagement,
    vr,
    concurrent,
    noEvents,
    subscribers: [],
    mouse: new THREE.Vector2(),
    clock: new THREE.Clock(),
    viewport: { width: 0, height: 0, factor: 0, distance: 0 },
    initialClick: [0, 0],
    initialHits: [],
    pointer: new TinyEmitter(),
    captured: undefined,
    events: {} as DomEventHandlers,
    subscribe,
    setDefaultCamera: (camera: THREE.Camera) => {
      defaultCam = camera
    },
    invalidate: () => invalidate(state),
    /**
     * i'm not sure what this does atm,
     * currently it's a blocker as this
     * is an event function........
     */
    intersect: (event: DomEvent = {} as DomEvent, prepare = true) => {
      // return handlePointerMove(event, prepare)
      return null
    },
  }

  return state
}
