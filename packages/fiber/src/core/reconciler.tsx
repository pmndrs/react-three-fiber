import * as THREE from 'three'
import * as React from 'react'
import Reconciler from 'react-reconciler'
import {
  // NoEventPriority,
  ContinuousEventPriority,
  DiscreteEventPriority,
  DefaultEventPriority,
} from 'react-reconciler/constants'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import {
  diffProps,
  applyProps,
  invalidateInstance,
  attach,
  detach,
  prepare,
  isObject3D,
  findInitialRoot,
  IsAllOptional,
} from './utils'
import type { RootStore } from './store'
import { removeInteractivity, type EventHandlers } from './events'
import type { ThreeElement } from '../three-types'

// TODO: upstream to DefinitelyTyped for React 19
// https://github.com/facebook/react/issues/28956
type EventPriority = number

type Fiber = Omit<Reconciler.Fiber, 'alternate'> & { refCleanup: null | (() => void); alternate: Fiber | null }

function createReconciler<
  Type,
  Props,
  Container,
  Instance,
  TextInstance,
  SuspenseInstance,
  HydratableInstance,
  FormInstance,
  PublicInstance,
  HostContext,
  ChildSet,
  TimeoutHandle,
  NoTimeout,
  TransitionStatus,
>(
  config: Omit<
    Reconciler.HostConfig<
      Type,
      Props,
      Container,
      Instance,
      TextInstance,
      SuspenseInstance,
      HydratableInstance,
      PublicInstance,
      HostContext,
      null, // updatePayload
      ChildSet,
      TimeoutHandle,
      NoTimeout
    >,
    'getCurrentEventPriority' | 'prepareUpdate' | 'commitUpdate'
  > & {
    /**
     * This method should mutate the `instance` and perform prop diffing if needed.
     *
     * The `internalHandle` data structure is meant to be opaque. If you bend the rules and rely on its internal fields, be aware that it may change significantly between versions. You're taking on additional maintenance risk by reading from it, and giving up all guarantees if you write something to it.
     */
    commitUpdate?(
      instance: Instance,
      type: Type,
      prevProps: Props,
      nextProps: Props,
      internalHandle: Reconciler.OpaqueHandle,
    ): void

    // Undocumented
    // https://github.com/facebook/react/pull/26722
    NotPendingTransition: TransitionStatus | null
    HostTransitionContext: React.Context<TransitionStatus>
    // https://github.com/facebook/react/pull/28751
    setCurrentUpdatePriority(newPriority: EventPriority): void
    getCurrentUpdatePriority(): EventPriority
    resolveUpdatePriority(): EventPriority
    // https://github.com/facebook/react/pull/28804
    resetFormInstance(form: FormInstance): void
    // https://github.com/facebook/react/pull/25105
    requestPostPaintCallback(callback: (time: number) => void): void
    // https://github.com/facebook/react/pull/26025
    shouldAttemptEagerTransition(): boolean
    // https://github.com/facebook/react/pull/31528
    trackSchedulerEvent(): void
    // https://github.com/facebook/react/pull/31008
    resolveEventType(): null | string
    resolveEventTimeStamp(): number

    /**
     * This method is called during render to determine if the Host Component type and props require some kind of loading process to complete before committing an update.
     */
    maySuspendCommit(type: Type, props: Props): boolean
    /**
     * This method may be called during render if the Host Component type and props might suspend a commit. It can be used to initiate any work that might shorten the duration of a suspended commit.
     */
    preloadInstance(type: Type, props: Props): boolean
    /**
     * This method is called just before the commit phase. Use it to set up any necessary state while any Host Components that might suspend this commit are evaluated to determine if the commit must be suspended.
     */
    startSuspendingCommit(): void
    /**
     * This method is called after `startSuspendingCommit` for each Host Component that indicated it might suspend a commit.
     */
    suspendInstance(type: Type, props: Props): void
    /**
     * This method is called after all `suspendInstance` calls are complete.
     *
     * Return `null` if the commit can happen immediately.
     *
     * Return `(initiateCommit: Function) => Function` if the commit must be suspended. The argument to this callback will initiate the commit when called. The return value is a cancellation function that the Reconciler can use to abort the commit.
     *
     */
    waitForCommitToBeReady(): ((initiateCommit: Function) => Function) | null
  },
): Reconciler.Reconciler<Container, Instance, TextInstance, SuspenseInstance, PublicInstance> {
  const reconciler = Reconciler(config as any)

  reconciler.injectIntoDevTools({
    bundleType: typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' ? 1 : 0,
    rendererPackageName: '@react-three/fiber',
    version: React.version,
  })

  return reconciler as any
}

const NoEventPriority = 0

export interface Root {
  fiber: Reconciler.FiberRoot
  store: RootStore
}

export type AttachFnType<O = any> = (parent: any, self: O) => () => void
export type AttachType<O = any> = string | AttachFnType<O>

export type ConstructorRepresentation<T = any> = new (...args: any[]) => T

export interface Catalogue {
  [name: string]: ConstructorRepresentation
}

// TODO: handle constructor overloads
// https://github.com/pmndrs/react-three-fiber/pull/2931
// https://github.com/microsoft/TypeScript/issues/37079
export type Args<T> = T extends ConstructorRepresentation
  ? T extends typeof THREE.Color
    ? [r: number, g: number, b: number] | [color: THREE.ColorRepresentation]
    : ConstructorParameters<T>
  : any[]

type ArgsProp<P> = P extends ConstructorRepresentation
  ? IsAllOptional<ConstructorParameters<P>> extends true
    ? { args?: Args<P> }
    : { args: Args<P> }
  : { args: unknown[] }

export type InstanceProps<T = any, P = any> = ArgsProp<P> & {
  object?: T
  dispose?: null
  attach?: AttachType<T>
  onUpdate?: (self: T) => void
}

export interface Instance<O = any> {
  root: RootStore
  type: string
  parent: Instance | null
  children: Instance[]
  props: InstanceProps<O> & Record<string, unknown>
  object: O & { __r3f?: Instance<O> }
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType<O>
  previousAttach?: any
  isHidden: boolean
}

interface HostConfig {
  type: string
  props: Instance['props']
  container: RootStore
  instance: Instance
  textInstance: void
  suspenseInstance: Instance
  hydratableInstance: never
  formInstance: never
  publicInstance: Instance['object']
  hostContext: {}
  childSet: never
  timeoutHandle: number | undefined
  noTimeout: -1
  TransitionStatus: null
}

const catalogue: Catalogue = {}

const PREFIX_REGEX = /^three(?=[A-Z])/

const toPascalCase = (type: string): string => `${type[0].toUpperCase()}${type.slice(1)}`

let i = 0

const isConstructor = (object: unknown): object is ConstructorRepresentation => typeof object === 'function'

export function extend<T extends ConstructorRepresentation>(objects: T): React.ExoticComponent<ThreeElement<T>>
export function extend<T extends Catalogue>(objects: T): void
export function extend<T extends Catalogue | ConstructorRepresentation>(
  objects: T,
): React.ExoticComponent<ThreeElement<any>> | void {
  if (isConstructor(objects)) {
    const Component = `${i++}`
    catalogue[Component] = objects
    return Component as any
  } else {
    Object.assign(catalogue, objects)
  }
}

function validateInstance(type: string, props: HostConfig['props']): void {
  // Get target from catalogue
  const name = `${type[0].toUpperCase()}${type.slice(1)}`
  const target = catalogue[name]

  // Validate element target
  if (type !== 'primitive' && !target)
    throw new Error(
      `R3F: ${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`,
    )

  // Validate primitives
  if (type === 'primitive' && !props.object) throw new Error(`R3F: Primitives without 'object' are invalid!`)

  // Throw if an object or literal was passed for args
  if (props.args !== undefined && !Array.isArray(props.args)) throw new Error('R3F: The args prop must be an array!')
}

function createInstance(type: string, props: HostConfig['props'], root: RootStore): HostConfig['instance'] {
  // Remove three* prefix from elements
  type = type.replace(PREFIX_REGEX, '')

  validateInstance(type, props)

  // Regenerate the R3F instance for primitives to simulate a new object
  if (type === 'primitive' && props.object?.__r3f) delete props.object.__r3f

  return prepare(props.object, root, type, props)
}

function hideInstance(instance: HostConfig['instance']): void {
  if (!instance.isHidden) {
    if (instance.props.attach && instance.parent?.object) {
      detach(instance.parent, instance)
    } else if (isObject3D(instance.object)) {
      instance.object.visible = false
    }

    instance.isHidden = true
    invalidateInstance(instance)
  }
}

function unhideInstance(instance: HostConfig['instance']): void {
  if (instance.isHidden) {
    if (instance.props.attach && instance.parent?.object) {
      attach(instance.parent, instance)
    } else if (isObject3D(instance.object) && instance.props.visible !== false) {
      instance.object.visible = true
    }

    instance.isHidden = false
    invalidateInstance(instance)
  }
}

// https://github.com/facebook/react/issues/20271
// This will make sure events and attach are only handled once when trees are complete
function handleContainerEffects(parent: Instance, child: Instance, beforeChild?: Instance) {
  // Bail if tree isn't mounted or parent is not a container.
  // This ensures that the tree is finalized and React won't discard results to Suspense
  const state = child.root.getState()
  if (!parent.parent && parent.object !== state.scene) return

  // Create & link object on first run
  if (!child.object) {
    // Get target from catalogue
    const target = catalogue[toPascalCase(child.type)]

    // Create object
    child.object = child.props.object ?? new target(...(child.props.args ?? []))
    child.object.__r3f = child
  }

  // Set initial props
  applyProps(child.object, child.props)

  // Append instance
  if (child.props.attach) {
    attach(parent, child)
  } else if (isObject3D(child.object) && isObject3D(parent.object)) {
    const childIndex = parent.object.children.indexOf(beforeChild?.object)
    if (beforeChild && childIndex !== -1) {
      child.object.parent = parent.object
      parent.object.children.splice(childIndex, 0, child.object)
      child.object.dispatchEvent({ type: 'added' })
      parent.object.dispatchEvent({ type: 'childadded', child: child.object })
    } else {
      parent.object.add(child.object)
    }
  }

  // Link subtree
  for (const childInstance of child.children) handleContainerEffects(child, childInstance)

  // Tree was updated, request a frame
  invalidateInstance(child)
}

function appendChild(parent: HostConfig['instance'], child: HostConfig['instance'] | HostConfig['textInstance']) {
  if (!child) return

  // Link instances
  child.parent = parent
  parent.children.push(child)

  // Attach tree once complete
  handleContainerEffects(parent, child)
}

function insertBefore(
  parent: HostConfig['instance'],
  child: HostConfig['instance'] | HostConfig['textInstance'],
  beforeChild: HostConfig['instance'] | HostConfig['textInstance'],
) {
  if (!child || !beforeChild) return

  // Link instances
  child.parent = parent
  const childIndex = parent.children.indexOf(beforeChild)
  if (childIndex !== -1) parent.children.splice(childIndex, 0, child)
  else parent.children.push(child)

  // Attach tree once complete
  handleContainerEffects(parent, child, beforeChild)
}

function disposeOnIdle(object: any) {
  if (typeof object.dispose === 'function') {
    const handleDispose = () => {
      try {
        object.dispose()
      } catch {
        // no-op
      }
    }

    // In a testing environment, cleanup immediately
    if (typeof IS_REACT_ACT_ENVIRONMENT !== 'undefined') handleDispose()
    // Otherwise, using a real GPU so schedule cleanup to prevent stalls
    else scheduleCallback(idlePriority, handleDispose)
  }
}

function removeChild(
  parent: HostConfig['instance'],
  child: HostConfig['instance'] | HostConfig['textInstance'],
  dispose?: boolean,
) {
  if (!child) return

  // Unlink instances
  child.parent = null
  const childIndex = parent.children.indexOf(child)
  if (childIndex !== -1) parent.children.splice(childIndex, 1)

  // Eagerly tear down tree
  if (child.props.attach) {
    detach(parent, child)
  } else if (isObject3D(child.object) && isObject3D(parent.object)) {
    parent.object.remove(child.object)
    removeInteractivity(findInitialRoot(child), child.object)
  }

  // Allow objects to bail out of unmount disposal with dispose={null}
  const shouldDispose = child.props.dispose !== null && dispose !== false

  // Recursively remove instance children
  for (let i = child.children.length - 1; i >= 0; i--) {
    const node = child.children[i]
    removeChild(child, node, shouldDispose)
  }
  child.children.length = 0

  // Unlink instance object
  delete child.object.__r3f

  // Dispose object whenever the reconciler feels like it.
  // Never dispose of primitives because their state may be kept outside of React!
  // In order for an object to be able to dispose it
  //   - has a dispose method
  //   - cannot be a <primitive object={...} />
  //   - cannot be a THREE.Scene, because three has broken its own API
  if (shouldDispose && child.type !== 'primitive' && child.object.type !== 'Scene') {
    disposeOnIdle(child.object)
  }

  // Tree was updated, request a frame for top-level instance
  if (dispose === undefined) invalidateInstance(child)
}

function setFiberRef(fiber: Fiber, publicInstance: HostConfig['publicInstance']): void {
  for (const _fiber of [fiber, fiber.alternate]) {
    if (_fiber !== null) {
      if (typeof _fiber.ref === 'function') {
        _fiber.refCleanup?.()
        const cleanup = _fiber.ref(publicInstance)
        if (typeof cleanup === 'function') _fiber.refCleanup = cleanup
      } else if (_fiber.ref) {
        _fiber.ref.current = publicInstance
      }
    }
  }
}

const reconstructed: [oldInstance: HostConfig['instance'], props: HostConfig['props'], fiber: Fiber][] = []

function swapInstances(): void {
  // Detach instance
  for (const [instance] of reconstructed) {
    const parent = instance.parent
    if (parent) {
      if (instance.props.attach) {
        detach(parent, instance)
      } else if (isObject3D(instance.object) && isObject3D(parent.object)) {
        parent.object.remove(instance.object)
      }

      for (const child of instance.children) {
        if (child.props.attach) {
          detach(instance, child)
        } else if (isObject3D(child.object) && isObject3D(instance.object)) {
          instance.object.remove(child.object)
        }
      }
    }

    // If the old instance is hidden, we need to unhide it.
    // React assumes it can discard instances since they're pure for DOM.
    // This isn't true for us since our lifetimes are impure and longliving.
    // So, we manually check if an instance was hidden and unhide it.
    if (instance.isHidden) unhideInstance(instance)

    // Dispose of old object if able
    if (instance.object.__r3f) delete instance.object.__r3f
    if (instance.type !== 'primitive') disposeOnIdle(instance.object)
  }

  // Update instance
  for (const [instance, props, fiber] of reconstructed) {
    instance.props = props

    const parent = instance.parent
    if (parent) {
      // Get target from catalogue
      const target = catalogue[toPascalCase(instance.type)]

      // Create object
      instance.object = instance.props.object ?? new target(...(instance.props.args ?? []))
      instance.object.__r3f = instance
      setFiberRef(fiber, instance.object)

      // Set initial props
      applyProps(instance.object, instance.props)

      if (instance.props.attach) {
        attach(parent, instance)
      } else if (isObject3D(instance.object) && isObject3D(parent.object)) {
        parent.object.add(instance.object)
      }

      for (const child of instance.children) {
        if (child.props.attach) {
          attach(instance, child)
        } else if (isObject3D(child.object) && isObject3D(instance.object)) {
          instance.object.add(child.object)
        }
      }

      // Tree was updated, request a frame
      invalidateInstance(instance)
    }
  }

  reconstructed.length = 0
}

// Don't handle text instances, make it no-op
const handleTextInstance = () => {}

const NO_CONTEXT: HostConfig['hostContext'] = {}

let currentUpdatePriority: number = NoEventPriority

// https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactFiberFlags.js
const NoFlags = 0
const Update = 4

export const reconciler = /* @__PURE__ */ createReconciler<
  HostConfig['type'],
  HostConfig['props'],
  HostConfig['container'],
  HostConfig['instance'],
  HostConfig['textInstance'],
  HostConfig['suspenseInstance'],
  HostConfig['hydratableInstance'],
  HostConfig['formInstance'],
  HostConfig['publicInstance'],
  HostConfig['hostContext'],
  HostConfig['childSet'],
  HostConfig['timeoutHandle'],
  HostConfig['noTimeout'],
  HostConfig['TransitionStatus']
>({
  isPrimaryRenderer: false,
  warnsIfNotActing: false,
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  createInstance,
  removeChild,
  appendChild,
  appendInitialChild: appendChild,
  insertBefore,
  appendChildToContainer(container, child) {
    const scene = (container.getState().scene as unknown as Instance<THREE.Scene>['object']).__r3f
    if (!child || !scene) return

    appendChild(scene, child)
  },
  removeChildFromContainer(container, child) {
    const scene = (container.getState().scene as unknown as Instance<THREE.Scene>['object']).__r3f
    if (!child || !scene) return

    removeChild(scene, child)
  },
  insertInContainerBefore(container, child, beforeChild) {
    const scene = (container.getState().scene as unknown as Instance<THREE.Scene>['object']).__r3f
    if (!child || !beforeChild || !scene) return

    insertBefore(scene, child, beforeChild)
  },
  getRootHostContext: () => NO_CONTEXT,
  getChildHostContext: () => NO_CONTEXT,
  commitUpdate(
    instance: HostConfig['instance'],
    type: HostConfig['type'],
    oldProps: HostConfig['props'],
    newProps: HostConfig['props'],
    fiber: Fiber,
  ) {
    validateInstance(type, newProps)

    let reconstruct = false

    // Reconstruct primitives if object prop changes
    if (instance.type === 'primitive' && oldProps.object !== newProps.object) reconstruct = true
    // Reconstruct instance if args were added or removed
    else if (newProps.args?.length !== oldProps.args?.length) reconstruct = true
    // Reconstruct instance if args were changed
    else if (newProps.args?.some((value, index) => value !== oldProps.args?.[index])) reconstruct = true

    // Reconstruct when args or <primitive object={...} have changes
    if (reconstruct) {
      reconstructed.push([instance, { ...newProps }, fiber])
    } else {
      // Create a diff-set, flag if there are any changes
      const changedProps = diffProps(instance, newProps)
      if (Object.keys(changedProps).length) {
        Object.assign(instance.props, changedProps)
        applyProps(instance.object, changedProps)
      }
    }

    // Flush reconstructed siblings when we hit the last updated child in a sequence
    const isTailSibling = fiber.sibling === null || (fiber.flags & Update) === NoFlags
    if (isTailSibling) swapInstances()
  },
  finalizeInitialChildren: () => false,
  commitMount() {},
  getPublicInstance: (instance) => instance?.object!,
  prepareForCommit: () => null,
  preparePortalMount: (container) => prepare(container.getState().scene, container, '', {}),
  resetAfterCommit: () => {},
  shouldSetTextContent: () => false,
  clearContainer: () => false,
  hideInstance,
  unhideInstance,
  createTextInstance: handleTextInstance,
  hideTextInstance: handleTextInstance,
  unhideTextInstance: handleTextInstance,
  scheduleTimeout: (typeof setTimeout === 'function' ? setTimeout : undefined) as any,
  cancelTimeout: (typeof clearTimeout === 'function' ? clearTimeout : undefined) as any,
  noTimeout: -1,
  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  detachDeletedInstance() {},
  prepareScopeUpdate() {},
  getInstanceFromScope: () => null,
  shouldAttemptEagerTransition: () => false,
  trackSchedulerEvent: () => {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1.1,
  requestPostPaintCallback() {},
  maySuspendCommit: () => false,
  preloadInstance: () => true, // true indicates already loaded
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  HostTransitionContext: /* @__PURE__ */ React.createContext<HostConfig['TransitionStatus']>(null),
  setCurrentUpdatePriority(newPriority: number) {
    currentUpdatePriority = newPriority
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== NoEventPriority) return currentUpdatePriority

    switch (typeof window !== 'undefined' && window.event?.type) {
      case 'click':
      case 'contextmenu':
      case 'dblclick':
      case 'pointercancel':
      case 'pointerdown':
      case 'pointerup':
        return DiscreteEventPriority
      case 'pointermove':
      case 'pointerout':
      case 'pointerover':
      case 'pointerenter':
      case 'pointerleave':
      case 'wheel':
        return ContinuousEventPriority
      default:
        return DefaultEventPriority
    }
  },
  resetFormInstance() {},
})
