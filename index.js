import * as THREE from 'three/src/Three'
import React, { useRef, useEffect, useMemo, useState, useCallback, useContext } from 'react'
import Reconciler from 'react-reconciler'
import omit from 'lodash-es/omit'
import upperFirst from 'lodash-es/upperFirst'
import ResizeObserver from 'resize-observer-polyfill'
import {
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_cancelCallback as cancelDeferredCallback,
  unstable_now as now,
} from 'scheduler'

const roots = new Map()
const emptyObject = {}

let globalSubscribersMap = new Set()
let globalSubscribers = []
export const useFrameloop = fn => {
  globalSubscribersMap.add(fn)
  globalSubscribers = Array.from(globalSubscribersMap.values())
}

let catalogue = {}
export const apply = objects => (catalogue = { ...catalogue, ...objects })

export function applyProps(instance, newProps, oldProps = {}, interpolateArray = false, container) {
  if (instance.obj) instance = instance.obj
  // Filter equals, events and reserved props
  const sameProps = Object.keys(newProps).filter(key => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter(key => typeof newProps[key] === 'function' && key.startsWith('on'))
  const filteredProps = omit(newProps, [...sameProps, 'children', 'key', 'ref'])
  if (Object.keys(filteredProps).length > 0) {
    Object.entries(filteredProps).forEach(([key, value]) => {
      if (!handlers.includes(key)) {
        let root = instance
        let target = root[key]
        if (key.includes('-')) {
          const entries = key.split('-')
          target = entries.reduce((acc, key) => acc[key], instance)
          if (target && !target.set) {
            // The target is atomic, this forces us to switch the root
            const [name, ...reverseEntries] = entries.reverse()
            root = reverseEntries.reverse().reduce((acc, key) => acc[key], instance)
            key = name
          }
        }
        if (target && target.set) {
          if (target.constructor.name === value.constructor.name) {
            target.copy(value)
          } else if (Array.isArray(value)) {
            target.set(...value)
          } else {
            target.set(value)
          }
        } else {
          if (interpolateArray && Array.isArray(root[key])) root[key].push(value)
          else root[key] = value
        }
      }
    })

    // Prep interaction handlers
    if (handlers.length) {
      if (container && instance.raycast) {
        // Add interactive object to central container
        container.__interaction.push(instance)
      }
      instance.__handlers = handlers.reduce((acc, key) => {
        const name = key.charAt(2).toLowerCase() + key.substr(3)
        return { ...acc, [name]: newProps[key] }
      }, {})
    }
    // Call the update lifecycle, if present
    if (instance.__handlers && instance.__handlers.update) instance.__handlers.update(instance)
  }
}

function createInstance(type, { args = [], ...props }, container) {
  let name = upperFirst(type)
  let instance
  if (type === 'primitive') instance = props.object
  else {
    const target = catalogue[name] || THREE[name]
    instance = Array.isArray(args) ? new target(...args) : new target(args)
  }
  if (!instance.isObject3D) instance = { obj: instance, parent: undefined }
  applyProps(instance, props, {}, false, container)
  return instance
}

function appendChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.add(child)
    else {
      child.parent = parentInstance
      // The name attribute implies that the object attaches itself on the parent
      if (child.obj.name) applyProps(parentInstance, { [child.obj.name]: child.obj }, {}, true)
    }
  }
}

function removeChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) {
      parentInstance.remove(child)
      if (child.dispose) child.dispose()
    } else {
      child.parent = undefined
      if (child.obj.name) {
        // Remove attachment
        const target = parentInstance[child.obj.name]
        if (Array.isArray(target)) parentInstance[child.obj.name] = target.filter(x => x !== child.obj)
        else parentInstance[child.obj.name] = undefined
      }
      if (child.obj.dispose) child.obj.dispose()
    }
  }
}

const Renderer = Reconciler({
  now,
  createInstance,
  removeChild,
  appendChild,
  supportsMutation: true,
  isPrimaryRenderer: false,
  schedulePassiveEffects: scheduleDeferredCallback,
  cancelPassiveEffects: cancelDeferredCallback,
  appendInitialChild: appendChild,
  appendChildToContainer: appendChild,
  removeChildFromContainer: removeChild,
  insertBefore(parentInstance, child, beforeChild) {
    if (child) {
      if (child.isObject3D) {
        child.parent = parentInstance
        child.dispatchEvent({ type: 'added' })
        // TODO: the order is out of whack if data objects are present, has to be recalculated
        const index = parentInstance.children.indexOf(beforeChild)
        parentInstance.children = [
          ...parentInstance.children.slice(0, index),
          child,
          ...parentInstance.children.slice(index),
        ]
      } else child.parent = parentInstance
    }
  },
  commitUpdate(instance, updatePayload, type, oldProps, newProps, fiber) {
    if (instance.isObject3D) {
      applyProps(instance, newProps, oldProps)
    } else {
      // This is a data object, let's extract critical information about it
      const parent = instance.parent
      const { args: argsNew = [], ...restNew } = newProps
      const { args: argsOld = [], ...restOld } = oldProps
      // If it has new props or arguments, then it needs to be re-instanciated
      if (argsNew.some((value, index) => value !== argsOld[index])) {
        // Next we create a new instance and append it again
        const newInstance = createInstance(instance.obj.type, newProps)
        removeChild(parent, instance)
        appendChild(parent, newInstance)
        // Switch instance
        instance.obj = newInstance.obj
        instance.parent = newInstance.parent
      } else {
        // Otherwise just overwrite props
        applyProps(instance, restNew, restOld)
      }
    }
  },
  getPublicInstance(instance) {
    return instance
  },
  getRootHostContext(rootContainerInstance) {
    return emptyObject
  },
  getChildHostContext(parentHostContext, type) {
    return emptyObject
  },
  createTextInstance() {},
  finalizeInitialChildren(instance, type, props, rootContainerInstance) {
    return false
  },
  prepareUpdate(instance, type, oldProps, newProps, rootContainerInstance, hostContext) {
    return emptyObject
  },
  shouldDeprioritizeSubtree(type, props) {
    return false
  },
  prepareForCommit() {},
  resetAfterCommit() {},
  shouldSetTextContent(props) {
    return false
  },
})

export function render(element, container) {
  let root = roots.get(container)
  if (!root) {
    root = Renderer.createContainer(container)
    roots.set(container, root)
  }
  Renderer.updateContainer(element, root, null, undefined)
  return Renderer.getPublicRootInstance(root)
}

export function unmountComponentAtNode(container) {
  const root = roots.get(container)
  if (root) Renderer.updateContainer(null, root, null, () => roots.delete(container))
}

function useMeasure() {
  const ref = useRef()
  const [bounds, set] = useState({ left: 0, top: 0, width: 0, height: 0 })
  const [ro] = useState(() => new ResizeObserver(([entry]) => set(entry.contentRect)))
  useEffect(() => {
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [{ ref }, bounds]
}

export const stateContext = React.createContext()
export const intersectsContext = React.createContext()

export const Canvas = React.memo(({ children, props, style, camera, render: renderFn, resize, created, ...rest }) => {
  const [intersects, setIntersects] = useState([])
  const canvas = useRef()
  const state = useRef({
    subscribers: [],
    render: true,
    active: true,
    canvas: undefined,
    gl: undefined,
    camera: undefined,
    scene: undefined,
    size: undefined,
    viewport: (target = new THREE.Vector3(0, 0, 0)) => {
      const distance = state.current.camera.position.distanceTo(target)
      const fov = THREE.Math.degToRad(state.current.camera.fov) // convert vertical fov to radians
      const height = 2 * Math.tan(fov / 2) * distance // visible height
      const width = height * state.current.camera.aspect
      return { width, height }
    },
    subscribe: (fn, main) => {
      if (main !== void 0) state.current.render = main ? false : true
      state.current.subscribers.push(fn)
      return () => (state.current.subscribers = state.current.subscribers.filter(s => s === fn))
    },
  })

  const [bind, size] = useMeasure()
  state.current.size = size
  state.current.size.aspect = state.current.size.width / state.current.size.height

  const [ready, setReady] = useState(false)
  const readyRef = useRef(false)
  useEffect(() => void (readyRef.current = ready), [ready])

  const [raycaster] = useState(() => new THREE.Raycaster())
  const [mouse] = useState(() => new THREE.Vector2())
  const [cursor, setCursor] = useState('default')

  useEffect(() => {
    state.current.gl = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true, ...props })
    state.current.gl.setClearAlpha(0)
    state.current.gl.setSize(state.current.size.width, state.current.size.height, false)
    //state.current.gl.setPixelRatio(window.devicePixelRatio)
    //state.current.gl.setSize(window.innerWidth, window.innerHeight)

    state.current.camera = (camera && camera.current) || new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    state.current.camera.position.z = 5
    state.current.canvas = canvas.current

    state.current.scene = window.scene = new THREE.Scene()
    state.current.scene.__interaction = []

    const renderLoop = function() {
      if (!state.current.active) return
      requestAnimationFrame(renderLoop)
      if (readyRef.current) {
        globalSubscribers.forEach(fn => fn())
        state.current.subscribers.forEach(fn => fn(state.current))
        if (renderFn) renderFn(state.current)
        else if (state.current.render && state.current.scene.children.length) {
          state.current.gl.render(state.current.scene, state.current.camera)
        }
      }
    }

    // Start render-loop
    requestAnimationFrame(renderLoop)

    // Clean-up
    return () => {
      state.current.active = false
      unmountComponentAtNode(state.current.scene)
    }
  }, [])

  useMemo(() => {
    if (ready) {
      state.current.gl.setSize(state.current.size.width, state.current.size.height, false)
      if (resize) resize(state.current)
      state.current.camera.aspect = state.current.size.aspect
      state.current.camera.updateProjectionMatrix()
      state.current.camera.radius = (state.current.size.width + state.current.size.height) / 4
    }
  }, [ready, state.current.size.width, state.current.size.height])

  const intersect = useCallback((event, fn) => {
    const x = (event.clientX / state.current.size.width) * 2 - 1
    const y = -(event.clientY / state.current.size.height) * 2 + 1
    mouse.set(x, y, 0.5)
    raycaster.setFromCamera(mouse, state.current.camera)
    // TODO only inspect onbjects that have handlers
    const hits = raycaster.intersectObjects(state.current.scene.__interaction, true).filter(h => h.object.__handlers)
    hits.forEach(fn)
    return hits
  }, [])

  useEffect(() => {
    const hovered = {}
    const handleMove = event => {
      let hover = false
      const hits = intersect(event, data => {
        const object = data.object
        const handlers = object.__handlers
        if (handlers.hover) {
          hover = true
          if (!hovered[object.uuid]) {
            hovered[object.uuid] = object
            handlers.hover(data)
          }
        }
      })

      if (hover) cursor !== 'pointer' && setCursor('pointer')
      else cursor !== 'default' && setCursor('default')

      Object.values(hovered).forEach(object => {
        if (!hits.length || !hits.find(i => i.object === object)) {
          if (object.__handlers.unhover) {
            object.__handlers.unhover()
          }
          delete hovered[object.uuid]
        }
      })

      /*if (intersects.length !== hits.length || intersects.some((h, index) => h.object !== hits[index].object))
        setIntersects(hits)*/
    }

    const handleClick = event => {
      const clicked = {}
      intersect(event, data => {
        const object = data.object
        const handlers = object.__handlers
        if (handlers.click && !clicked[object.uuid]) {
          clicked[object.uuid] = object
          handlers.click(data)
        }
      })
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseup', handleClick, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleClick)
    }
  })

  const IsReady = useCallback(() => {
    useEffect(() => {
      state.current.gl.compile(state.current.scene, state.current.camera)
      setReady(true)
      if (created) created(state.current)
    }, [])
    return null
  }, [])

  // Render v-dom into scene
  useEffect(() => {
    if (state.current.size.width > 0) {
      render(
        <stateContext.Provider value={{ ...state.current }}>
          <IsReady />
          {typeof children === 'function' ? children(state.current) : children}
        </stateContext.Provider>,
        state.current.scene
      )
    }
  })

  // Render the canvas into the dom
  return (
    <div
      {...bind}
      {...rest}
      style={{ cursor, position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <canvas ref={canvas} />
    </div>
  )
})

export function useRender(fn, main) {
  const { subscribe } = useContext(stateContext)
  useEffect(() => subscribe(fn, main), [])
}

export function useThree(fn) {
  const { subscribe, ...props } = useContext(stateContext)
  return props
}

// TODO
export function useSelection() {}
