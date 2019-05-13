import * as THREE from 'three'
import Reconciler from 'react-reconciler'
import {
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_cancelCallback as cancelDeferredCallback,
  unstable_now as now,
  unstable_IdlePriority as idlePriority,
  unstable_runWithPriority as run,
} from 'scheduler'

const roots = new Map()
const emptyObject = {}
const is = {
  obj: (a: any) => a === Object(a),
  str: (a: any) => typeof a === 'string',
  num: (a: any) => typeof a === 'number',
  und: (a: any) => a === void 0,
  arr: (a: any) => Array.isArray(a),
  equ(a: any, b: any) {
    // Wrong type, doesn't match
    if (typeof a !== typeof b) return false
    // Atomic, just compare a against b
    if (is.str(a) || is.num(a) || is.obj(a)) return a === b
    // Array, shallow compare first to see if it's a match
    if (is.arr(a) && a == b) return true
    // Last resort, go through keys
    let i
    for (i in a) if (!(i in b)) return false
    for (i in b) if (a[i] !== b[i]) return false
    return is.und(i) ? a === b : true
  },
}

let globalEffects: Function[] = []

export function addEffect(callback: Function) {
  globalEffects.push(callback)
}

export function renderGl(state, timestamp: number, repeat = 0, runGlobalEffects = false) {
  // Run global effects
  if (runGlobalEffects) globalEffects.forEach(effect => effect(timestamp) && repeat++)

  // Decrease frame count
  state.current.frames = Math.max(0, state.current.frames - 1)
  repeat += !state.current.invalidateFrameloop ? 1 : state.current.frames
  // Run local effects
  state.current.subscribers.forEach(fn => fn(state.current, timestamp))
  // Render content
  if (!state.current.manual) state.current.gl.render(state.current.scene, state.current.camera)
  return repeat
}

let running = false
function renderLoop(timestamp: number) {
  running = true
  let repeat = 0

  // Run global effects
  globalEffects.forEach(effect => effect(timestamp) && repeat++)

  roots.forEach(root => {
    const state = root.containerInfo.__state
    // If the frameloop is invalidated, do not run another frame
    if (state.current.active && state.current.ready && (!state.current.invalidateFrameloop || state.current.frames > 0))
      repeat = renderGl(state, timestamp, repeat)
  })

  if (repeat !== 0) return requestAnimationFrame(renderLoop)
  // Flag end of operation
  running = false
}

export function invalidate(state, frames = 1) {
  if (state && state.current) {
    if (state.current.vr) return
    state.current.frames = frames
  } else if (state === true) roots.forEach(root => (root.containerInfo.__state.current.frames = frames))
  if (!running) {
    running = true
    requestAnimationFrame(renderLoop)
  }
}

let catalogue = {}
export const apply = objects => (catalogue = { ...catalogue, ...objects })

export function applyProps(instance, newProps, oldProps = {}, container?) {
  // Filter equals, events and reserved props
  const sameProps = Object.keys(newProps).filter(key => is.equ(newProps[key], oldProps[key]))
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
        // Special treatment for objects with support for set/copy
        if (target && target.set && target.copy) {
          if (target.constructor.name === value.constructor.name) target.copy(value)
          else if (Array.isArray(value)) target.set(...value)
          else target.set(value)
          // Else, just overwrite the value
        } else root[key] = value

        invalidateInstance(instance)
      }
    })

    // Prep interaction handlers
    if (handlers.length) {
      // Add interactive object to central container
      if (container && instance.raycast && !(handlers.length === 1 && handlers[0] === 'onUpdate')) {
        container.__interaction.push(instance)
      }

      instance.__handlers = handlers.reduce(
        (acc, key) => ({ ...acc, [key.charAt(2).toLowerCase() + key.substr(3)]: newProps[key] }),
        {}
      )
    }
    // Call the update lifecycle when it is being updated
    if (!container) updateInstance(instance)
  }
}

function invalidateInstance(instance) {
  if (instance.__container && instance.__container.__state) invalidate(instance.__container.__state)
}

function updateInstance(instance) {
  if (instance.__handlers && instance.__handlers.update) instance.__handlers.update(instance)
}

function createInstance(type, { args = [], ...props }, container) {
  let name = `${type[0].toUpperCase()}${type.slice(1)}`
  let instance
  if (type === 'primitive') instance = props.object
  else {
    const target = catalogue[name] || THREE[name]
    instance = is.arr(args) ? new target(...args) : new target(args)
  }
  // Apply initial props
  instance.__objects = []
  instance.__container = container
  applyProps(instance, props, {}, container)
  return instance
}

function appendChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) parentInstance.add(child)
    else {
      parentInstance.__objects.push(child)
      child.parent = parentInstance
      // The attach attribute implies that the object attaches itself on the parent
      if (child.attach) parentInstance[child.attach] = child
      else if (child.attachArray) {
        if (!is.arr(parentInstance[child.attachArray])) parentInstance[child.attachArray] = []
        parentInstance[child.attachArray].push(child)
      } else if (child.attachObject) {
        if (!is.obj(parentInstance[child.attachObject[0]])) parentInstance[child.attachObject[0]] = {}
        parentInstance[child.attachObject[0]][child.attachObject[1]] = child
      }
    }
    updateInstance(child)
    invalidateInstance(child)
  }
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
      updateInstance(child)
    } else appendChild(parentInstance, child) // TODO: order!!!
    invalidateInstance(child)
  }
}

function removeChild(parentInstance, child) {
  if (child) {
    if (child.isObject3D) {
      parentInstance.remove(child)
    } else {
      child.parent = undefined
      parentInstance.__objects = parentInstance.__objects.filter(x => x !== child)
      // Remove attachment
      if (child.attach) parentInstance[child.attach] = undefined
      else if (child.attachArray)
        parentInstance[child.attachArray] = parentInstance[child.attachArray].filter(x => x !== child)
      else if (child.attachObject) parentInstance[child.attachObject[0]][child.attachObject[1]] = undefined
    }
    invalidateInstance(child)
    run(idlePriority, () => {
      // Remove interactivity
      if (child.__container) child.__container.__interaction = child.__container.__interaction.filter(x => x !== child)
      // Remove nested child objects
      if (child.__objects) child.__objects.forEach(obj => removeChild(child, obj))
      if (child.children) child.children.forEach(obj => removeChild(child, obj))
      // Dispose item
      if (child.dispose) child.dispose()
      // Remove references
      delete child.__container
      delete child.__objects
    })
  }
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
      // TODO, are colors falsely detected here?
      if (argsNew.some((value, index) => value !== argsOld[index])) {
        // Next we create a new instance and append it again
        const newInstance = createInstance(type, newProps, instance.__container)
        removeChild(parent, instance)
        appendChild(parent, newInstance)

        // This evil hack switches the react-internal fiber node
        // https://github.com/facebook/react/issues/14983
        // https://github.com/facebook/react/pull/15021
        ;[fiber, fiber.alternate].forEach(fiber => {
          if (fiber !== null) {
            fiber.stateNode = newInstance
            if (fiber.ref) {
              if (typeof fiber.ref === 'function') fiber.ref(newInstance)
              else fiber.ref.current = newInstance
            }
          }
        })
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
