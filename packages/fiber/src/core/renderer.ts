import * as THREE from 'three'
import { UseBoundStore } from 'zustand'
import Reconciler from 'react-reconciler'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import { DefaultEventPriority } from 'react-reconciler/constants'
import { is, diffProps, applyProps, invalidateInstance, attach, detach } from './utils'
import { RootState } from './store'
import { EventHandlers, removeInteractivity } from './events'

export type Root = { fiber: Reconciler.FiberRoot; store: UseBoundStore<RootState> }

export type AttachFnType = (parent: any, self: any) => () => void
export type AttachType = string | AttachFnType

export type InstanceProps = {
  [key: string]: unknown
} & {
  args?: any[]
  object?: any
  visible?: boolean
  dispose?: null
  attach?: AttachType
}

export interface Instance {
  root: UseBoundStore<RootState>
  type: string
  parent: Instance | null
  children: Instance[]
  props: InstanceProps
  object: any | null
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType
  previousAttach?: any
}

interface HostConfig {
  type: string
  props: InstanceProps
  container: UseBoundStore<RootState>
  instance: Instance
  textInstance: void
  suspenseInstance: Instance
  hydratableInstance: never
  publicInstance: Instance['object']
  hostContext: never
  updatePayload: null | [true] | [false, InstanceProps]
  childSet: never
  timeoutHandle: number | undefined
  noTimeout: -1
}

interface Catalogue {
  [name: string]: {
    new (...args: any): any
  }
}

const catalogue: Catalogue = {}
const extend = (objects: object): void => void Object.assign(catalogue, objects)

function createRenderer<TCanvas>(_roots: Map<TCanvas, Root>, _getEventPriority?: () => any) {
  function createInstance(
    type: string,
    { args = [], object = null, ...props }: InstanceProps,
    root: UseBoundStore<RootState>,
  ): HostConfig['instance'] {
    const name = `${type[0].toUpperCase()}${type.slice(1)}`
    const target = catalogue[name]

    if (type !== 'primitive' && !target)
      throw new Error(`R3F: ${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`)

    if (type === 'primitive' && !object) throw new Error(`R3F: Primitives without 'object' are invalid!`)

    const instance: HostConfig['instance'] = {
      root,
      type,
      parent: null,
      children: [],
      props: { ...props, args },
      object,
      eventCount: 0,
      handlers: {},
    }

    return instance
  }

  function appendChild(parent: HostConfig['instance'], child: HostConfig['instance'] | HostConfig['textInstance']) {
    if (!child) return

    child.parent = parent
    parent.children.push(child)
  }

  function insertBefore(
    parent: HostConfig['instance'],
    child: HostConfig['instance'] | HostConfig['textInstance'],
    beforeChild: HostConfig['instance'] | HostConfig['textInstance'],
  ) {
    if (!child || !beforeChild) return

    child.parent = parent
    parent.children.splice(parent.children.indexOf(beforeChild), 0, child)
  }

  function removeRecursive(
    children: HostConfig['instance'][],
    parent: HostConfig['instance'],
    dispose: boolean = false,
  ) {
    for (const child of children) {
      removeChild(parent, child, dispose)
    }
  }

  function removeChild(
    parent: HostConfig['instance'],
    child: HostConfig['instance'] | HostConfig['textInstance'],
    dispose?: boolean,
  ) {
    if (!child) return

    child.parent = null
    const childIndex = parent.children.indexOf(child)
    if (childIndex !== -1) parent.children.splice(childIndex, 1)

    if (child.props.attach) {
      detach(parent, child)
    } else if (child.object.isObject3D && parent.object.isObject3D) {
      parent.object.remove(child.object)
      removeInteractivity(child.root, child.object as unknown as THREE.Object3D)
    }

    // Allow objects to bail out of recursive dispose altogether by passing dispose={null}
    // Never dispose of primitives because their state may be kept outside of React!
    // In order for an object to be able to dispose it has to have
    //   - a dispose method,
    //   - it cannot be a <primitive object={...} />
    //   - it cannot be a THREE.Scene, because three has broken its own api
    //
    // Since disposal is recursive, we can check the optional dispose arg, which will be undefined
    // when the reconciler calls it, but then carry our own check recursively
    const isPrimitive = child.type === 'primitive'
    const shouldDispose = dispose ?? (!isPrimitive && child.props.dispose !== null)

    // Remove nested child objects. Primitives should not have objects and children that are
    // attached to them declaratively ...
    if (!isPrimitive) removeRecursive(child.children, child, shouldDispose)

    // Dispose object whenever the reconciler feels like it
    if (child.type !== 'scene' && shouldDispose) {
      const dispose = child.object.dispose
      if (typeof dispose === 'function') {
        scheduleCallback(idlePriority, () => {
          try {
            dispose()
          } catch (e) {
            /* ... */
          }
        })
      }
    }
    delete child.object.__r3f
    child.object = null

    if (dispose === undefined) invalidateInstance(child)
  }

  function commitInstance(instance: HostConfig['instance']) {
    // Create object
    if (instance.type !== 'primitive') {
      const name = `${instance.type[0].toUpperCase()}${instance.type.slice(1)}`
      const target = catalogue[name]

      const { args = [] } = instance.props
      instance.object = new target(...args)
    }

    // Attach object instance handle
    instance.object.__r3f = instance

    // Don't handle children for containers
    if (!instance.parent) return

    // Auto-attach geometry and materials to meshes
    if (!instance.props.attach) {
      if (instance.type.endsWith('Geometry')) instance.props.attach = 'geometry'
      else if (instance.type.endsWith('Material')) instance.props.attach = 'material'
    }

    // Append children
    for (const child of instance.children) {
      if (child.props.attach) {
        attach(instance, child)
      } else if (child.object.isObject3D && instance.object.isObject3D) {
        instance.object.add(child.object)
      }
    }

    // Append to parent
    if (instance.parent.object) {
      if (instance.props.attach) {
        attach(instance.parent, instance)
      } else if (instance.object.isObject3D && instance.parent.object.isObject3D) {
        instance.parent.object.add(instance.object)
      }
    }

    // Apply props to object
    applyProps(instance.object, instance.props)

    invalidateInstance(instance)
  }

  function switchInstance(
    oldInstance: HostConfig['instance'],
    type: HostConfig['type'],
    props: HostConfig['props'],
    fiber: Reconciler.Fiber,
  ) {
    // Create a new instance
    const newInstance = createInstance(type, props, oldInstance.root)

    // Link up new instance
    const parent = oldInstance.parent!
    appendChild(parent, newInstance)

    // Commit new instance object
    commitInstance(newInstance)

    // Append to scene-graph
    if (parent.parent) {
      if (newInstance.props.attach) attach(parent, newInstance)
      else if (newInstance.object.isObject3D) parent.object.add(newInstance.object)
    }

    // Move children to new instance
    for (const child of oldInstance.children) {
      appendChild(newInstance, child)
      if (child.props.attach) {
        detach(oldInstance, child)
        attach(newInstance, child)
      } else if (child.object.isObject3D && oldInstance.object.isObject3D) {
        oldInstance.object.remove(child.object)
        newInstance.object.add(child.object)
      }
    }

    // Cleanup old instance
    oldInstance.children = []
    removeChild(parent, oldInstance)

    // This evil hack switches the react-internal fiber node
    // https://github.com/facebook/react/issues/14983
    // https://github.com/facebook/react/pull/15021
    ;[fiber, fiber.alternate].forEach((fiber) => {
      if (fiber !== null) {
        fiber.stateNode = newInstance
        if (fiber.ref) {
          if (typeof fiber.ref === 'function') (fiber as unknown as any).ref(newInstance.object)
          else (fiber.ref as Reconciler.RefObject).current = newInstance.object
        }
      }
    })

    return newInstance
  }

  // Don't handle text instances, warn on undefined behavior
  const handleTextInstance = () =>
    console.warn('Text is not allowed in the R3F tree! This could be stray whitespace or characters.')

  const reconciler = Reconciler<
    HostConfig['type'],
    HostConfig['props'],
    HostConfig['container'],
    HostConfig['instance'],
    HostConfig['textInstance'],
    HostConfig['suspenseInstance'],
    HostConfig['hydratableInstance'],
    HostConfig['publicInstance'],
    HostConfig['hostContext'],
    HostConfig['updatePayload'],
    HostConfig['childSet'],
    HostConfig['timeoutHandle'],
    HostConfig['noTimeout']
  >({
    supportsMutation: true,
    isPrimaryRenderer: false,
    supportsPersistence: false,
    supportsHydration: false,
    noTimeout: -1,
    createInstance,
    removeChild,
    appendChild,
    appendInitialChild: appendChild,
    insertBefore,
    appendChildToContainer: () => {},
    removeChildFromContainer: () => {},
    insertInContainerBefore: () => {},
    getRootHostContext: () => null,
    getChildHostContext: (parentHostContext) => parentHostContext,
    prepareUpdate(instance, _type, oldProps, newProps) {
      // Reconstruct primitives if object prop changes
      if (instance.type === 'primitive' && oldProps.object !== newProps.object) return [true]
      // Reconstruct elements if args change
      if (newProps.args?.some((value, index) => value !== oldProps.args?.[index])) return [true]

      // Create a diff-set, flag if there are any changes
      const changedProps = diffProps(newProps, oldProps, true)
      if (Object.keys(changedProps).length) return [false, changedProps]

      // Otherwise do not touch the instance
      return null
    },
    commitUpdate(instance, diff, type, _oldProps, newProps, fiber) {
      const [reconstruct, changedProps] = diff!

      // Reconstruct when args or <primitive object={...} have changes
      if (reconstruct) return switchInstance(instance, type, newProps, fiber)

      // Otherwise just overwrite props
      Object.assign(instance.props, newProps)
      applyProps(instance.object, changedProps)
    },
    finalizeInitialChildren: () => true,
    commitMount: commitInstance,
    getPublicInstance: (instance) => instance?.object,
    prepareForCommit: () => null,
    preparePortalMount: (container) => container,
    resetAfterCommit: () => {},
    shouldSetTextContent: () => false,
    clearContainer: () => false,
    hideInstance(instance) {
      if (!instance.object) return

      if (instance.props.attach && instance.parent?.object) {
        detach(instance.parent, instance)
      } else if (instance.object.isObject3D) {
        instance.object.visible = false
      }

      invalidateInstance(instance)
    },
    unhideInstance(instance) {
      if (!instance.object) return

      if (instance.props.attach && instance.parent?.object) {
        attach(instance.parent, instance)
      } else if (instance.object.isObject3D && instance.props.visible !== false) {
        instance.object.visible = true
      }

      invalidateInstance(instance)
    },
    createTextInstance: handleTextInstance,
    hideTextInstance: handleTextInstance,
    unhideTextInstance: handleTextInstance,
    // https://github.com/pmndrs/react-three-fiber/pull/2360#discussion_r916356874
    // @ts-ignore
    getCurrentEventPriority: () => (_getEventPriority ? _getEventPriority() : DefaultEventPriority),
    beforeActiveInstanceBlur: () => {},
    afterActiveInstanceBlur: () => {},
    detachDeletedInstance: () => {},
    now:
      typeof performance !== 'undefined' && is.fun(performance.now)
        ? performance.now
        : is.fun(Date.now)
        ? Date.now
        : () => 0,
    // https://github.com/pmndrs/react-three-fiber/pull/2360#discussion_r920883503
    scheduleTimeout: (is.fun(setTimeout) ? setTimeout : undefined) as any,
    cancelTimeout: (is.fun(clearTimeout) ? clearTimeout : undefined) as any,
  })

  return { reconciler, applyProps }
}

export { createRenderer, extend }
