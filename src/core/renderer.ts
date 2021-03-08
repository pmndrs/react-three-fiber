import * as THREE from 'three'
import Reconciler from 'react-reconciler'
import { UseStore } from 'zustand'
import { unstable_now as now, unstable_IdlePriority as idlePriority, unstable_runWithPriority as run } from 'scheduler'
import { EventHandlers } from '../three-types'
import { is } from './is'
import { RootState } from './store'

export type Root = { fiber: Reconciler.FiberRoot; store: UseStore<RootState> }

type LocalState = {
  root: UseStore<RootState>
  objects: Instance[]
  instance?: boolean
  handlers?: EventHandlers
  dispose?: () => void
}

// This type clamps down on a couple of assumptions that we can make regarding native types, which
// could anything from scene objects, THREE.Objects, JSM, user-defined classes and non-scene objects.
// What they all need to have in common is defined here ...
export type Instance = Omit<THREE.Object3D, 'parent' | 'children' | 'attach' | 'remove' | 'raycast'> & {
  __r3f: LocalState
  parent: Instance | null
  children: Instance[]
  attach?: string
  remove: (...object: Instance[]) => Instance
  add: (...object: Instance[]) => Instance
  raycast?: (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void
  [key: string]: any
}

export type InstanceProps = {
  [key: string]: unknown
} & {
  args?: any[]
  object?: object
  visible?: boolean
  dispose?: null
  attach?: string
}

interface Catalogue {
  [name: string]: {
    new (...args: any): Instance
  }
}

// https://github.com/mrdoob/three.js/issues/21209
// HMR/fast-refresh relies on the ability to cancel out props, but threejs
// has no means to do this. Hence we curate a small collection of value-classes
// with their respective constructor/set arguments
const DEFAULT = '__default'
const defaultMap = new Map()
;[
  [THREE.Box2, [new THREE.Vector2(+Infinity, +Infinity), new THREE.Vector2(-Infinity, -Infinity)]],
  [THREE.Box3, [new THREE.Vector2(+Infinity, +Infinity), new THREE.Vector2(-Infinity, -Infinity)]],
  [THREE.Color, ['white']],
  [THREE.Cylindrical, [1, 0, 0]],
  [THREE.Euler, [0, 0, 0, 'XYZ']],
  [THREE.Vector2, [0, 0]],
  [THREE.Vector3, [0, 0, 0]],
  [THREE.Vector4, [0, 0, 0, 1]],
  [THREE.Matrix3, [1, 0, 0, 0, 1, 0, 0, 0, 1]],
  [THREE.Matrix4, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]],
  [THREE.Quaternion, [0, 0, 0, 1]],
  [THREE.Sphere, [new THREE.Vector3(), -1]],
  [THREE.Ray, [new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]],
  [THREE.Spherical, [1, 0, 0]],
  [THREE.Triangle, [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]],
].forEach(([type, args]) => defaultMap.set(type, args))

let emptyObject = {}
let catalogue: Catalogue = {}
let extend = (objects: object): void => void (catalogue = { ...catalogue, ...objects })

function createRenderer<TCanvas>(roots: Map<TCanvas, Root>, invalidate: (state?: RootState) => void) {
  function applyProps(instance: Instance, newProps: InstanceProps, oldProps: InstanceProps = {}, accumulative = false) {
    // Filter equals, events and reserved props
    const localState = (instance?.__r3f ?? {}) as LocalState
    const root = localState.root
    const rootState = root?.getState() ?? {}
    const sameProps: string[] = []
    const handlers: string[] = []

    let i
    let keys = Object.keys(newProps)

    for (i = 0; i < keys.length; i++) {
      if (is.equ(newProps[keys[i]], oldProps[keys[i]])) sameProps.push(keys[i])

      // Event-handlers ...
      //   are functions, that
      //   start with "on", and
      //   contain the name "Pointer", "Click", "ContextMenu", or "Wheel"
      if (is.fun(newProps[keys[i]]) && keys[i].startsWith('on')) {
        if (
          keys[i].includes('Pointer') ||
          keys[i].includes('Click') ||
          keys[i].includes('ContextMenu') ||
          keys[i].includes('Wheel')
        ) {
          handlers.push(keys[i])
        }
      }
    }

    // Catch props that existed, but now exist no more ...
    const leftOvers = [] as string[]
    keys = Object.keys(oldProps)
    if (accumulative) {
      for (i = 0; i < keys.length; i++) if (!newProps.hasOwnProperty(keys[i])) leftOvers.push(keys[i])
    }

    const toFilter = [...sameProps, 'children', 'key', 'ref']
    // Instances use "object" as a reserved identifier
    if (instance.__r3f?.instance) toFilter.push('object')
    const filteredProps = { ...newProps }

    // Removes sameProps and reserved props from newProps
    keys = Object.keys(filteredProps)
    for (i = 0; i < keys.length; i++) if (toFilter.indexOf(keys[i]) > -1) delete filteredProps[keys[i]]

    // Collect all new props
    const filteredPropsEntries = Object.entries(filteredProps)
    // Prepend left-overs so they can be reset or removed
    // Left-overs must come first!
    for (i = 0; i < leftOvers.length; i++)
      if (leftOvers[i] !== 'children') filteredPropsEntries.unshift([leftOvers[i], DEFAULT + 'remove'])

    if (filteredPropsEntries.length > 0) {
      filteredPropsEntries.forEach(([key, value]) => {
        if (!handlers.includes(key)) {
          let currentInstance = instance
          let targetProp = currentInstance[key]
          if (key.includes('-')) {
            const entries = key.split('-')
            targetProp = entries.reduce((acc, key) => acc[key], instance)
            // If the target is atomic, it forces us to switch the root
            if (!(targetProp && targetProp.set)) {
              const [name, ...reverseEntries] = entries.reverse()
              currentInstance = reverseEntries.reverse().reduce((acc: any, key) => acc[key], instance)
              key = name
            }
          }

          if (value === DEFAULT + 'remove') {
            // For removed props, try to set default values, if possible
            if (defaultMap.has(targetProp.constructor)) value = defaultMap.get(targetProp.constructor)
            else value = currentInstance[DEFAULT + key]
          }

          // Special treatment for objects with support for set/copy
          if (targetProp && targetProp.set && (targetProp.copy || targetProp instanceof THREE.Layers)) {
            // If value is an array it has got to be the set function
            if (Array.isArray(value)) targetProp.set(...value)
            // Test again target.copy(class) next ...
            else if (
              targetProp.copy &&
              value &&
              (value as any).constructor &&
              targetProp.constructor.name === (value as any).constructor.name
            ) {
              targetProp.copy(value)
            }
            // If nothing else fits, just set the single value, ignore undefined
            // https://github.com/react-spring/react-three-fiber/issues/274
            else if (value !== undefined) {
              const isColor = targetProp instanceof THREE.Color
              // Allow setting array scalars
              if (!isColor && targetProp.setScalar) targetProp.setScalar(value)
              // Otherwise just set ...
              else targetProp.set(value)
              // Auto-convert sRGB colors, for now ...
              // https://github.com/react-spring/react-three-fiber/issues/344
              if (!rootState.linear && isColor) targetProp.convertSRGBToLinear()
            }
            // Else, just overwrite the value
          } else {
            // Store a reference of the first-set atomic which will serve as a default
            if (!currentInstance.hasOwnProperty(DEFAULT + key)) {
              currentInstance[DEFAULT + key] = currentInstance[key]
            }

            currentInstance[key] = value
            // Auto-convert sRGB textures, for now ...
            // https://github.com/react-spring/react-three-fiber/issues/344
            if (!rootState.linear && currentInstance[key] instanceof THREE.Texture)
              currentInstance[key].encoding = THREE.sRGBEncoding
          }

          invalidateInstance(instance)
        }
      })

      // Preemptively delete the instance from the containers interaction
      if (accumulative && root && instance.raycast && localState.handlers) {
        localState.handlers = undefined
        const index = rootState.internal.interaction.indexOf((instance as unknown) as THREE.Object3D)
        if (index > -1) rootState.internal.interaction.splice(index, 1)
      }

      // Prep interaction handlers
      if (handlers.length) {
        if (accumulative && root && instance.raycast)
          rootState.internal.interaction.push((instance as unknown) as THREE.Object3D)
        // Add handlers to the instances handler-map
        localState.handlers = handlers.reduce((acc, key) => {
          // @ts-ignore
          acc[(key.charAt(2).toLowerCase() + key.substr(3)) as keyof EventHandlers] = newProps[key]
          return acc
        }, {} as EventHandlers)
      }
      // Call the update lifecycle when it is being updated, but only when it is part of the scene
      if (instance.parent) updateInstance(instance)
    }
  }

  function invalidateInstance(instance: Instance) {
    const state = instance.__r3f?.root?.getState()
    if (state && state.internal.frames === 0) state.invalidate()
  }

  function updateInstance(instance: Instance) {
    if (instance.onUpdate) instance.onUpdate(instance)
  }

  function createInstance(type: string, { args = [], ...props }: InstanceProps, root: UseStore<RootState>) {
    let name = `${type[0].toUpperCase()}${type.slice(1)}`
    let instance: Instance

    // Bind to the root container in case portals are being used
    // This is perhaps better for event management as we can keep them on a single instance
    /*while ((container as any).__r3f.root) {
      container = (container as any).__r3f.root
    }

    // TODO: https://github.com/facebook/react/issues/17147
    // If it's still not there it means the portal was created on a virtual node outside of react
    if (!roots.has(container)) {
      const fn = (node: Reconciler.Fiber): Container => {
        if (!node.return) return node.stateNode && node.stateNode.containerInfo
        else return fn(node.return)
      }
      container = fn(internalInstanceHandle)
    }*/

    if (type === 'primitive') {
      // Switch off dispose for primitive objects
      props = { dispose: null, ...props }
      instance = props.object as Instance
      instance.__r3f = {
        root,
        objects: [],
        instance: true,
        dispose: instance.dispose,
      }
    } else {
      const target = catalogue[name] || (THREE as any)[name]
      if (!target)
        throw `"${name}" is not part of the THREE namespace! Did you forget to extend it? See: https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#using-3rd-party-objects-declaratively`
      // Instanciate new object, link it to the root
      instance = is.arr(args) ? new target(...args) : new target(args)
      instance.__r3f = { root, objects: [] }
    }

    // Auto-attach geometries and materials
    if (name.endsWith('Geometry')) {
      props = { attach: 'geometry', ...props }
    } else if (name.endsWith('Material')) {
      props = { attach: 'material', ...props }
    }

    // It should NOT call onUpdate on object instanciation, because it hasn't been added to the
    // view yet. If the callback relies on references for instance, they won't be ready yet, this is
    // why it passes "true" here
    applyProps(instance, props, {})
    return instance
  }

  function appendChild(parentInstance: Instance, child: Instance) {
    if (child) {
      if (child.isObject3D) {
        parentInstance.add(child)
      } else {
        parentInstance.__r3f.objects.push(child)
        child.parent = parentInstance
        // The attach attribute implies that the object attaches itself on the parent
        if (child.attachArray) {
          if (!is.arr(parentInstance[child.attachArray])) parentInstance[child.attachArray] = []
          parentInstance[child.attachArray].push(child)
        } else if (child.attachObject) {
          if (!is.obj(parentInstance[child.attachObject[0]])) parentInstance[child.attachObject[0]] = {}
          parentInstance[child.attachObject[0]][child.attachObject[1]] = child
        } else if (child.attach) {
          parentInstance[child.attach] = child
        }
      }

      updateInstance(child)
      invalidateInstance(child)
    }
  }

  function insertBefore(parentInstance: Instance, child: Instance, beforeChild: Instance) {
    if (child) {
      if (child.isObject3D) {
        child.parent = parentInstance
        child.dispatchEvent({ type: 'added' })
        const restSiblings = parentInstance.children.filter((sibling: any) => sibling !== child)
        // TODO: the order is out of whack if data objects are present, has to be recalculated
        const index = restSiblings.indexOf(beforeChild)
        parentInstance.children = [...restSiblings.slice(0, index), child, ...restSiblings.slice(index)]
        updateInstance(child)
      } else {
        appendChild(parentInstance, child)
      } // TODO: order!!!
      invalidateInstance(child)
    }
  }

  function removeRecursive(array: Instance[], parent: Instance, clone = false) {
    if (array) {
      // Three uses splice op's internally we may have to shallow-clone the array in order to safely remove items
      const target = clone ? [...array] : array
      target.forEach((child: Instance) => removeChild(parent, child))
    }
  }

  function removeChild(parentInstance: Instance, child: Instance) {
    if (child) {
      if (child.isObject3D) {
        parentInstance.remove(child)
      } else {
        child.parent = null
        if (parentInstance.__r3f.objects)
          parentInstance.__r3f.objects = parentInstance.__r3f.objects.filter((x: any) => x !== child)
        // Remove attachment
        if (child.attachArray) {
          parentInstance[child.attachArray] = parentInstance[child.attachArray].filter((x: any) => x !== child)
        } else if (child.attachObject) {
          delete parentInstance[child.attachObject[0]][child.attachObject[1]]
        } else if (child.attach) {
          parentInstance[child.attach] = null
        }
      }

      // Remove interactivity
      if (child.__r3f.root) {
        const rootState = child.__r3f.root.getState()
        rootState.internal.interaction = rootState.internal.interaction.filter((x: any) => x !== child)
      }

      invalidateInstance(parentInstance)

      // Allow objects to bail out of recursive dispose alltogether by passing dispose={null}
      if (child.dispose !== null) {
        run(idlePriority, () => {
          // Remove nested child objects
          removeRecursive(child.__r3f.objects, child)
          removeRecursive(child.children, child, true)
          // Dispose item
          if (child.dispose && child.type !== 'Scene') child.dispose()
          else if (child.__r3f.dispose) child.__r3f.dispose()
          // Remove references
          delete (child as any).__r3f.root
          delete (child as any).__r3f.objects
          delete child.__r3f.handlers
          delete child.__r3f.dispose
          delete (child as any).__r3f
        })
      }
    }
  }

  function switchInstance(instance: Instance, type: string, newProps: InstanceProps, fiber: Reconciler.Fiber) {
    const parent = instance.parent
    if (!parent) return

    const newInstance = createInstance(type, newProps, instance.__r3f.root)
    removeChild(parent, instance)
    appendChild(parent, newInstance)
    // This evil hack switches the react-internal fiber node
    // https://github.com/facebook/react/issues/14983
    // https://github.com/facebook/react/pull/15021
    ;[fiber, fiber.alternate].forEach((fiber) => {
      if (fiber !== null) {
        fiber.stateNode = newInstance
        if (fiber.ref) {
          if (typeof fiber.ref === 'function') fiber.ref(newInstance)
          else (fiber.ref as Reconciler.RefObject).current = newInstance
        }
      }
    })
  }

  const reconciler = Reconciler({
    now,
    createInstance,
    removeChild,
    appendChild,
    appendInitialChild: appendChild,
    insertBefore,
    warnsIfNotActing: true,
    supportsMutation: true,
    isPrimaryRenderer: false,
    // @ts-ignore
    scheduleTimeout: is.fun(setTimeout) ? setTimeout : undefined,
    // @ts-ignore
    cancelTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
    // @ts-ignore
    setTimeout: is.fun(setTimeout) ? setTimeout : undefined,
    // @ts-ignore
    clearTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
    noTimeout: -1,
    appendChildToContainer: (parentInstance: UseStore<RootState>, child: Instance) => {
      const scene = parentInstance.getState().scene
      // Link current root to the default scene
      scene.__r3f.root = parentInstance
      appendChild(scene, child)
    },
    removeChildFromContainer: (parentInstance: UseStore<RootState>, child: Instance) => {
      removeChild(parentInstance.getState().scene, child)
    },
    insertInContainerBefore: (parentInstance: UseStore<RootState>, child: Instance, beforeChild: Instance) => {
      insertBefore(parentInstance.getState().scene, child, beforeChild)
    },
    commitUpdate(
      instance: Instance,
      updatePayload: any,
      type: string,
      oldProps: InstanceProps,
      newProps: InstanceProps,
      fiber: Reconciler.Fiber,
    ) {
      if (instance.__instance && newProps.object && newProps.object !== instance) {
        // <instance object={...} /> where the object reference has changed
        switchInstance(instance, type, newProps, fiber)
      } else {
        // This is a data object, let's extract critical information about it
        const { args: argsNew = [], ...restNew } = newProps
        const { args: argsOld = [], ...restOld } = oldProps
        // If it has new props or arguments, then it needs to be re-instanciated
        const hasNewArgs = argsNew.some((value: any, index: number) =>
          is.obj(value)
            ? Object.entries(value).some(([key, val]) => val !== argsOld[index][key])
            : value !== argsOld[index],
        )
        if (hasNewArgs) {
          // Next we create a new instance and append it again
          switchInstance(instance, type, newProps, fiber)
        } else {
          // Otherwise just overwrite props
          applyProps(instance, restNew, restOld, true)
        }
      }
    },
    hideInstance(instance: Instance) {
      if (instance.isObject3D) {
        instance.visible = false
        invalidateInstance(instance)
      }
    },
    // @ts-ignore
    unhideInstance(instance: Instance, props: InstanceProps) {
      if ((instance.isObject3D && props.visible == null) || props.visible) {
        instance.visible = true
        invalidateInstance(instance)
      }
    },
    hideTextInstance() {
      throw new Error('Text is not allowed in the react-three-fiber tree.')
    },
    getPublicInstance(instance: Instance) {
      // TODO: might fix switchInstance (?)
      return instance
    },
    getRootHostContext() {
      return emptyObject
    },
    getChildHostContext() {
      return emptyObject
    },
    createTextInstance() {},
    finalizeInitialChildren(instance: Instance) {
      // https://github.com/facebook/react/issues/20271
      // Returning true will trigger commitMount
      return !!instance.__r3f.handlers
    },
    commitMount(instance: Instance /*, type, props*/) {
      // https://github.com/facebook/react/issues/20271
      // This will make sure events are only added once to the central container
      if (instance.raycast && instance.__r3f.handlers)
        instance.__r3f.root.getState().internal.interaction.push((instance as unknown) as THREE.Object3D)
    },
    prepareUpdate() {
      return emptyObject
    },
    shouldDeprioritizeSubtree() {
      return false
    },
    prepareForCommit() {
      return null
    },
    preparePortalMount() {
      return null
    },
    resetAfterCommit() {},
    shouldSetTextContent() {
      return false
    },
    clearContainer() {
      return false
    },
  })

  return { reconciler, applyProps }
}

export { createRenderer, extend }
