/** TODOS
 * 1. Intersection has be more specific, it goes through the entire scene currently
 * 2. Fix camera
 * 3. Better way to set up the scene declaratively
 * 4. make it possible to render into a target without regressions
 */

import * as THREE from 'three'
import React, { useRef, useEffect, useState, useCallback, useContext } from 'react'
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

export function applyProps(instance, newProps, oldProps = {}) {
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
      // Call the update lifecycle, if present
      if (instance.__handlers.update) instance.__handlers.update(instance)
    }
  }
}

function createInstance(type, { args = [], ...props }) {
  const name = upperFirst(type)
  const instance = type === 'primitive' ? props.object : new THREE[name](...args)
  instance.__objects = []
  instance.__type = type
  applyProps(instance, props, {})
  return instance
}

function appendChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.add(child)
    else {
      parentInstance.__objects.push(child)
      if (child.name) {
        child.__parent = parentInstance
        applyProps(parentInstance, { [child.name]: child })
      }
    }
  }
}

function removeChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.remove(child)
    else {
      child.__parent = undefined
      parentInstance.__objects = parentInstance.__objects.filter(c => c !== child)
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
        // TODO: the order is out of whack if data objects are presents, has to be recalculated
        const index = parentInstance.children.indexOf(beforeChild)
        parentInstance.children = [
          ...parentInstance.children.slice(0, index),
          child,
          ...parentInstance.children.slice(index),
        ]
      } else appendChild(parentInstance, child)
    }
  },
  commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    instance.busy = true
    if (instance.isObject3D) {
      applyProps(instance, newProps, oldProps)
    } else {
      // This is a data object, let's extract critical information about it
      const parent = instance.__parent
      const { args: argsNew = [], ...restNew } = newProps
      const { args: argsOld = [], ...restOld } = oldProps
      // If it has new props or arguments, then it needs to be re-instanciated
      if (argsNew.some((value, index) => value !== argsOld[index])) {
        // First it gets removed from its parent
        removeChild(parent, instance)
        // Next we create a new instance and append it again
        appendChild(parent, createInstance(instance.type, newProps))
      } else {
        // Otherwise just overwrite props
        applyProps(instance, restNew, restOld)
      }
    }
    instance.busy = false
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

export function Canvas({ children, style, camera, render: renderFn, onCreated, onUpdate, ...props }) {
  const canvas = useRef()
  const state = useRef({
    subscribers: [],
    active: true,
    canvas: undefined,
    gl: undefined,
    camera: undefined,
    scene: undefined,
  })
  const [bind, measurements] = useMeasure()
  const [raycaster] = useState(() => new THREE.Raycaster())
  const [mouse] = useState(() => new THREE.Vector2())
  const [cursor, setCursor] = useState('default')

  useEffect(() => {
    state.current.scene = window.scene = new THREE.Scene()
    state.current.scene.__objects = []
    state.current.gl = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true })
    state.current.gl.setClearAlpha(0)

    state.current.camera = (camera && camera.current) || new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    state.current.gl.setSize(0, 0, false)
    state.current.camera.position.z = 5
    state.current.canvas = canvas.current

    if (onCreated) onCreated(state.current)

    const renderLoop = function() {
      if (!state.current.active) return
      requestAnimationFrame(renderLoop)
      if (onUpdate) onUpdate(state.current)
      state.current.subscribers.forEach(fn => fn(state.current))
      if (renderFn) renderFn(state.current)
      else state.current.gl.render(state.current.scene, state.current.camera)
    }

    // Start render-loop
    requestAnimationFrame(renderLoop)

    // Render v-dom into scene
    render(
      <context.Provider
        value={{
          ...state.current,
          subscribe: fn => {
            state.current.subscribers.push(fn)
            return () => (state.current.subscribers = state.current.subscribers.filter(s => s === fn))
          },
        }}>
        {children}
      </context.Provider>,
      state.current.scene
    )

    // Clean-up
    return () => {
      state.current.active = false
      unmountComponentAtNode(state.current.scene)
    }
  }, [])

  useEffect(() => {
    state.current.gl.setSize(measurements.width, measurements.height, false)
    const aspect = measurements.width / measurements.height
    state.current.camera.aspect = aspect
    state.current.camera.updateProjectionMatrix()
    state.current.camera.radius = (measurements.width + measurements.height) / 4
  })

  const intersect = useCallback((event, fn) => {
    mouse.x = (event.clientX / measurements.width) * 2 - 1
    mouse.y = -(event.clientY / measurements.height) * 2 + 1
    raycaster.setFromCamera(mouse, state.current.camera)
    const intersects = raycaster.intersectObjects(state.current.scene.children, true)
    for (var i = 0; i < intersects.length; i++) {
      if (!intersects[i].object.__handlers) continue
      fn(intersects[i])
    }
    return intersects
  })

  useEffect(() => {
    const hovered = {}
    const handleMove = event => {
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
          if (object.__handlers.unhover) object.__handlers.unhover()
          delete hovered[object.uuid]
        }
      })
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMove)
    }
  })

  return (
    <div
      {...bind}
      {...props}
      onClick={event => {
        const clicked = {}
        intersect(event, data => {
          const object = data.object
          const handlers = object.__handlers
          if (handlers.click && !clicked[object.uuid]) {
            clicked[object.uuid] = object
            handlers.click(data)
          }
        })
      }}
      style={{ cursor, position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <canvas ref={canvas} />
    </div>
  )
}

export function useRender(fn) {
  const { subscribe } = useContext(context)
  useEffect(() => subscribe(fn), [])
}

export function useThree(fn) {
  const { subscribe, ...props } = useContext(context)
  return props
}
