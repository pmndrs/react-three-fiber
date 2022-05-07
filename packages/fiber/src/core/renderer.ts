import * as THREE from 'three'
import { UseBoundStore } from 'zustand'
import Reconciler from 'react-reconciler'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import { DefaultEventPriority } from 'react-reconciler/constants'
import {
  is,
  prepare,
  diffProps,
  DiffSet,
  applyProps,
  updateInstance,
  invalidateInstance,
  attach,
  detach,
} from './utils'
import { RootState } from './store'
import { EventHandlers, removeInteractivity } from './events'

export type Root = { fiber: Reconciler.FiberRoot; store: UseBoundStore<RootState> }

export type LocalState = {
  type: string
  root: UseBoundStore<RootState>
  // objects and parent are used when children are added with `attach` instead of being added to the Object3D scene graph
  objects: Instance[]
  parent: Instance | null
  primitive?: boolean
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType
  previousAttach: any
  memoizedProps: { [key: string]: any }
}

export type AttachFnType = (parent: Instance, self: Instance) => () => void
export type AttachType = string | AttachFnType

// This type clamps down on a couple of assumptions that we can make regarding native types, which
// could anything from scene objects, THREE.Objects, JSM, user-defined classes and non-scene objects.
// What they all need to have in common is defined here ...
export type BaseInstance = Omit<THREE.Object3D, 'children' | 'attach' | 'add' | 'remove' | 'raycast'> & {
  __r3f: LocalState
  children: Instance[]
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
  attach?: AttachType
}

interface Catalogue {
  [name: string]: {
    new (...args: any): Instance
  }
}

let catalogue: Catalogue = {}
let extend = (objects: object): void => void (catalogue = { ...catalogue, ...objects })

function createRenderer<TCanvas>(roots: Map<TCanvas, Root>, getEventPriority?: () => any) {
  function createInstance(
    type: string,
    { args = [], attach, ...props }: InstanceProps,
    root: UseBoundStore<RootState>,
  ) {
    let name = `${type[0].toUpperCase()}${type.slice(1)}`
    let instance: Instance

    // Auto-attach geometries and materials
    if (attach === undefined) {
      if (name.endsWith('Geometry')) attach = 'geometry'
      else if (name.endsWith('Material')) attach = 'material'
    }

    if (type === 'primitive') {
      if (props.object === undefined) throw `Primitives without 'object' are invalid!`
      const object = props.object as Instance
      instance = prepare<Instance>(object, { type, root, attach, primitive: true })
    } else {
      const target = catalogue[name]
      if (!target) {
        throw `${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`
      }

      // Throw if an object or literal was passed for args
      if (!Array.isArray(args)) throw 'The args prop must be an array!'

      // Instanciate new object, link it to the root
      // Append memoized props with args so it's not forgotten
      instance = prepare(new target(...args), {
        type,
        root,
        attach,
        // TODO: Figure out what this is for
        memoizedProps: { args },
      })
    }

    // It should NOT call onUpdate on object instanciation, because it hasn't been added to the
    // view yet. If the callback relies on references for instance, they won't be ready yet, this is
    // why it passes "true" here
    // There is no reason to apply props to injects
    if (name !== 'inject') applyProps(instance, props)
    return instance
  }

  function appendChild(parentInstance: Instance, child: Instance) {
    let added = false
    if (child) {
      // The attach attribute implies that the object attaches itself on the parent
      if (child.__r3f?.attach) {
        attach(parentInstance, child, child.__r3f.attach)
      } else if (child.isObject3D && parentInstance.isObject3D) {
        // add in the usual parent-child way
        parentInstance.add(child)
        added = true
      }
      // This is for anything that used attach, and for non-Object3Ds that don't get attached to props;
      // that is, anything that's a child in React but not a child in the scenegraph.
      if (!added) parentInstance.__r3f?.objects.push(child)
      if (!child.__r3f) prepare(child, {})
      child.__r3f.parent = parentInstance
      updateInstance(child)
      invalidateInstance(child)
    }
  }

  function insertBefore(parentInstance: Instance, child: Instance, beforeChild: Instance) {
    let added = false
    if (child) {
      if (child.__r3f?.attach) {
        attach(parentInstance, child, child.__r3f.attach)
      } else if (child.isObject3D && parentInstance.isObject3D) {
        child.parent = parentInstance as unknown as THREE.Object3D
        child.dispatchEvent({ type: 'added' })
        const restSiblings = parentInstance.children.filter((sibling) => sibling !== child)
        const index = restSiblings.indexOf(beforeChild)
        parentInstance.children = [...restSiblings.slice(0, index), child, ...restSiblings.slice(index)]
        added = true
      }

      if (!added) parentInstance.__r3f?.objects.push(child)
      if (!child.__r3f) prepare(child, {})
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
      // Clear the parent reference
      if (child.__r3f) child.__r3f.parent = null
      // Remove child from the parents objects
      if (parentInstance.__r3f?.objects)
        parentInstance.__r3f.objects = parentInstance.__r3f.objects.filter((x) => x !== child)
      // Remove attachment
      if (child.__r3f?.attach) {
        detach(parentInstance, child, child.__r3f.attach)
      } else if (child.isObject3D && parentInstance.isObject3D) {
        parentInstance.remove(child)
        // Remove interactivity
        if (child.__r3f?.root) {
          removeInteractivity(child.__r3f.root, child as unknown as THREE.Object3D)
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
        scheduleCallback(idlePriority, () => {
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

    const newInstance = createInstance(type, newProps, instance.__r3f?.root)

    // https://github.com/pmndrs/react-three-fiber/issues/1348
    // When args change the instance has to be re-constructed, which then
    // forces r3f to re-parent the children and non-scene objects
    // This can not include primitives, which should not have declarative children
    if (type !== 'primitive' && instance.children) {
      instance.children.forEach((child) => appendChild(newInstance, child))
      instance.children = []
    }

    instance.__r3f.objects.forEach((child) => appendChild(newInstance, child))
    instance.__r3f.objects = []

    removeChild(parent, instance)
    appendChild(parent, newInstance)

    // Re-bind event handlers
    if (newInstance.raycast && newInstance.__r3f.eventCount) {
      const rootState = newInstance.__r3f.root.getState()
      rootState.internal.interaction.push(newInstance as unknown as THREE.Object3D)
    }

    // This evil hack switches the react-internal fiber node
    // https://github.com/facebook/react/issues/14983
    // https://github.com/facebook/react/pull/15021
    ;[fiber, fiber.alternate].forEach((fiber) => {
      if (fiber !== null) {
        fiber.stateNode = newInstance
        if (fiber.ref) {
          if (typeof fiber.ref === 'function') (fiber as unknown as any).ref(newInstance)
          else (fiber.ref as Reconciler.RefObject).current = newInstance
        }
      }
    })
  }

  const reconciler = Reconciler({
    createInstance,
    removeChild,
    appendChild,
    appendInitialChild: appendChild,
    insertBefore,
    supportsMicrotask: true,
    warnsIfNotActing: true,
    supportsMutation: true,
    isPrimaryRenderer: false,
    noTimeout: -1,
    appendChildToContainer: (container: UseBoundStore<RootState>, child: Instance) => {
      const scene = container.getState().scene as unknown as Instance
      // Link current root to the default scene
      scene.__r3f.root = container
      appendChild(scene, child)
    },
    removeChildFromContainer: (container: UseBoundStore<RootState>, child: Instance) =>
      removeChild(container.getState().scene as unknown as Instance, child),
    insertInContainerBefore: (container: UseBoundStore<RootState>, child: Instance, beforeChild: Instance) =>
      insertBefore(container.getState().scene as unknown as Instance, child, beforeChild),
    getRootHostContext: () => null,
    getChildHostContext: (parentHostContext: any) => parentHostContext,
    finalizeInitialChildren(instance: Instance) {
      const localState = (instance?.__r3f ?? {}) as LocalState
      // https://github.com/facebook/react/issues/20271
      // Returning true will trigger commitMount
      return !!localState.handlers
    },
    prepareUpdate(instance: Instance, type: string, oldProps: any, newProps: any) {
      // Create diff-sets
      if (instance.__r3f.primitive && newProps.object && newProps.object !== instance) {
        return [true]
      } else {
        // This is a data object, let's extract critical information about it
        const { args: argsNew = [], children: cN, ...restNew } = newProps
        const { args: argsOld = [], children: cO, ...restOld } = oldProps

        // Throw if an object or literal was passed for args
        if (!Array.isArray(argsNew)) throw 'The args prop must be an array!'

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
      // Reconstruct when args or <primitive object={...} have changes
      if (reconstruct) switchInstance(instance, type, newProps, fiber)
      // Otherwise just overwrite props
      else applyProps(instance, diff)
    },
    commitMount(instance: Instance, type, props, int) {
      // https://github.com/facebook/react/issues/20271
      // This will make sure events are only added once to the central container
      const localState = (instance?.__r3f ?? {}) as LocalState
      if (instance.raycast && localState.handlers && localState.eventCount) {
        instance.__r3f.root.getState().internal.interaction.push(instance as unknown as THREE.Object3D)
      }
    },
    getPublicInstance: (instance: Instance) => instance,
    shouldDeprioritizeSubtree: () => false,
    prepareForCommit: () => null,
    preparePortalMount: (container: UseBoundStore<RootState>) => prepare(container.getState().scene),
    resetAfterCommit: () => {},
    shouldSetTextContent: () => false,
    clearContainer: () => false,
    detachDeletedInstance: () => {},
    hideInstance(instance: Instance) {
      // Deatch while the instance is hidden
      const { attach: type, parent } = instance?.__r3f ?? {}
      if (type && parent) detach(parent, instance, type)
      if (instance.isObject3D) instance.visible = false
      invalidateInstance(instance)
    },
    unhideInstance(instance: Instance, props: InstanceProps) {
      // Re-attach when the instance is unhidden
      const { attach: type, parent } = instance?.__r3f ?? {}
      if (type && parent) attach(parent, instance, type)
      if ((instance.isObject3D && props.visible == null) || props.visible) instance.visible = true
      invalidateInstance(instance)
    },
    createTextInstance: () => {},
    hideTextInstance: () => {
      throw new Error('Text is not allowed in the R3F tree.')
    },
    unhideTextInstance: () => {},
    getCurrentEventPriority: () => (getEventPriority ? getEventPriority() : DefaultEventPriority),
    // @ts-ignore
    now:
      typeof performance !== 'undefined' && is.fun(performance.now)
        ? performance.now
        : is.fun(Date.now)
        ? Date.now
        : undefined,
    // @ts-ignore
    scheduleTimeout: is.fun(setTimeout) ? setTimeout : undefined,
    // @ts-ignore
    cancelTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
    setTimeout: is.fun(setTimeout) ? setTimeout : undefined,
    clearTimeout: is.fun(clearTimeout) ? clearTimeout : undefined,
  })

  return { reconciler, applyProps }
}

export { prepare, createRenderer, extend }
