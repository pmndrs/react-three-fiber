import * as THREE from 'three'
import Reconciler from 'react-reconciler'
import { UseStore } from 'zustand'
import { unstable_now as now, unstable_IdlePriority as idlePriority, unstable_runWithPriority as run } from 'scheduler'
import { is } from './is'
import { RootState } from './store'
import { EventHandlers, removeInteractivity } from './events'

export type Root = { fiber: Reconciler.FiberRoot; store: UseStore<RootState> }

export type LocalState = {
  root: UseStore<RootState>
  // objects and parent are used when children are added with `attach` instead of being added to the Object3D scene graph
  objects: Instance[]
  parent: Instance | null
  primitive?: boolean
  handlers: { count: number } & Partial<EventHandlers>
  memoizedProps: {
    [key: string]: any
  }
}

export type ClassConstructor = {
  new (): void
}

export type AttachFnType = (self: Instance, parent: Instance) => void
export type AttachFnsType = [attach: string | AttachFnType, detach: string | AttachFnType]

// This type clamps down on a couple of assumptions that we can make regarding native types, which
// could anything from scene objects, THREE.Objects, JSM, user-defined classes and non-scene objects.
// What they all need to have in common is defined here ...
export type BaseInstance = Omit<THREE.Object3D, 'children' | 'attach' | 'add' | 'remove' | 'raycast'> & {
  __r3f: LocalState
  children: Instance[]
  attach?: string
  attachFns?: AttachFnsType
  remove: (...object: Instance[]) => Instance
  add: (...object: Instance[]) => Instance
  raycast?: (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void
}
export type Instance = BaseInstance & { [key: string]: any }

export type InstanceProps = {
  [key: string]: unknown
} & {
  args?: any[]
  object?: object
  visible?: boolean
  dispose?: null
  attach?: string
}

export type DiffSet = {
  accumulative: boolean
  memoized: { [key: string]: any }
  changes: [key: string, value: unknown, isEvent: boolean, instance: Instance, prop: any][]
}

export const isDiffSet = (def: any): def is DiffSet => def && !!(def as DiffSet).memoized && !!(def as DiffSet).changes

interface Catalogue {
  [name: string]: {
    new (...args: any): Instance
  }
}

// Type guard to tell a store from a portal
const isStore = (def: any): def is UseStore<RootState> => def && !!(def as UseStore<RootState>).getState
const getContainer = (container: UseStore<RootState> | Instance, child: Instance) => ({
  // If the container is not a root-store then it must be a THREE.Object3D into which part of the
  // scene is portalled into. Now there can be two variants of this, either that object is part of
  // the regular jsx tree, in which case it already has __r3f with a valid root attached, or it lies
  // outside react, in which case we must take the root of the child that is about to be attached to it.
  root: isStore(container) ? container : container.__r3f?.root ?? child.__r3f.root,
  // The container is the eventual target into which objects are mounted, it has to be a THREE.Object3D
  container: isStore(container) ? ((container.getState().scene as unknown) as Instance) : container,
})

const DEFAULT = '__default'
const EMPTY = {}

let catalogue: Catalogue = {}
let extend = (objects: object): void => void (catalogue = { ...catalogue, ...objects })

// Shallow check arrays, but check objects atomically
function checkShallow(a: any, b: any) {
  if (is.arr(a) && is.equ(a, b)) return true
  if (a === b) return true
  return false
}

// Each object in the scene carries a small LocalState descriptor
function prepare<T = THREE.Object3D>(object: T, state?: Partial<LocalState>) {
  const instance = (object as unknown) as Instance
  if (state?.primitive || !instance.__r3f) {
    instance.__r3f = {
      root: (null as unknown) as UseStore<RootState>,
      memoizedProps: {},
      handlers: { count: 0 },
      objects: [],
      parent: null,
      ...state,
    }
  }
  return object
}

function createRenderer<TCanvas>(roots: Map<TCanvas, Root>) {
  // This function prepares a set of changes to be applied to the instance
  function diffProps(
    instance: Instance,
    { children: cN, key: kN, ref: rN, ...props }: InstanceProps,
    { children: cP, key: kP, ref: rP, ...previous }: InstanceProps = {},
    accumulative = false,
  ): DiffSet {
    const localState = (instance?.__r3f ?? {}) as LocalState
    const entries = Object.entries(props)
    const changes: [key: string, value: unknown, isEvent: boolean, instance: Instance, prop: any][] = []

    // Catch removed props, prepend them so they can be reset or removed
    if (accumulative) {
      const previousKeys = Object.keys(previous)
      for (let i = 0; i < previousKeys.length; i++)
        if (!props.hasOwnProperty(previousKeys[i])) entries.unshift([previousKeys[i], DEFAULT + 'remove'])
    }

    entries.forEach(([key, value]) => {
      // Bail out on primitive object
      if (instance.__r3f?.primitive && key === 'object') return
      // When props match bail out
      if (checkShallow(value, previous[key])) return

      let currentInstance = instance
      let targetProp = currentInstance[key]

      // Collect handlers and bail out
      if (/^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/.test(key))
        return changes.push([key, value, true, currentInstance, targetProp])

      // Revolve dashed props
      if (key.includes('-')) {
        const entries = key.split('-')
        targetProp = entries.reduce((acc, key) => acc[key], instance)
        // If the target is atomic, it forces us to switch the root
        if (!(targetProp && targetProp.set)) {
          const [name, ...reverseEntries] = entries.reverse()
          currentInstance = reverseEntries.reverse().reduce((acc, key) => acc[key], instance)
          key = name
        }
      }
      changes.push([key, value, false, currentInstance, targetProp])
    })

    const memoized: { [key: string]: any } = { ...props }
    if (localState.memoizedProps && localState.memoizedProps.args) memoized.args = localState.memoizedProps.args
    if (localState.memoizedProps && localState.memoizedProps.attach) memoized.attach = localState.memoizedProps.attach

    return { accumulative, memoized, changes }
  }

  function applyProps(instance: Instance, data: InstanceProps | DiffSet) {
    // Filter equals, events and reserved props
    const localState = (instance?.__r3f ?? {}) as LocalState
    const root = localState.root
    const rootState = root?.getState?.() ?? {}
    const { memoized, changes } = isDiffSet(data) ? data : diffProps(instance, data)
    const prevHandlers = localState.handlers?.count

    // Prepare memoized props
    if (instance.__r3f) instance.__r3f.memoizedProps = memoized

    changes.forEach(([key, value, isEvent, currentInstance, targetProp]) => {
      // https://github.com/mrdoob/three.js/issues/21209
      // HMR/fast-refresh relies on the ability to cancel out props, but threejs
      // has no means to do this. Hence we curate a small collection of value-classes
      // with their respective constructor/set arguments
      // For removed props, try to set default values, if possible
      if (value === DEFAULT + 'remove') {
        if (targetProp && targetProp.constructor) {
          // use the prop constructor to find the default it should be
          value = new targetProp.constructor(memoized.args)
        } else if (currentInstance.constructor) {
          // create a blank slate of the instance and copy the particular parameter.
          // @ts-ignore
          const defaultClassCall = new currentInstance.constructor(currentInstance.__r3f.memoizedProps.args)
          value = defaultClassCall[targetProp]
          // destory the instance
          if (defaultClassCall.dispose) defaultClassCall.dispose()
          // instance does not have constructor, just set it to 0
        } else value = 0
      }

      // Deal with pointer events ...
      if (isEvent) {
        if (value) localState.handlers[key as keyof EventHandlers] = value as any
        else delete localState.handlers[key as keyof EventHandlers]
        localState.handlers.count = Object.keys(localState.handlers).length
      }
      // Special treatment for objects with support for set/copy, and layers
      else if (targetProp && targetProp.set && (targetProp.copy || targetProp instanceof THREE.Layers)) {
        // If value is an array
        if (Array.isArray(value)) {
          if (targetProp.fromArray) targetProp.fromArray(value)
          else targetProp.set(...value)
        }
        // Test again target.copy(class) next ...
        else if (
          targetProp.copy &&
          value &&
          (value as ClassConstructor).constructor &&
          targetProp.constructor.name === (value as ClassConstructor).constructor.name
        )
          targetProp.copy(value)
        // If nothing else fits, just set the single value, ignore undefined
        // https://github.com/react-spring/react-three-fiber/issues/274
        else if (value !== undefined) {
          const isColor = targetProp instanceof THREE.Color
          // Allow setting array scalars
          if (!isColor && targetProp.setScalar) targetProp.setScalar(value)
          // Layers have no copy function, we must therefore copy the mask property
          else if (targetProp instanceof THREE.Layers && value instanceof THREE.Layers) targetProp.mask = value.mask
          // Otherwise just set ...
          else targetProp.set(value)
          // Auto-convert sRGB colors, for now ...
          // https://github.com/react-spring/react-three-fiber/issues/344
          if (!rootState.linear && isColor) targetProp.convertSRGBToLinear()
        }
        // Else, just overwrite the value
      } else {
        currentInstance[key] = value
        // Auto-convert sRGB textures, for now ...
        // https://github.com/react-spring/react-three-fiber/issues/344
        if (!rootState.linear && currentInstance[key] instanceof THREE.Texture)
          currentInstance[key].encoding = THREE.sRGBEncoding
      }

      invalidateInstance(instance)
    })

    if (rootState.internal && instance.raycast && prevHandlers !== localState.handlers?.count) {
      // Pre-emptively remove the instance from the interaction manager
      const index = rootState.internal.interaction.indexOf((instance as unknown) as THREE.Object3D)
      if (index > -1) rootState.internal.interaction.splice(index, 1)
      // Add the instance to the interaction manager only when it has handlers
      if (localState.handlers.count) rootState.internal.interaction.push((instance as unknown) as THREE.Object3D)
    }

    // Call the update lifecycle when it is being updated
    if (changes.length && instance.__r3f?.parent) updateInstance(instance)
  }

  function invalidateInstance(instance: Instance) {
    const state = instance.__r3f?.root?.getState?.()
    if (state && state.internal.frames === 0) state.invalidate()
  }

  function updateInstance(instance: Instance) {
    instance.onUpdate?.(instance)
  }

  function createInstance(
    type: string,
    { args = [], ...props }: InstanceProps,
    root: UseStore<RootState> | Instance,
    hostContext?: any,
    internalInstanceHandle?: Reconciler.Fiber,
  ) {
    let name = `${type[0].toUpperCase()}${type.slice(1)}`
    let instance: Instance

    // https://github.com/facebook/react/issues/17147
    // Portals do not give us a root, they are themselves treated as a root by the reconciler
    // In order to figure out the actual root we have to climb through fiber internals :(
    if (!isStore(root) && internalInstanceHandle) {
      const fn = (node: Reconciler.Fiber): UseStore<RootState> => {
        if (!node.return) return node.stateNode && node.stateNode.containerInfo
        else return fn(node.return)
      }
      root = fn(internalInstanceHandle)
    }
    // Assert that by now we have a valid root
    if (!root || !isStore(root)) throw `No valid root for ${name}!`

    if (type === 'primitive') {
      if (props.object === undefined) throw `Primitives without 'object' are invalid!`
      const object = props.object as Instance
      instance = prepare<Instance>(object, { root, primitive: true })
    } else {
      const target = catalogue[name] || (THREE as any)[name]
      if (!target)
        throw `${name} is not part of the THREE namespace! Did you forget to extend? See: https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#using-3rd-party-objects-declaratively`

      const isArgsArr = is.arr(args)
      // Instanciate new object, link it to the root
      instance = prepare(isArgsArr ? new target(...args) : new target(args), {
        root,
        // append memoized props with args so it's not forgotten
        memoizedProps: {
          args: isArgsArr && args.length === 0 ? null : args,
        },
      })
    }

    // Auto-attach geometries and materials
    if (!('attachFns' in props)) {
      if (name.endsWith('Geometry')) {
        props = { attach: 'geometry', ...props }
      } else if (name.endsWith('Material')) {
        props = { attach: 'material', ...props }
      }
    }

    // It should NOT call onUpdate on object instanciation, because it hasn't been added to the
    // view yet. If the callback relies on references for instance, they won't be ready yet, this is
    // why it passes "true" here
    applyProps(instance, props)
    return instance
  }

  function appendChild(parentInstance: Instance, child: Instance) {
    let addedAsChild = false
    if (child) {
      // The attach attribute implies that the object attaches itself on the parent
      if (child.attachArray) {
        if (!is.arr(parentInstance[child.attachArray])) parentInstance[child.attachArray] = []
        parentInstance[child.attachArray].push(child)
      } else if (child.attachObject) {
        if (!is.obj(parentInstance[child.attachObject[0]])) parentInstance[child.attachObject[0]] = {}
        parentInstance[child.attachObject[0]][child.attachObject[1]] = child
      } else if (child.attach && !is.fun(child.attach)) {
        parentInstance[child.attach] = child
      } else if (is.arr(child.attachFns)) {
        const [attachFn] = child.attachFns as AttachFnsType
        if (is.str(attachFn) && is.fun(parentInstance[attachFn])) {
          parentInstance[attachFn](child)
        } else if (is.fun(attachFn)) {
          attachFn(child, parentInstance)
        }
      } else if (child.isObject3D && parentInstance.isObject3D) {
        // add in the usual parent-child way
        parentInstance.add(child)
        addedAsChild = true
      }

      if (!addedAsChild) {
        // This is for anything that used attach, and for non-Object3Ds that don't get attached to props;
        // that is, anything that's a child in React but not a child in the scenegraph.
        parentInstance.__r3f.objects.push(child)
      }
      if (!child.__r3f) {
        prepare(child, {})
      }
      child.__r3f.parent = parentInstance
      updateInstance(child)
      invalidateInstance(child)
    }
  }

  function insertBefore(parentInstance: Instance, child: Instance, beforeChild: Instance) {
    let added = false
    if (child) {
      if (child.attachArray) {
        const array = parentInstance[child.attachArray]
        if (!is.arr(array)) parentInstance[child.attachArray] = []
        array.splice(array.indexOf(beforeChild), 0, child)
      } else if (child.attachObject || (child.attach && !is.fun(child.attach))) {
        // attach and attachObject don't have an order anyway, so just append
        return appendChild(parentInstance, child)
      } else if (child.isObject3D && parentInstance.isObject3D) {
        child.parent = (parentInstance as unknown) as THREE.Object3D
        child.dispatchEvent({ type: 'added' })
        const restSiblings = parentInstance.children.filter((sibling) => sibling !== child)
        const index = restSiblings.indexOf(beforeChild)
        parentInstance.children = [...restSiblings.slice(0, index), child, ...restSiblings.slice(index)]
        added = true
      }

      if (!added) {
        parentInstance.__r3f.objects.push(child)
      }
      if (!child.__r3f) {
        prepare(child, {})
      }
      child.__r3f.parent = parentInstance
      updateInstance(child)
      invalidateInstance(child)
    }
  }

  function removeRecursive(array: Instance[], parent: Instance, dispose: boolean = false) {
    if (array) [...array].forEach((child) => removeChild(parent, child, dispose))
  }

  function removeChild(parentInstance: Instance, child: Instance, dispose?: boolean) {
    if (child) {
      if (child.__r3f) {
        child.__r3f.parent = null
      }

      if (parentInstance.__r3f.objects) {
        parentInstance.__r3f.objects = parentInstance.__r3f.objects.filter((x) => x !== child)
      }

      // Remove attachment
      if (child.attachArray) {
        parentInstance[child.attachArray] = parentInstance[child.attachArray].filter((x: Instance) => x !== child)
      } else if (child.attachObject) {
        delete parentInstance[child.attachObject[0]][child.attachObject[1]]
      } else if (child.attach && !is.fun(child.attach)) {
        parentInstance[child.attach] = null
      } else if (is.arr(child.attachFns)) {
        const [, detachFn] = child.attachFns as AttachFnsType
        if (is.str(detachFn) && is.fun(parentInstance[detachFn])) {
          parentInstance[detachFn](child)
        } else if (is.fun(detachFn)) {
          detachFn(child, parentInstance)
        }
      } else if (child.isObject3D) {
        parentInstance.remove(child)
        // Remove interactivity
        if (child.__r3f?.root) {
          removeInteractivity(child.__r3f.root, (child as unknown) as THREE.Object3D)
        }
      }

      // Allow objects to bail out of recursive dispose alltogether by passing dispose={null}
      // Never dispose of primitives because their state may be kept outside of React!
      // In order for an object to be able to dispose it has to have
      //   - a dispose method,
      //   - it cannot be a <primitive object={...} />
      //   - it cannot be a THREE.Scene, because three has broken it's own api
      //
      // Since disposal is recursive, we can check the optional dispose arg, which will be undefined
      // when the reconciler calls it, but then carry our own check recursively
      const isPrimitive = child.__r3f?.primitive
      const shouldDispose = dispose === undefined ? child.dispose !== null && !isPrimitive : dispose

      // Remove nested child objects. Primitives should not have objects and children that are
      // attached to them declaratively ...
      if (!isPrimitive) {
        removeRecursive(child.__r3f?.objects, child, shouldDispose)
        removeRecursive(child.children, child, shouldDispose)
      }

      // Remove references
      if (child.__r3f) {
        delete ((child as Partial<Instance>).__r3f as Partial<LocalState>).root
        delete ((child as Partial<Instance>).__r3f as Partial<LocalState>).objects
        delete ((child as Partial<Instance>).__r3f as Partial<LocalState>).handlers
        delete ((child as Partial<Instance>).__r3f as Partial<LocalState>).memoizedProps
        if (!isPrimitive) delete (child as Partial<Instance>).__r3f
      }

      // Dispose item whenever the reconciler feels like it
      if (shouldDispose && child.dispose && child.type !== 'Scene') {
        run(idlePriority, () => {
          try {
            child.dispose()
          } catch (e) {
            /* ... */
          }
        })
      }

      invalidateInstance(parentInstance)
    }
  }

  function switchInstance(instance: Instance, type: string, newProps: InstanceProps, fiber: Reconciler.Fiber) {
    const parent = instance.__r3f?.parent
    if (!parent) return

    const newInstance = createInstance(type, newProps, instance.__r3f.root)

    // https://github.com/pmndrs/react-three-fiber/issues/1348
    // When args change the instance has to be re-constructed, which then
    // forces r3f to re-parent the children and non-scene objects

    if (instance.children) {
      instance.children.forEach((child) => appendChild(newInstance, child))
      instance.children = []
    }

    instance.__r3f.objects.forEach((child) => appendChild(newInstance, child))
    instance.__r3f.objects = []

    removeChild(parent, instance)
    appendChild(parent, newInstance)

    // This evil hack switches the react-internal fiber node
    // https://github.com/facebook/react/issues/14983
    // https://github.com/facebook/react/pull/15021
    ;[fiber, fiber.alternate].forEach((fiber) => {
      if (fiber !== null) {
        fiber.stateNode = newInstance
        if (fiber.ref) {
          if (typeof fiber.ref === 'function') ((fiber as unknown) as any).ref(newInstance)
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
    appendChildToContainer: (parentInstance: UseStore<RootState> | Instance, child: Instance) => {
      const { container, root } = getContainer(parentInstance, child)
      // Link current root to the default scene
      container.__r3f.root = root
      appendChild(container, child)
    },
    removeChildFromContainer: (parentInstance: UseStore<RootState> | Instance, child: Instance) =>
      removeChild(getContainer(parentInstance, child).container, child),
    insertInContainerBefore: (parentInstance: UseStore<RootState> | Instance, child: Instance, beforeChild: Instance) =>
      insertBefore(getContainer(parentInstance, child).container, child, beforeChild),
    prepareUpdate(instance: Instance, type: string, oldProps: any, newProps: any) {
      if (instance.__r3f.primitive && newProps.object && newProps.object !== instance) return [true]
      else {
        // This is a data object, let's extract critical information about it
        const { args: argsNew = [], children: cN, ...restNew } = newProps
        const { args: argsOld = [], children: cO, ...restOld } = oldProps
        // If it has new props or arguments, then it needs to be re-instanciated
        if (argsNew.some((value: any, index: number) => value !== argsOld[index])) return [true]
        // Create a diff-set, flag if there are any changes
        const diff = diffProps(instance, restNew, restOld, true)
        if (diff.changes.length) return [false, diff]
        // Otherwise do not touch the instance
        return null
      }
    },
    commitUpdate(
      instance: Instance,
      [reconstruct, diff]: [boolean, DiffSet],
      type: string,
      oldProps: InstanceProps,
      newProps: InstanceProps,
      fiber: Reconciler.Fiber,
    ) {
      //console.log(type)
      // Reconstruct when args or <primitive object={...} have changes
      if (reconstruct) switchInstance(instance, type, newProps, fiber)
      // Otherwise just overwrite props
      else applyProps(instance, diff)
    },
    hideInstance(instance: Instance) {
      if (instance.isObject3D) {
        instance.visible = false
        invalidateInstance(instance)
      }
    },
    unhideInstance(instance: Instance, props: InstanceProps) {
      if ((instance.isObject3D && props.visible == null) || props.visible) {
        instance.visible = true
        invalidateInstance(instance)
      }
    },
    hideTextInstance() {
      throw new Error('Text is not allowed in the R3F tree.')
    },
    getPublicInstance(instance: Instance) {
      // TODO: might fix switchInstance (?)
      return instance
    },
    getRootHostContext(rootContainer: UseStore<RootState> | Instance) {
      return EMPTY
    },
    getChildHostContext(parentHostContext: any) {
      return parentHostContext
    },
    createTextInstance() {},
    finalizeInitialChildren() {
      return false
    },
    commitMount() {
      // noop
    },
    shouldDeprioritizeSubtree() {
      return false
    },
    prepareForCommit() {
      return null
    },
    preparePortalMount(containerInfo: any) {
      prepare(containerInfo)
    },
    resetAfterCommit() {
      // noop
    },
    shouldSetTextContent() {
      return false
    },
    clearContainer() {
      return false
    },
  })

  return { reconciler, applyProps }
}

export { prepare, createRenderer, extend }
