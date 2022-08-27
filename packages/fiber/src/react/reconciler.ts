import {
  appendChild,
  createInstance,
  insertBefore,
  Instance,
  InstanceProps,
  LocalState,
  prepare,
  removeChild,
  Root,
} from '../core/renderer'
import { attach, detach, diffProps, DiffSet, invalidateInstance, is, applyProps } from '../core/utils'
import Reconciler from 'react-reconciler'
import { UseBoundStore } from 'zustand'
import { RootState } from '../core/store'

interface HostConfig {
  type: string
  props: InstanceProps
  container: UseBoundStore<RootState>
  instance: Instance
  textInstance: void
  suspenseInstance: Instance
  hydratableInstance: Instance
  publicInstance: Instance
  hostContext: never
  updatePayload: Array<boolean | number | DiffSet>
  childSet: never
  timeoutHandle: number | undefined
  noTimeout: -1
}

export type ReactThreeRoot<T = { fiber: Reconciler.FiberRoot }> = T & { store: UseBoundStore<RootState> }

export function createRenderer<TCanvas>(
  _roots: Map<TCanvas, Root<{ fiber: Reconciler.FiberRoot }>>,
  _getEventPriority?: () => any,
) {
  function switchInstance(
    instance: HostConfig['instance'],
    type: HostConfig['type'],
    newProps: HostConfig['props'],
    fiber: Reconciler.Fiber,
  ) {
    const parent = instance.__r3f?.parent
    if (!parent) return

    const newInstance = createInstance(type, newProps, instance.__r3f.root)

    // https://github.com/pmndrs/react-three-fiber/issues/1348
    // When args change the instance has to be re-constructed, which then
    // forces r3f to re-parent the children and non-scene objects
    if (instance.children) {
      for (const child of instance.children) {
        if (child.__r3f) appendChild(newInstance, child)
      }
      instance.children = instance.children.filter((child) => !child.__r3f)
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
    createInstance,
    removeChild,
    appendChild,
    appendInitialChild: appendChild,
    insertBefore,
    supportsMutation: true,
    isPrimaryRenderer: false,
    supportsPersistence: false,
    supportsHydration: false,
    noTimeout: -1,
    appendChildToContainer: (container, child) => {
      if (!child) return

      const scene = container.getState().scene as unknown as Instance
      // Link current root to the default scene
      scene.__r3f.root = container
      appendChild(scene, child)
    },
    removeChildFromContainer: (container, child) => {
      if (!child) return
      removeChild(container.getState().scene as unknown as Instance, child)
    },
    insertInContainerBefore: (container, child, beforeChild) => {
      if (!child || !beforeChild) return
      insertBefore(container.getState().scene as unknown as Instance, child, beforeChild)
    },
    getRootHostContext: () => null,
    getChildHostContext: (parentHostContext) => parentHostContext,
    finalizeInitialChildren(instance) {
      const localState = instance?.__r3f ?? {}
      // https://github.com/facebook/react/issues/20271
      // Returning true will trigger commitMount
      return Boolean(localState.handlers)
    },
    prepareUpdate(instance, _type, oldProps, newProps) {
      // Create diff-sets
      if (instance.__r3f.primitive && newProps.object && newProps.object !== instance) {
        return [true]
      } else {
        // This is a data object, let's extract critical information about it
        const { args: argsNew = [], children: cN, ...restNew } = newProps
        const { args: argsOld = [], children: cO, ...restOld } = oldProps

        // Throw if an object or literal was passed for args
        if (!Array.isArray(argsNew)) throw new Error('R3F: the args prop must be an array!')

        // If it has new props or arguments, then it needs to be re-instantiated
        if (argsNew.some((value, index) => value !== argsOld[index])) return [true]
        // Create a diff-set, flag if there are any changes
        const diff = diffProps(instance, restNew, restOld, true)
        if (diff.changes.length) return [false, diff]

        // Otherwise do not touch the instance
        return null
      }
    },
    commitUpdate(instance, [reconstruct, diff]: [boolean, DiffSet], type, _oldProps, newProps, fiber) {
      // Reconstruct when args or <primitive object={...} have changes
      if (reconstruct) switchInstance(instance, type, newProps, fiber)
      // Otherwise just overwrite props
      else applyProps(instance, diff)
    },
    commitMount(instance, _type, _props, _int) {
      // https://github.com/facebook/react/issues/20271
      // This will make sure events are only added once to the central container
      const localState = (instance.__r3f ?? {}) as LocalState
      if (instance.raycast && localState.handlers && localState.eventCount) {
        instance.__r3f.root.getState().internal.interaction.push(instance as unknown as THREE.Object3D)
      }
    },
    getPublicInstance: (instance) => instance!,
    prepareForCommit: () => null,
    preparePortalMount: (container) => prepare(container.getState().scene),
    resetAfterCommit: () => {},
    shouldSetTextContent: () => false,
    clearContainer: () => false,
    hideInstance(instance) {
      // Detach while the instance is hidden
      const { attach: type, parent } = instance.__r3f ?? {}
      if (type && parent) detach(parent, instance, type)
      if (instance.isObject3D) instance.visible = false
      invalidateInstance(instance)
    },
    unhideInstance(instance, props) {
      // Re-attach when the instance is unhidden
      const { attach: type, parent } = instance.__r3f ?? {}
      if (type && parent) attach(parent, instance, type)
      if ((instance.isObject3D && props.visible == null) || props.visible) instance.visible = true
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
