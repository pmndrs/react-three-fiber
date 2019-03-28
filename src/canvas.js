import * as THREE from 'three'
import React, { useRef, useEffect, useMemo, useState, useCallback, useContext } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import { invalidate, applyProps, render, unmountComponentAtNode } from './reconciler'

export const stateContext = React.createContext()

function useMeasure() {
  const ref = useRef()
  const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [ro] = useState(() => new ResizeObserver(([entry]) => set(entry.contentRect)))
  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref.current])
  return [{ ref }, bounds]
}

export const Canvas = React.memo(
  ({ children, props, camera, style, pixelRatio, invalidateFrameloop = false, onCreated, ...rest }) => {
    // Local, reactive state
    const canvas = useRef()
    const [ready, setReady] = useState(false)
    const [bind, size] = useMeasure()
    const [intersects, setIntersects] = useState([])
    const [raycaster] = useState(() => new THREE.Raycaster())
    const [mouse] = useState(() => new THREE.Vector2())
    const [defaultCam, setDefaultCamera] = useState(() => {
      const cam = new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
      cam.position.z = 5
      if (camera) applyProps(cam, camera, {})
      return cam
    })

    // Public state
    const state = useRef({
      ready: false,
      subscribers: [],
      manual: false,
      active: true,
      canvas: undefined,
      gl: undefined,
      camera: undefined,
      scene: undefined,
      size: undefined,
      canvasRect: undefined,
      frames: 0,
      viewport: undefined,
      subscribe: (fn, main) => {
        state.current.subscribers.push(fn)
        return () => (state.current.subscribers = state.current.subscribers.filter(s => s !== fn))
      },
      setManual: takeOverRenderloop => {
        state.current.manual = takeOverRenderloop
        if (takeOverRenderloop) {
          // In manual mode items shouldn't really be part of the internal scene which has adverse effects
          // on the camera being unable to update without explicit calls to updateMatrixWorl()
          state.current.scene.children.forEach(child => state.current.scene.remove(child))
        }
      },
      setDefaultCamera: cam => {
        state.current.camera = cam
        setDefaultCamera(cam)
      },
      invalidate: () => invalidate(state),
    })

    // Writes locals into public state for distribution among subscribers, context, etc
    useEffect(() => {
      state.current.ready = ready
      state.current.size = size
      state.current.camera = defaultCam
      state.current.invalidateFrameloop = invalidateFrameloop
    }, [invalidateFrameloop, ready, size, defaultCam])

    // Component mount effect, creates the webGL render context
    useEffect(() => {
      state.current.gl = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true, ...props })
      if (pixelRatio) state.current.gl.setPixelRatio(pixelRatio)
      state.current.gl.setClearAlpha(0)
      state.current.canvas = canvas.current
      state.current.scene = new THREE.Scene()
      state.current.scene.__interaction = []

      // Start render-loop
      invalidate(state)

      // Clean-up
      return () => {
        state.current.active = false
        unmountComponentAtNode(state.current.scene)
      }
    }, [])

    // Adjusts default camera
    useEffect(() => {
      state.current.aspect = size.width / size.height || 0
      const target = new THREE.Vector3(0, 0, 0)
      const distance = state.current.camera.position.distanceTo(target)
      const fov = THREE.Math.degToRad(state.current.camera.fov) // convert vertical fov to radians
      const height = 2 * Math.tan(fov / 2) * distance // visible height
      const width = height * state.current.aspect
      state.current.viewport = { width, height }
      state.current.canvasRect = bind.ref.current.getBoundingClientRect()
      if (ready) {
        state.current.gl.setSize(size.width, size.height)
        state.current.camera.aspect = state.current.aspect
        state.current.camera.radius = (size.width + size.height) / 4
        state.current.camera.updateProjectionMatrix()
        invalidate(state)
      }
    }, [ready, size, defaultCam])

    // This component is a bridge into the three render context, when it gets rendererd
    // we know we are ready to compile shaders, call subscribers, etc
    const IsReady = useCallback(() => {
      const activate = useCallback(() => void (setReady(true), invalidate(state)), [])
      useEffect(() => {
        if (onCreated) {
          const result = onCreated(state.current)
          if (result.then) return void result.then(activate)
        }
        activate()
      }, [])
      return null
    }, [])

    // Render v-dom into scene
    useEffect(() => {
      if (size.width > 0 && size.height > 0) {
        render(
          <stateContext.Provider value={{ ...state.current }}>
            <IsReady />
            {typeof children === 'function' ? children(state.current) : children}
          </stateContext.Provider>,
          state.current.scene,
          state
        )
      }
    })

    const intersect = useCallback((event, fn) => {
      const canvasRect = state.current.canvasRect
      const x = ((event.clientX - canvasRect.left) / (canvasRect.right - canvasRect.left)) * 2 - 1
      const y = -((event.clientY - canvasRect.top) / (canvasRect.bottom - canvasRect.top)) * 2 + 1
      mouse.set(x, y, 0.5)
      raycaster.setFromCamera(mouse, state.current.camera)
      const hits = raycaster.intersectObjects(state.current.scene.__interaction, true).filter(h => h.object.__handlers)
      for (let hit of hits) {
        let stopped = { current: false }
        fn({
          ...hit,
          stopped,
          event: Object.assign({}, event),
          clientX: event.clientX,
          clientY: event.clientY,
          pageX: event.pageX,
          pageY: event.pageY,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          button: event.button,
          preventDefault: event.preventDefault,
          type: event.type,
          stopPropagation: () => (stopped.current = true),
          // react-use-gesture transforms ...
          transform: {
            x: x => x / (state.current.size.width / state.current.viewport.width),
            y: y => -y / (state.current.size.height / state.current.viewport.height),
          },
        })
        if (stopped.current === true) break
      }
      return hits
    }, [])

    const handleMouse = useCallback(
      name => event => {
        if (!state.current.ready) return
        intersect(event, data => {
          const object = data.object
          const handlers = object.__handlers
          if (handlers[name]) handlers[name](data)
        })
      },
      []
    )

    const hovered = useRef({})
    const handleMove = useCallback(event => {
      if (!state.current.ready) return
      const hits = intersect(event, data => {
        const object = data.object
        const handlers = object.__handlers
        // Call mouse move
        if (handlers.mouseMove) handlers.mouseMove(data)
        // Check if mouse enter is present
        if (handlers.mouseEnter) {
          if (!hovered.current[object.uuid]) {
            // If the object wasn't previously hovered, book it and call its handler
            hovered.current[object.uuid] = data
            handlers.mouseEnter({ ...data, type: 'mouseenter' })
          } else if (hovered.current[object.uuid].stopped.current) {
            // If the object was previously hovered and stopped, we shouldn't allow other items to proceed
            data.stopPropagation()
            // In fact, wwe can safely remove them from the cache
            Object.values(hovered.current).forEach(data => {
              if (data.object.uuid !== object.uuid) {
                if (data.object.__handlers.mouseLeave)
                  data.object.__handlers.mouseLeave({ ...data, type: 'mouseleave' })
                delete hovered.current[data.object.uuid]
              }
            })
          }
        }
      })

      // Take care of unhover
      Object.values(hovered.current).forEach(data => {
        if (!hits.length || !hits.find(i => i.object === data.object)) {
          if (data.object.__handlers.mouseLeave) data.object.__handlers.mouseLeave({ ...data, type: 'mouseleave' })
          delete hovered.current[data.object.uuid]
        }
      })
    }, [])

    // Render the canvas into the dom
    return (
      <div
        {...bind}
        {...rest}
        onClick={handleMouse('click')}
        onMouseUp={handleMouse('mouseUp')}
        onMouseDown={handleMouse('mouseDown')}
        onWheel={handleMouse('wheel')}
        onMouseMove={handleMove}
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
        <canvas style={{ display: 'block' }} ref={canvas} />
      </div>
    )
  }
)
