import * as THREE from 'three/src/Three'
import Reconciler from 'react-reconciler'
import {
  unstable_scheduleCallback as scheduleDeferredCallback,
  unstable_cancelCallback as cancelDeferredCallback,
  unstable_now as now,
} from 'scheduler'

const roots = new Map()
const emptyObject = {}

let catalogue = {}
export const apply = objects => (catalogue = { ...catalogue, ...objects })

export function applyProps(instance, newProps, oldProps = {}, interpolateArray = false, container) {
  if (instance.obj) instance = instance.obj
  // Filter equals, events and reserved props
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
  let name = `${type[0].toUpperCase()}${type.slice(1)}`
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
