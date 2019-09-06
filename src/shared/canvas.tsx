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
  camera: Camera
  raycaster: THREE.Raycaster
  scene: THREE.Scene
  size: { left: number; top: number; width: number; height: number }
  viewport: { width: number; height: number; factor: number }
}

export const stateContext = createContext<CanvasContext>({} as CanvasContext)

type UseCanvasProps = {
  children: React.ReactNode
  browser?: boolean
  vr?: boolean
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

export const useCanvas = (props: UseCanvasProps) => {
  const {
    children,
    gl,
    camera,
    orthographic,
    raycaster,
    size,
    pixelRatio,
    vr = false,
    invalidateFrameloop = false,
    updateDefaultCamera = true,
    onCreated,
    browser,
  } = props

  const useLayoutEffect = browser ? React.useLayoutEffect : useEffect
  let isReadyPrepared = false

  // Local, reactive state
  const [ready, setReady] = useState(false)

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
    gl,
    size: { left: 0, top: 0, width: 0, height: 0 },
    viewport: { width: 0, height: 0, factor: 0 },
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
  useLayoutEffect(() => {
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

    if (ready && size.width) {
      if (gl) {
        gl.setSize(size.width, size.height)
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
    if (!isReadyPrepared && gl && size.width && size.height) {
      render(
        <stateContext.Provider value={sharedState.current}>
          <IsReady />
          {typeof children === 'function' ? children(state.current) : children}
        </stateContext.Provider>,
        state.current.scene,
        state
      )
      isReadyPrepared = true
    }
  }, [gl, size])
}
