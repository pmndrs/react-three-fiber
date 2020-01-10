import * as THREE from 'three'
import * as React from 'react'
import { useMemo, useRef, useEffect, useState, useCallback, createContext, useLayoutEffect } from 'react'
import { render, invalidate, applyProps, unmountComponentAtNode, renderGl } from './reconciler'
import { TinyEmitter } from 'tiny-emitter'
import { ReactThreeFiber } from './three-types'
import { RectReadOnly } from 'react-use-measure'

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

export function isOrthographicCamera(def: THREE.Camera): def is THREE.OrthographicCamera {
  return (def as THREE.OrthographicCamera).isOrthographicCamera
}

export type DomEvent =
  | React.MouseEvent<HTMLDivElement, MouseEvent>
  | React.WheelEvent<HTMLDivElement>
  | React.PointerEvent<HTMLDivElement>

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export type PointerEvent = DomEvent &
  Intersection & {
    stopped: React.MutableRefObject<boolean>
    unprojectedPoint: THREE.Vector3
    ray: THREE.Ray
    camera: THREE.Camera
    stopPropagation: () => void
    sourceEvent: DomEvent
    delta: number
  }

export type RenderCallback = (state: CanvasContext, delta: number) => void

export type SharedCanvasContext = {
  gl: THREE.WebGLRenderer
  aspect: number
  subscribe: (callback: React.MutableRefObject<RenderCallback>, priority?: number) => () => void
  setDefaultCamera: (camera: Camera) => void
  invalidate: () => void
  intersect: (event?: DomEvent) => void
  camera: Camera
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  clock: THREE.Clock
  scene: THREE.Scene
  size: RectReadOnly
  viewport: { width: number; height: number; factor: number }
  events: PointerEvents
}

export type Subscription = {
  ref: React.MutableRefObject<RenderCallback>
  priority: number
}

export type CanvasContext = SharedCanvasContext & {
  captured: Intersection[] | undefined
  noEvents: boolean
  ready: boolean
  active: boolean
  manual: number
  vr: boolean
  concurrent: boolean
  invalidateFrameloop: boolean
  frames: number
  subscribers: Subscription[]
  initialClick: [number, number]
  initialHits: THREE.Object3D[]
  pointer: TinyEmitter
}

export type FilterFunction = (items: THREE.Intersection[], state: SharedCanvasContext) => THREE.Intersection[]

export type ResizeOptions = {
  debounce?: number | { scroll: number; resize: number }
  scroll?: boolean
}

export interface CanvasProps {
  children: React.ReactNode
  vr?: boolean
  gl2?: boolean
  concurrent?: boolean
  shadowMap?: boolean | Partial<THREE.WebGLShadowMap>
  orthographic?: boolean
  resize?: ResizeOptions
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  noEvents?: boolean
  gl?: Partial<THREE.WebGLRenderer>
  camera?: Partial<
    ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera> &
      ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera> &
      ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
  >
  raycaster?: Partial<THREE.Raycaster> & { filter?: FilterFunction }
  pixelRatio?: number
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
}

export interface UseCanvasProps extends CanvasProps {
  gl: THREE.WebGLRenderer
  size: RectReadOnly
}

export type PointerEvents = {
  onClick(e: any): void
  onWheel(e: any): void
  onPointerDown(e: any): void
  onPointerUp(e: any): void
  onPointerLeave(e: any): void
  onPointerMove(e: any): void
  onGotPointerCapture(e: any): void
  onLostPointerCapture(e: any): void
}

function makeId(event: PointerEvent) {
  return (event.eventObject || event.object).uuid + '/' + event.index
}

export const stateContext = createContext<SharedCanvasContext>({} as SharedCanvasContext)

export const useCanvas = (props: UseCanvasProps): PointerEvents => {
  const {
    children,
    gl,
    camera,
    orthographic,
    raycaster,
    size,
    pixelRatio,
    vr = false,
    concurrent = false,
    shadowMap = false,
    invalidateFrameloop = false,
    updateDefaultCamera = true,
    noEvents = false,
    onCreated,
    onPointerMissed,
  } = props

  // Local, reactive state
  const [ready, setReady] = useState(false)
  const [mouse] = useState(() => new THREE.Vector2())

  const [defaultRaycaster] = useState(() => {
    const ray = new THREE.Raycaster()
    if (raycaster) {
      const { filter, ...raycasterProps } = raycaster
      applyProps(ray, raycasterProps, {})
    }
    return ray
  })

  const [defaultScene] = useState(() => {
    const scene = new THREE.Scene()
    ;(scene as any).__interaction = []
    ;(scene as any).__objects = []
    return scene
  })

  const [defaultCam, setDefaultCamera] = useState(() => {
    const cam = orthographic
      ? new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 1000)
      : new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    cam.position.z = 5
    if (camera) applyProps(cam, camera, {})
    return cam
  })

  const [clock] = useState(() => new THREE.Clock())

  // Public state
  const state: React.MutableRefObject<CanvasContext> = useRef<CanvasContext>({
    ready: false,
    active: true,
    manual: 0,
    vr,
    concurrent,
    noEvents,
    invalidateFrameloop: false,
    frames: 0,
    aspect: 0,
    subscribers: [],
    camera: defaultCam,
    scene: defaultScene,
    raycaster: defaultRaycaster,
    mouse,
    clock,
    gl,
    size,
    viewport: { width: 0, height: 0, factor: 0 },
    initialClick: [0, 0],
    initialHits: [],
    pointer: new TinyEmitter(),
    captured: undefined,
    events: (undefined as unknown) as PointerEvents,

    subscribe: (ref: React.MutableRefObject<RenderCallback>, priority: number = 0) => {
      // If this subscription was given a priority, it takes rendering into its own hands
      // For that reason we switch off automatic rendering and increase the manual flag
      // As long as this flag is positive (there could be multiple render subscription)
      // ..there can be no internal rendering at all
      if (priority) state.current.manual++

      state.current.subscribers.push({ ref, priority: priority })
      // Sort layers from lowest to highest, meaning, highest priority renders last (on top of the other frames)
      state.current.subscribers = state.current.subscribers.sort((a, b) => a.priority - b.priority)
      return () => {
        // Decrease manual flag if this subscription had a priority
        if (priority) state.current.manual--
        state.current.subscribers = state.current.subscribers.filter(s => s.ref !== ref)
      }
    },
    setDefaultCamera: (camera: Camera) => setDefaultCamera(camera),
    invalidate: () => invalidate(state),
    intersect: (event?: DomEvent) => handlePointerMove(event || ({} as DomEvent)),
  })

  // Writes locals into public state for distribution among subscribers, context, etc
  useMemo(() => {
    state.current.ready = ready
    state.current.size = size
    state.current.camera = defaultCam
    state.current.invalidateFrameloop = invalidateFrameloop
    state.current.vr = vr
    state.current.gl = gl
    state.current.concurrent = concurrent
    state.current.noEvents = noEvents
  }, [invalidateFrameloop, vr, concurrent, noEvents, ready, size, defaultCam, gl])

  // Adjusts default camera
  useMemo(() => {
    state.current.aspect = size.width / size.height

    if (isOrthographicCamera(defaultCam)) {
      state.current.viewport = { width: size.width, height: size.height, factor: 1 }
    } else {
      const target = new THREE.Vector3(0, 0, 0)
      const distance = defaultCam.position.distanceTo(target)
      const fov = THREE.Math.degToRad(defaultCam.fov) // convert vertical fov to radians
      const height = 2 * Math.tan(fov / 2) * distance // visible height
      const width = height * state.current.aspect
      state.current.viewport = { width, height, factor: size.width / width }
    }

    // #92 (https://github.com/drcmda/react-three-fiber/issues/92)
    // Sometimes automatic default camera adjustment isn't wanted behaviour
    if (updateDefaultCamera) {
      if (isOrthographicCamera(defaultCam)) {
        defaultCam.left = size.width / -2
        defaultCam.right = size.width / 2
        defaultCam.top = size.height / 2
        defaultCam.bottom = size.height / -2
      } else {
        defaultCam.aspect = state.current.aspect
      }
      defaultCam.updateProjectionMatrix()

      // #178: https://github.com/react-spring/react-three-fiber/issues/178
      // Update matrix world since the renderer is a frame late
      defaultCam.updateMatrixWorld()
    }

    gl.setSize(size.width, size.height)

    if (ready) invalidate(state)
  }, [defaultCam, size, updateDefaultCamera])

  /** Events ------------------------------------------------------------------------------------------------ */

  /** Sets up defaultRaycaster */
  const prepareRay = useCallback(({ clientX, clientY }) => {
    if (clientX !== void 0) {
      const { left, right, top, bottom } = state.current.size
      mouse.set(((clientX - left) / (right - left)) * 2 - 1, -((clientY - top) / (bottom - top)) * 2 + 1)
      defaultRaycaster.setFromCamera(mouse, state.current.camera)
    }
  }, [])

  /** Intersects interaction objects using the event input */
  const intersect = useCallback((event: DomEvent, prepare = true): Intersection[] => {
    // Skip event handling when noEvents is set
    if (state.current.noEvents) return []

    if (prepare) prepareRay(event)

    const seen = new Set<string>()
    const hits: Intersection[] = []

    // Intersect known handler objects and filter against duplicates
    let intersects = defaultRaycaster
      .intersectObjects((state.current.scene as any).__interaction, true)
      .filter(item => {
        const id = makeId(item as PointerEvent)
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })

    // #16031: (https://github.com/mrdoob/three.js/issues/16031)
    // Allow custom userland intersect sort order
    if (raycaster && raycaster.filter && sharedState.current)
      intersects = raycaster.filter(intersects, sharedState.current)

    for (let intersect of intersects) {
      let eventObject: THREE.Object3D | null = intersect.object
      // Bubble event up
      while (eventObject) {
        const handlers = (eventObject as any).__handlers
        if (handlers) hits.push({ ...intersect, eventObject })
        eventObject = eventObject.parent
      }
    }
    return hits
  }, [])

  /**  Calculates click deltas */
  const calculateDistance = useCallback((event: DomEvent) => {
    let dx = event.clientX - state.current.initialClick[0]
    let dy = event.clientY - state.current.initialClick[1]
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }, [])

  const hovered = useMemo(() => new Map<string, PointerEvent>(), [])

  /**  Handles intersections by forwarding them to handlers */
  const handleIntersects = useCallback((event: DomEvent, fn: (event: PointerEvent) => void): Intersection[] => {
    prepareRay(event)
    // Get fresh intersects
    const hits: Intersection[] = intersect(event, false)
    // If the interaction is captured take that into account, the captured event has to be part of the intersects
    if (state.current.captured && event.type !== 'click' && event.type !== 'wheel') {
      state.current.captured.forEach(captured => {
        if (!hits.find(hit => hit.eventObject === captured.eventObject)) hits.push(captured)
      })
    }
    // If anything has been found, forward it to the event listeners
    if (hits.length) {
      const unprojectedPoint = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(state.current.camera)
      const delta = event.type === 'click' ? calculateDistance(event) : 0

      for (let hit of hits) {
        let stopped = { current: false }
        let raycastEvent = {
          ...event,
          ...hit,
          stopped,
          delta,
          unprojectedPoint,
          ray: defaultRaycaster.ray,
          camera: state.current.camera,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => (stopped.current = true),
          sourceEvent: event,
        }
        fn(raycastEvent)
        if (stopped.current === true) {
          // Propagation is stopped, remove all other hover records
          // An event handler is only allowed to flush other handlers if it is hovered itself
          if (hovered.size && Array.from(hovered.values()).find(i => i.object === hit.object)) {
            handlePointerCancel(raycastEvent, [hit])
          }
          break
        }
      }
    }
    return hits
  }, [])

  const handlePointerMove = useCallback((event: DomEvent) => {
    state.current.pointer.emit('pointerMove', event)
    const hits = handleIntersects(event, data => {
      const eventObject = data.eventObject
      const handlers = (eventObject as any).__handlers
      // Check presence of handlers
      if (!handlers) return
      // Call mouse move
      if (handlers.pointerMove) handlers.pointerMove(data)
      // Check if mouse enter or out is present
      if (handlers.pointerOver || handlers.pointerEnter || handlers.pointerOut || handlers.pointerLeave) {
        const id = makeId(data)
        const hoveredItem = hovered.get(id)
        if (!hoveredItem) {
          // If the object wasn't previously hovered, book it and call its handler
          hovered.set(id, data)
          if (handlers.pointerOver) handlers.pointerOver({ ...data, type: 'pointerover' })
          if (handlers.pointerEnter) handlers.pointerEnter({ ...data, type: 'pointerEnter' })
        } else if (hoveredItem.stopped.current) {
          // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
          data.stopPropagation()
        }
      }
    })
    // Take care of unhover
    handlePointerCancel(event, hits)
    return hits
  }, [])

  const handlePointerCancel = useCallback((event: DomEvent, hits?: Intersection[]) => {
    state.current.pointer.emit('pointerCancel', event)
    if (!hits) hits = handleIntersects(event, () => null)
    Array.from(hovered.values()).forEach(data => {
      // When no objects were hit or the the hovered object wasn't found underneath the cursor
      // we call onPointerOut and delete the object from the hovered-elements map
      if (hits && (!hits.length || !hits.find(i => i.eventObject === data.eventObject))) {
        const eventObject = data.eventObject
        const handlers = (eventObject as any).__handlers
        if (handlers) {
          if (handlers.pointerOut) handlers.pointerOut({ ...data, type: 'pointerout' })
          if (handlers.pointerLeave) handlers.pointerLeave({ ...data, type: 'pointerleave' })
        }
        hovered.delete(makeId(data))
      }
    })
  }, [])

  const handlePointer = useCallback(
    (name: string) => (event: DomEvent) => {
      state.current.pointer.emit(name, event)
      // Collect hits
      const hits = handleIntersects(event, data => {
        const eventObject = data.eventObject
        const handlers = (eventObject as any).__handlers
        if (handlers && handlers[name]) {
          // Forward all events back to their respective handlers with the exception of click,
          // which must must the initial target
          if (name !== 'click' || state.current.initialHits.includes(eventObject)) handlers[name](data)
        }
      })
      // If a click yields no results, pass it back to the user as a miss
      if (name === 'pointerDown') {
        state.current.initialClick = [event.clientX, event.clientY]
        state.current.initialHits = hits.map(hit => hit.eventObject)
      }
      if (name === 'click' && !hits.length && onPointerMissed) {
        if (calculateDistance(event) <= 2) onPointerMissed()
      }
    },
    [onPointerMissed]
  )

  useMemo(() => {
    state.current.events = {
      onClick: handlePointer('click'),
      onWheel: handlePointer('wheel'),
      onPointerDown: handlePointer('pointerDown'),
      onPointerUp: handlePointer('pointerUp'),
      onPointerLeave: (e: any) => handlePointerCancel(e, []),
      onPointerMove: handlePointerMove,
      onGotPointerCapture: (e: any) => (state.current.captured = intersect(e, false)),
      onLostPointerCapture: (e: any) => ((state.current.captured = undefined), handlePointerCancel(e)),
    }
  }, [onPointerMissed])

  /** Events ------------------------------------------------------------------------------------------------- */

  // Only trigger the context provider when necessary
  const sharedState = useRef<SharedCanvasContext>()
  useMemo(() => {
    const {
      ready,
      manual,
      vr,
      noEvents,
      invalidateFrameloop,
      frames,
      subscribers,
      captured,
      initialClick,
      initialHits,
      ...props
    } = state.current
    sharedState.current = props
  }, [size, defaultCam])

  // Update pixel ratio
  useLayoutEffect(() => void (pixelRatio && gl.setPixelRatio(pixelRatio)), [pixelRatio])
  // Update shadowmap
  useLayoutEffect(() => {
    if (shadowMap) {
      gl.shadowMap.enabled = true
      if (typeof shadowMap === 'object') Object.assign(gl, shadowMap)
      else gl.shadowMap.type = THREE.PCFSoftShadowMap
    }
  }, [shadowMap])

  // This component is a bridge into the three render context, when it gets rendererd
  // we know we are ready to compile shaders, call subscribers, etc
  const IsReady = useCallback(() => {
    const activate = () => setReady(true)

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const result = onCreated && onCreated(state.current)
      return void (result && result.then ? result.then(activate) : activate())
    }, [])
    return null
  }, [])

  // Render v-dom into scene
  useLayoutEffect(() => {
    render(
      <stateContext.Provider value={sharedState.current as SharedCanvasContext}>
        {typeof children === 'function' ? children(state.current) : children}
        <IsReady />
      </stateContext.Provider>,
      defaultScene,
      state
    )
  }, [ready, children, sharedState.current])

  useLayoutEffect(() => {
    if (ready) {
      // Start render-loop, either via RAF or setAnimationLoop for VR
      if (!state.current.vr) {
        invalidate(state)
      } else if (gl.vr && gl.setAnimationLoop) {
        gl.vr.enabled = true
        gl.setAnimationLoop((t: number) => renderGl(state, t, 0, true))
      } else console.warn('the gl instance does not support VR!')
    }
  }, [ready])

  // Dispose renderer on unmount
  useEffect(
    () => () => {
      if (state.current.gl) {
        if (state.current.gl.forceContextLoss) state.current.gl.forceContextLoss!()
        if (state.current.gl.dispose) state.current.gl.dispose!()
        ;(state.current as any).gl = undefined
        unmountComponentAtNode(state.current.scene)
        state.current.active = false
      }
    },
    []
  )

  return state.current.events
}
