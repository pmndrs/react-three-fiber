import * as THREE from 'three'
import Reconciler from 'react-reconciler'
import {
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_cancelCallback as cancelDeferredCallback,
  unstable_now as now,
} from 'scheduler'

const roots = new Map()
const emptyObject = {}
const is = {
  obj: a => Object.prototype.toString.call(a) === '[object Object]',
  str: a => typeof a === 'string',
  num: a => typeof a === 'number',
  und: a => a === void 0,
  equ(a, b) {
    if (typeof a !== typeof b) return false
    if (is.str(a) || is.num(a) || is.obj(a)) return a === b
    let i
    for (i in a) if (!(i in b)) return false
    for (i in b) if (a[i] !== b[i]) return false
    return is.und(i) ? a === b : true
  },
}

let globalEffects = []
export function addEffect(callback) {
  globalEffects.push(callback)
}

let running = false
function renderLoop() {
  running = true
  let repeat = 0

  // Run global effects
  globalEffects.forEach(effect => effect() && repeat++)

  roots.forEach(root => {
    const state = root.containerInfo.__state
    const { invalidateFrameloop, frames, active, ready, subscribers, manual, scene, gl, camera } = state.current
    // If the frameloop is invalidated, do not run another frame
    if (active && ready && (!invalidateFrameloop || frames > 0)) {
      // Decrease frame count
      repeat += --state.current.frames
      // Run local effects
      subscribers.forEach(fn => fn(state.current))
      // Render content
      if (!manual && scene.children.length) gl.render(scene, camera)
    }
  })

  if (repeat !== 0) return requestAnimationFrame(renderLoop)
  // Flag end of operation
  running = false
}

export function invalidate(state) {
  if (state && state.current) state.current.frames = 60
  if (!running) {
    running = true
    requestAnimationFrame(renderLoop)
  }
}

let catalogue = {}
export const apply = objects => (catalogue = { ...catalogue, ...objects })

export function applyProps(instance, newProps, oldProps = {}, interpolateArray = false, container) {
  //console.log(newProps)
  const state = instance.__state
  if (instance.obj) instance = instance.obj
  // Filter equals, events and reserved props
  //console.log(newProps, oldProps)
  const sameProps = Object.keys(newProps).filter(key => newProps[key] === oldProps[key])
  const handlers = Object.keys(newProps).filter(key => typeof newProps[key] === 'function' && key.startsWith('on'))
  const filteredProps = [...sameProps, 'children', 'key', 'ref'].reduce((acc, prop) => {
    let { [prop]: _, ...rest } = acc
    return rest
  }, newProps)
  if (Object.keys(filteredProps).length > 0) {
    Object.entries(filteredProps).forEach(([key, value]) => {
      if (!handlers.includes(key)) {
        let root = instance
        let target = root[key]
        if (key.includes('-')) {
          const entries = key.split('-')
          target = entries.reduce((acc, key) => acc[key], instance)
          // If the target is atomic, it forces us to switch the root
          if (!(target && target.set)) {
            const [name, ...reverseEntries] = entries.reverse()
            root = reverseEntries.reverse().reduce((acc, key) => acc[key], instance)
            key = name
          }
        }
        if (target && target.set) {
          if (target.constructor.name === value.constructor.name) target.copy(value)
          else if (Array.isArray(value)) target.set(...value)
          else target.set(value)
        } else root[key] = value
        if (state) invalidate(state)
      }
    })

    // Prep interaction handlers
    if (handlers.length) {
      // Add interactive object to central container
      if (container && instance.raycast) container.__interaction.push(instance)
      instance.__handlers = handlers.reduce(
        (acc, key) => ({ ...acc, [key.charAt(2).toLowerCase() + key.substr(3)]: newProps[key] }),
        {}
      )
    }
    // Call the update lifecycle, if present
    if (instance.__handlers && instance.__handlers.update) instance.__handlers.update(instance)
  }
}

function createInstance(type, { args = [], ...props }, container) {
  let name = `${type[0].toUpperCase()}${type.slice(1)}`
  let instance
  if (type === 'primitive') instance = props.object
  else {
    const target = catalogue[name] || THREE[name]
    instance = Array.isArray(args) ? new target(...args) : new target(args)
  }
  // Apply initial props
  applyProps(instance, props, {}, false, container)

  if (!instance.isObject3D) {
    instance = { obj: instance, parent: undefined, __state: container.__state }
  } else {
    instance.__state = container.__state
  }
  return instance
}

function appendChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.add(child)
    else {
      child.parent = parentInstance
      // The name attribute implies that the object attaches itself on the parent
      if (child.obj.name) {
        if (parentInstance.obj) parentInstance = parentInstance.obj
        const target = parentInstance[child.obj.name]
        if (Array.isArray(target)) target.push(child.obj)
        else parentInstance[child.obj.name] = child.obj
      }
    }
  }
  if (parentInstance.__state) invalidate(parentInstance.__state)
}

function removeChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) {
      parentInstance.remove(child)
      if (child.dispose) child.dispose()
    } else {
      child.parent = undefined
      if (child.obj.name) {
        if (parentInstance.obj) parentInstance = parentInstance.obj
        // Remove attachment
        const target = parentInstance[child.obj.name]
        if (Array.isArray(target)) parentInstance[child.obj.name] = target.filter(x => x !== child.obj)
        else parentInstance[child.obj.name] = undefined
      }
      if (child.obj.dispose) child.obj.dispose()
    }
  }
  if (parentInstance.__state) invalidate(parentInstance.__state)
}

function insertBefore(parentInstance, child, beforeChild) {
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
  if (parentInstance.__state) invalidate(parentInstance.__state)
}

const Renderer = Reconciler({
  now,
  createInstance,
  removeChild,
  appendChild,
  insertBefore,
  supportsMutation: true,
  isPrimaryRenderer: false,
  schedulePassiveEffects: scheduleDeferredCallback,
  cancelPassiveEffects: cancelDeferredCallback,
  appendInitialChild: appendChild,
  appendChildToContainer: appendChild,
  removeChildFromContainer: removeChild,
  insertInContainerBefore: insertBefore,
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
        const newInstance = createInstance(type, newProps)
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

export function render(element, container, state) {
  let root = roots.get(container)
  if (!root) {
    root = Renderer.createContainer(container)
    container.__state = state
    roots.set(container, root)
  }
  Renderer.updateContainer(element, root, null, undefined)
  return Renderer.getPublicRootInstance(root)
}

export function unmountComponentAtNode(container) {
  const root = roots.get(container)
  if (root) Renderer.updateContainer(null, root, null, () => roots.delete(container))
}
