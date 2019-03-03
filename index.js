/** TODOS
 * 1. Intersection has be more specific, it goes through the entire scene currently
 * 2. Fix camera
 * 3. Better way to set up the scene declaratively
 * 4. make it possible to render into a target without regressions
 */

import * as THREE from 'three'
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

let catalogue = {}
export const use = fn => (catalogue = { ...catalogue, ...fn() })

export function applyProps(instance, newProps, oldProps = {}) {
  if (instance.current) {
    instance = instance.current
  }

  // Filter equals, events and reserved props
  const sameProps = Object.keys(newProps).filter(key => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter(key => typeof newProps[key] === 'function' && key.startsWith('on'))
  const filteredProps = omit(newProps, [...sameProps, ...handlers, 'children', 'key', 'ref'])
  if (Object.keys(filteredProps).length > 0) {
    Object.entries(filteredProps).forEach(([key, value]) => {
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
      } else root[key] = value
    })

    if (handlers.length) {
      instance.__handlers = handlers.reduce((acc, key) => {
        const name = key.charAt(2).toLowerCase() + key.substr(3)
        return { ...acc, [name]: newProps[key] }
      }, {})
    }

    // Call the update lifecycle, if present
    if (instance.__handlers && instance.__handlers.update) instance.__handlers.update(instance)
  }
}

function createInstance(type, { args = [], ...props }, ...b) {
  let name = upperFirst(type)
  let instance
  if (type === 'primitive') instance = props.object
  else {
    const target = catalogue[name] || THREE[name]
    instance = Array.isArray(args) ? new target(...args) : new target(args)
  }
  applyProps(instance, props, {})
  if (!instance.isObject3D) instance = { current: instance }
  return instance
}

function appendChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.add(child)
    else if (child.current.name) {
      child.parent = parentInstance
      applyProps(parentInstance.isObject3D ? parentInstance : parentInstance.current, {
        [child.current.name]: child.current,
      })
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
      if (child.current.dispose) child.current.dispose()
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
        const newInstance = createInstance(instance.current.type, newProps)
        removeChild(parent, instance)
        appendChild(parent, newInstance)
        // Switch instance
        instance.current = newInstance.current
        instance.parent = newInstance.parent
      } else {
        // Otherwise just overwrite props
        applyProps(instance.current, restNew, restOld)
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

export const context = React.createContext()

export const Canvas = React.memo(
  ({ children, glProps, style, camera, render: renderFn, onResize, onMouseMove, onCreated, onUpdate, ...props }) => {
    const canvas = useRef()
    const state = useRef({
      subscribers: [],
      ready: false,
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
      subscribe: fn => {
        state.current.subscribers.push(fn)
        return () => (state.current.subscribers = state.current.subscribers.filter(s => s === fn))
      },
    })

    const [bind, size] = useMeasure()
    state.current.size = size

    const [raycaster] = useState(() => new THREE.Raycaster())
    const [mouse] = useState(() => new THREE.Vector2())
    const [cursor, setCursor] = useState('default')

    useEffect(() => {
      state.current.scene = window.scene = new THREE.Scene()
      state.current.gl = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true, ...glProps })
      state.current.gl.setClearAlpha(0)
      //state.current.gl.setClearColor(0xffffff, 0)

      state.current.camera = (camera && camera.current) || new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
      state.current.gl.setSize(0, 0, false)
      state.current.camera.position.z = 5
      state.current.canvas = canvas.current

      if (onCreated) onCreated(state.current)

      const renderLoop = function() {
        if (!state.current.active) return
        requestAnimationFrame(renderLoop)
        if (state.current.ready) {
          if (onUpdate) onUpdate(state.current)
          state.current.subscribers.forEach(fn => fn(state.current))
          if (renderFn) renderFn(state.current)
          else if (state.current.scene.children.length) {
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
      if (state.current.ready) {
        state.current.gl.setSize(state.current.size.width, state.current.size.height, false)
        state.current.aspect = state.current.size.width / state.current.size.height
        if (onResize) onResize(state.current)
        state.current.camera.aspect = state.current.aspect
        state.current.camera.updateProjectionMatrix()
        state.current.camera.radius = (state.current.size.width + state.current.size.height) / 4
      }
    }, [state.current.ready, state.current.size.width, state.current.size.height])

    const intersect = useCallback((event, fn) => {
      const x = (event.clientX / state.current.size.width) * 2 - 1
      const y = -(event.clientY / state.current.size.height) * 2 + 1
      mouse.set(x, y, 0.5)
      raycaster.setFromCamera(mouse, state.current.camera)
      const intersects = raycaster.intersectObjects(state.current.scene.children, true)
      for (var i = 0; i < intersects.length; i++) {
        const intersect = intersects[i]
        if (!intersect.object.__handlers) continue
        fn(intersect)
      }
      return intersects
    }, [])

    useEffect(() => {
      const hovered = {}
      const handleMove = event => {
        if (onMouseMove) onMouseMove(event)
        let hover = false
        let intersects = intersect(event, data => {
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
          if (!intersects.length || !intersects.find(i => i.object === object)) {
            if (object.__handlers.unhover) {
              object.__handlers.unhover()
            }
            delete hovered[object.uuid]
          }
        })
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
        state.current.ready = true
        if (onResize) onResize(state.current)
      }, [])
      return null
    }, [])

    // Render v-dom into scene
    useEffect(() => {
      if (state.current.size.width > 0) {
        render(
          <context.Provider value={{ ...state.current }}>
            <IsReady />
            {children}
          </context.Provider>,
          state.current.scene
        )
      }
    })

    // Render the canvas into the dom
    return (
      <div
        {...bind}
        {...props}
        style={{ cursor, position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
        <canvas ref={canvas} />
      </div>
    )
  }
)

export function useRender(fn) {
  const { subscribe } = useContext(context)
  useEffect(() => subscribe(fn), [])
}

export function useThree(fn) {
  const { subscribe, ...props } = useContext(context)
  return props
}
