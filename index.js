import * as THREE from 'three'
import React, { useRef, useEffect, useState, useCallback } from 'react'
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
    }
  }
}

const Renderer = Reconciler({
  supportsMutation: true,
  isPrimaryRenderer: false,
  now,
  getPublicInstance(instance) {
    return instance
  },
  getRootHostContext(rootContainerInstance) {
    return emptyObject
  },
  getChildHostContext(parentHostContext, type) {
    return emptyObject
  },
  createInstance(type, props, rootContainerInstance, hostContext, internalInstanceHandle) {
    const instance = type === 'primitive' ? props.object : new THREE[(upperFirst(type))]()
    applyProps(instance, props, {})
    return instance
  },
  createTextInstance() {},
  appendInitialChild(parentInstance, child) {
    if (child) parentInstance.add(child)
  },
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
  appendChild(parentInstance, child) {
    if (child) parentInstance.add(child)
  },
  appendChildToContainer(parentInstance, child) {
    if (child) parentInstance.add(child)
  },
  insertBefore(parentInstance, child, beforeChild) {
    if (child) {
      child.parent = parentInstance
      child.dispatchEvent({ type: 'added' })
      const index = parentInstance.children.indexOf(beforeChild)
      parentInstance.children = [
        ...parentInstance.children.slice(0, index),
        child,
        ...parentInstance.children.slice(index),
      ]
    }
  },
  removeChild(parentInstance, child) {
    if (child) parentInstance.remove(child)
  },
  removeChildFromContainer(parentInstance, child) {
    if (child) parentInstance.remove(child)
  },
  commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    instance.busy = true
    applyProps(instance, newProps, oldProps)
    instance.busy = false
  },
  schedulePassiveEffects: scheduleDeferredCallback,
  cancelPassiveEffects: cancelDeferredCallback,
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

export function useMeasure() {
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

export function Canvas({ children, style, camera, onCreated, onUpdate, ...props }) {
  const canvasRef = useRef()
  const renderer = useRef()
  const cameraRef = useRef()
  const scene = useRef()
  const active = useRef(true)
  const [bind, measurements] = useMeasure()
  const [raycaster] = useState(() => new THREE.Raycaster())
  const [mouse] = useState(() => new THREE.Vector2())
  const subscribers = useRef([])
  const [cursor, setCursor] = useState('default')

  useEffect(() => {
    scene.current = new THREE.Scene()
    renderer.current = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
    renderer.current.setClearColor(new THREE.Color('transparent'))
    cameraRef.current = (camera && camera.current) || new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    renderer.current.setSize(0, 0, false)
    cameraRef.current.position.z = 5

    if (onCreated) onCreated(renderer.current, scene.current, cameraRef.current)

    const renderLoop = function() {
      if (!active.current) return
      requestAnimationFrame(renderLoop)
      if (onUpdate) onUpdate()
      subscribers.current.forEach(fn => fn())
      renderer.current.render(scene.current, cameraRef.current)
    }
    render(
      <context.Provider
        value={{
          scene: scene.current,
          renderer: renderer.current,
          camera: cameraRef.current,
          subscribe: fn => {
            subscribers.current.push(fn)
            return () => (subscribers.current = subscribers.current.filter(s => s === fn))
          },
        }}>
        {children}
      </context.Provider>,
      scene.current
    )
    requestAnimationFrame(renderLoop)

    return () => {
      active.current = false
      unmountComponentAtNode(scene.current)
    }
  }, [])

  useEffect(() => {
    renderer.current.setSize(measurements.width, measurements.height, false)
    const aspect = measurements.width / measurements.height
    cameraRef.current.aspect = aspect
    cameraRef.current.updateProjectionMatrix()
    cameraRef.current.radius = (measurements.width + measurements.height) / 4
  })

  const intersect = useCallback((event, fn) => {
    mouse.x = (event.clientX / measurements.width) * 2 - 1
    mouse.y = -(event.clientY / measurements.height) * 2 + 1
    raycaster.setFromCamera(mouse, cameraRef.current)
    const intersects = raycaster.intersectObjects(scene.current.children, true)
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
        let intersects = intersect(event, data => {
          const object = data.object
          const handlers = object.__handlers
          if (handlers.click && !clicked[object.uuid]) {
            clicked[object.uuid] = object
            handlers.click(data)
          }
        })
      }}
      style={{ cursor, position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
