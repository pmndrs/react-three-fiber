import * as THREE from 'three'
import * as React from 'react'
import { useRef, useEffect, useState, useCallback, createContext } from 'react'
import { render, invalidate, applyProps, unmountComponentAtNode, renderGl } from './reconciler'

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

export function isOrthographicCamera(def: THREE.Camera): def is THREE.OrthographicCamera {
  return (def as THREE.OrthographicCamera).isOrthographicCamera
}

export type DomEvent =
  | React.MouseEvent<HTMLDivElement, MouseEvent>
  | React.WheelEvent<HTMLDivElement>
  | React.PointerEvent<HTMLDivElement>

export type Intersection = THREE.Intersection & {
  object: THREE.Object3D
  receivingObject: THREE.Object3D
}

export type PointerEvent = DomEvent &
  Intersection & {
    stopped: React.MutableRefObject<boolean>
    unprojectedPoint: THREE.Vector3
    ray: THREE.Ray
    stopPropagation: () => void
    sourceEvent: DomEvent
  }

export type RenderCallback = (props: CanvasContext, timestamp: number) => void

export type CanvasContext = {
  gl?: THREE.WebGLRenderer
  captured: Intersection[] | undefined
  ready: boolean
  manual: boolean
  vr: boolean
  active: boolean
  invalidateFrameloop: boolean
  frames: number
  aspect: number
  subscribers: RenderCallback[]
  subscribe: (callback: RenderCallback) => () => void
  setManual: (takeOverRenderloop: boolean) => void
  setDefaultCamera: (camera: Camera) => void
  invalidate: () => void
  intersect: (event?: DomEvent) => void
  camera: Camera
  raycaster: THREE.Raycaster
  mouse: THREE.Vector2
  scene: THREE.Scene
  size: { left: number; top: number; width: number; height: number }
  viewport: { width: number; height: number; factor: number }
  initialClick: [number, number]
  initialHits: THREE.Object3D[]
}

export type CanvasProps = {
  children: React.ReactNode
  vr?: boolean
  orthographic?: boolean
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  gl?: Partial<THREE.WebGLRenderer>
  camera?: Partial<THREE.OrthographicCamera & THREE.PerspectiveCamera>
  raycaster?: Partial<THREE.Raycaster>
  pixelRatio?: number
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
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

export type UseCanvasProps = {
  children: React.ReactNode
  browser?: boolean
  vr?: boolean
  shadowMap?: boolean | Partial<THREE.WebGLShadowMap>
  orthographic?: boolean
  invalidateFrameloop?: boolean
  updateDefaultCamera?: boolean
  gl?: THREE.WebGLRenderer
  camera?: Partial<THREE.OrthographicCamera & THREE.PerspectiveCamera>
  raycaster?: Partial<THREE.Raycaster>
  size: { width: number; height: number; top: number; left: number }
  style?: any
  pixelRatio?: number
  onCreated?: (props: CanvasContext) => Promise<any> | void
  onPointerMissed?: () => void
}

function makeId(event: THREE.Intersection) {
  return event.object.uuid + '/' + event.index
}

export const stateContext = createContext<CanvasContext>({} as CanvasContext)

export const useCanvas = (props: UseCanvasProps): { pointerEvents: PointerEvents } => {
  const {
    children,
    gl,
    camera,
    orthographic,
    raycaster,
    size,
    pixelRatio,
    vr = false,
    shadowMap = false,
    invalidateFrameloop = false,
    updateDefaultCamera = true,
    onCreated,
    onPointerMissed,
    browser,
  } = props

  const useLayoutEffect = browser ? React.useLayoutEffect : useEffect

  // Local, reactive state
  const [ready, setReady] = useState(false)
  const [mouse] = useState(() => new THREE.Vector2())

  const [defaultRaycaster] = useState(() => {
    const ray = new THREE.Raycaster()
    if (raycaster) applyProps(ray, raycaster, {})
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

  // Public state
  const state: React.MutableRefObject<CanvasContext> = useRef<CanvasContext>({
    ready: false,
    manual: false,
    vr: false,
    active: true,
    invalidateFrameloop: false,
    frames: 0,
    aspect: 0,
    subscribers: [],
    camera: defaultCam,
    scene: defaultScene,
    raycaster: defaultRaycaster,
    mouse,
    gl,
    captured: undefined,
    size: { left: 0, top: 0, width: 0, height: 0 },
    viewport: { width: 0, height: 0, factor: 0 },
    initialClick: [0, 0],
    initialHits: [],

    subscribe: (fn: RenderCallback) => {
      state.current.subscribers.push(fn)
      return () => (state.current.subscribers = state.current.subscribers.filter(s => s !== fn))
    },
    setManual: (takeOverRenderloop: boolean) => {
      state.current.manual = takeOverRenderloop
      if (takeOverRenderloop) {
        // In manual mode items shouldn't really be part of the internal scene which has adverse effects
        // on the camera being unable to update without explicit calls to updateMatrixWorl()
        state.current.scene.children.forEach(child => state.current.scene.remove(child))
      }
    },
    setDefaultCamera: (camera: Camera) => setDefaultCamera(camera),
    invalidate: () => invalidate(state),
    intersect: (event?: DomEvent) => handlePointerMove(event || ({} as DomEvent)),
  })

  // This is used as a clone of the current state, to be distributed through context and useThree
  const sharedState = useRef(state.current)

  // Writes locals into public state for distribution among subscribers, context, etc
  useLayoutEffect(() => {
    state.current.ready = ready
    state.current.size = size
    state.current.camera = defaultCam
    state.current.invalidateFrameloop = invalidateFrameloop
    state.current.vr = vr
    state.current.gl = gl
  }, [invalidateFrameloop, vr, ready, size, defaultCam, gl])

  useLayoutEffect(() => {
    if (gl) {
      // Start render-loop, either via RAF or setAnimationLoop for VR
      if (!state.current.vr) {
        invalidate(state)
      } else {
        gl.vr!.enabled = true
        gl.setAnimationLoop!((t: number) => {
          renderGl(state, t, 0, true)
        })
      }
    }
  }, [gl])

  // Manage renderer
  useEffect(() => {
    // Dispose renderer on unmount
    return () => {
      if (gl) {
        gl.forceContextLoss!()
        gl.dispose!()
        ;(state.current as any).gl = undefined
        state.current.active = false
        unmountComponentAtNode(state.current.scene)
      }
    }
  }, [])

  // Update pixel ratio
  useLayoutEffect(() => {
    if (pixelRatio && gl) gl.setPixelRatio(pixelRatio)
  }, [pixelRatio, gl])

  // Adjusts default camera
  useLayoutEffect(() => {
    state.current.aspect = size.width / size.height || 0

    if (isOrthographicCamera(state.current.camera)) {
      state.current.viewport = { width: size.width, height: size.height, factor: 1 }
    } else {
      const target = new THREE.Vector3(0, 0, 0)
      const distance = state.current.camera.position.distanceTo(target)
      const fov = THREE.Math.degToRad(state.current.camera.fov) // convert vertical fov to radians
      const height = 2 * Math.tan(fov / 2) * distance // visible height
      const width = height * state.current.aspect
      state.current.viewport = { width, height, factor: size.width / width }
    }

    if (ready) {
      if (gl) {
        gl.setSize(size.width, size.height)
        gl.setClearAlpha(0)
        if (shadowMap) {
          if (typeof shadowMap === 'object') {
            gl.shadowMap.enabled = true
            Object.assign(gl, shadowMap)
          } else {
            gl.shadowMap.enabled = true
            gl.shadowMap.type = THREE.PCFSoftShadowMap
          }
        }
      }

      /* https://github.com/drcmda/react-three-fiber/issues/92
          Sometimes automatic default camera adjustment isn't wanted behaviour */
      if (updateDefaultCamera) {
        if (isOrthographicCamera(state.current.camera)) {
          state.current.camera.left = size.width / -2
          state.current.camera.right = size.width / 2
          state.current.camera.top = size.height / 2
          state.current.camera.bottom = size.height / -2
        } else {
          state.current.camera.aspect = state.current.aspect
          // TODO: Why radius??
          // state.current.camera.radius = (size.width + size.height) / 4
        }
        state.current.camera.updateProjectionMatrix()
      }
      invalidate(state)
    }
    // Only trigger the context provider when necessary
    sharedState.current = { ...state.current }
  }, [ready, size, defaultCam, updateDefaultCamera, gl])

  // This component is a bridge into the three render context, when it gets rendererd
  // we know we are ready to compile shaders, call subscribers, etc
  const IsReady = useCallback(() => {
    const activate = useCallback(() => void (setReady(true), invalidate(state)), [])
    useEffect(() => {
      if (onCreated) {
        const result = onCreated(state.current)
        if (result && result.then) return void result.then(activate)
      }
      activate()
    }, [])
    return null
  }, [])

  // Render v-dom into scene
  useLayoutEffect(() => {
    if (gl && size.width && size.height) {
      render(
        <stateContext.Provider value={sharedState.current}>
          <IsReady />
          {typeof children === 'function' ? children(state.current) : children}
        </stateContext.Provider>,
        state.current.scene,
        state
      )
    }
  })

  /** Sets up defaultRaycaster */
  const prepareRay = useCallback(event => {
    if (event.clientX !== void 0) {
      const left = state.current.size.left || 0
      const right = left + state.current.size.width || 0
      const top = size.top || 0
      const bottom = top + state.current.size.height || 0
      const x = ((event.clientX - left) / (right - left)) * 2 - 1
      const y = -((event.clientY - top) / (bottom - top)) * 2 + 1
      mouse.set(x, y)
      defaultRaycaster.setFromCamera(mouse, state.current.camera)
    }
  }, [])

  /** Intersects interaction objects using the event input */
  const intersect = useCallback((event: DomEvent, prepare = true): Intersection[] => {
    if (prepare) prepareRay(event)

    const seen = new Set<string>()
    const hits: Intersection[] = []

    // Intersect known handler objects and filter against duplicates
    const intersects = defaultRaycaster
      .intersectObjects((state.current.scene as any).__interaction, true)
      .filter(item => {
        const id = makeId(item)
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })

    for (let intersect of intersects) {
      let receivingObject = intersect.object
      let object: THREE.Object3D | null = intersect.object
      // Bubble event up
      while (object) {
        if ((object as any).__handlers) hits.push({ ...intersect, object, receivingObject })
        object = object.parent
      }
    }
    return hits
  }, [])

  /**  Handles intersections by forwarding them to handlers */
  const handleIntersects = useCallback((event: DomEvent, fn: (event: PointerEvent) => void): Intersection[] => {
    prepareRay(event)
    // If the interaction is captured, take the last known hit instead of raycasting again
    const hits: Intersection[] =
      state.current.captured && event.type !== 'click' && event.type !== 'wheel'
        ? state.current.captured
        : intersect(event, false)

    if (hits.length) {
      const unprojectedPoint = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(state.current.camera)

      for (let hit of hits) {
        let stopped = { current: false }
        fn({
          ...event,
          ...hit,
          stopped,
          unprojectedPoint,
          ray: defaultRaycaster.ray,
          // Hijack stopPropagation, which just sets a flag
          stopPropagation: () => (stopped.current = true),
          sourceEvent: event,
        })
        if (stopped.current === true) break
      }
    }
    return hits
  }, [])

  const handlePointer = useCallback(
    (name: string) => (event: DomEvent) => {
      if (!state.current.ready) return
      // Collect hits
      const hits = handleIntersects(event, data => {
        const object = data.object
        const handlers = (object as any).__handlers
        if (handlers && handlers[name]) {
          // Forward all events back to their respective handlers with the exception of click,
          // which must must the initial target
          if (name !== 'click' || state.current.initialHits.includes(object)) handlers[name](data)
        }
      })
      // If a click yields no results, pass it back to the user as a miss
      if (name === 'pointerDown') {
        state.current.initialClick = [event.clientX, event.clientY]
        state.current.initialHits = hits.map(hit => hit.object)
      }
      if (name === 'click' && !hits.length && onPointerMissed) {
        let dx = event.clientX - state.current.initialClick[0]
        let dy = event.clientY - state.current.initialClick[1]
        let distance = Math.round(Math.sqrt(dx * dx + dy * dy))
        if (distance <= 2) onPointerMissed()
      }
    },
    [onPointerMissed]
  )

  const hovered = new Map<string, PointerEvent>()
  const handlePointerMove = useCallback((event: DomEvent) => {
    if (!state.current.ready) return
    const hits = handleIntersects(event, data => {
      const object = data.object
      const handlers = (object as any).__handlers
      // Check presence of handlers
      if (!handlers) return

      // Call mouse move
      if (handlers.pointerMove) handlers.pointerMove(data)
      // Check if mouse enter or out is present
      if (handlers.pointerOver || handlers.pointerOut) {
        const id = makeId(data)
        const hoveredItem = hovered.get(id)
        if (!hoveredItem) {
          // If the object wasn't previously hovered, book it and call its handler
          hovered.set(id, data)
          if (handlers.pointerOver) handlers.pointerOver({ ...data, type: 'pointerover' })
        } else if (hoveredItem.stopped.current) {
          // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
          data.stopPropagation()
          // In fact, wwe can safely remove them from the cache
          Array.from(hovered.values()).forEach(data => {
            const checkId = makeId(data)
            if (checkId !== id) {
              if ((data.object as any).__handlers.pointerOut)
                (data.object as any).__handlers.pointerOut({ ...data, type: 'pointerout' })
              hovered.delete(checkId)
            }
          })
        }
      }
    })
    // Take care of unhover
    handlePointerCancel(event, hits)
    return hits
  }, [])

  const handlePointerCancel = useCallback((event: DomEvent, hits?: Intersection[]) => {
    if (!hits) hits = handleIntersects(event, () => null)
    Array.from(hovered.values()).forEach(data => {
      if (hits && (!hits.length || !hits.find(i => i.object === data.object))) {
        const object = data.object
        const handlers = (object as any).__handlers
        if (handlers && handlers.pointerOut) handlers.pointerOut({ ...data, type: 'pointerout' })
        hovered.delete(makeId(data))
      }
    })
  }, [])

  return {
    pointerEvents: {
      onClick: handlePointer('click'),
      onWheel: handlePointer('wheel'),
      onPointerDown: handlePointer('pointerDown'),
      onPointerUp: handlePointer('pointerUp'),
      onPointerLeave: (e: any) => handlePointerCancel(e, []),
      onPointerMove: handlePointerMove,
      onGotPointerCapture: (e: any) => (state.current.captured = intersect(e, false)),
      onLostPointerCapture: (e: any) => ((state.current.captured = undefined), handlePointerCancel(e)),
    },
    // anything else we might want to return?
  }
}
