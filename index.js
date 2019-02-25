import * as THREE from 'three'
import React, { useRef, useEffect, useState } from 'react'
import Reconciler from 'react-reconciler'
import omit from 'lodash-es/omit'
import upperFirst from 'lodash-es/upperFirst'
import ResizeObserver from 'resize-observer-polyfill'

const roots = new Map()
const emptyObject = {}

function applyProps(instance, newProps, oldProps) {
  // Filter equals, events and reserved props
  const sameProps = Object.keys(newProps).filter(key => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter(key => typeof newProps[key] === 'function' && key.startsWith('on'))
  const filteredProps = omit(newProps, [...sameProps, ...handlers, 'children', 'key', 'ref'])
  if (Object.keys(filteredProps).length > 0) {
    Object.entries(filteredProps).map(([key, value]) => {
      const [targetName, ...entries] = key
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .reverse()
      const target = entries.reverse().reduce((acc, key) => acc[key.toLowerCase()], instance)
      target[targetName.toLowerCase()] = value
    })

    // Set events
    /*instance.unsubscribes = handlers.reduce((acc, key) => {
      const name = key.charAt(2).toLowerCase() + key.substr(3)
      // Remove old events and return new unsubscribe
      if (instance.unsubscribes && instance.unsubscribes[key]) instance.removeSubscription(instance.unsubscribes[key])
      return {
        ...acc,
        [key]: instance.observe(state => state[name], (state, old) => !instance.busy && newProps[key](state, old)),
      }
    }, {})*/
  }
}

const Renderer = Reconciler({
  supportsMutation: true,
  isPrimaryRenderer: false,
  now: () => Date.now(),
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
    const instance = new THREE[(upperFirst(type))]() //(rootContainerInstance, {})
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
  schedulePassiveEffects(callback) {
    callback()
  },
  cancelPassiveEffects(callback) {},
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

export function Canvas({ children, style, ...props }) {
  const canvasRef = useRef()
  const renderer = useRef()
  const camera = useRef()
  const active = useRef(true)
  const [bind, measurements] = useMeasure()

  useEffect(() => {
    const scene = new THREE.Scene()
    const pool = new THREE.Group()
    renderer.current = new THREE.WebGLRenderer({ canvas: canvasRef.current })
    camera.current = new THREE.PerspectiveCamera(75, 0, 0.1, 1000)
    renderer.current.setSize(0, 0, false)
    camera.current.position.z = 5
    scene.add(pool)
    const renderLoop = function() {
      if (!active.current) return
      requestAnimationFrame(renderLoop)
      renderer.current.render(scene, camera.current)
    }
    render(children, pool)
    requestAnimationFrame(renderLoop)

    return () => {
      active.current = false
      unmountComponentAtNode(pool)
    }
  }, [])

  useEffect(() => {
    renderer.current.setSize(measurements.width, measurements.height, false)
    const aspect = measurements.width / measurements.height
    camera.current.aspect = aspect
    camera.current.updateProjectionMatrix()
    camera.current.radius = (measurements.width + measurements.height) / 4
  })

  return (
    <div {...bind} {...props} style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
