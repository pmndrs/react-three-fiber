import type { Scene, Color, ColorRepresentation } from '#three'
import packageData from '../../package.json'

import * as React from 'react'
import Reconciler from '../../react-reconciler/index.js'
import {
  ContinuousEventPriority,
  DiscreteEventPriority,
  DefaultEventPriority,
} from '../../react-reconciler/constants.js'
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
} from './utils'
import { removeInteractivity } from './events'
import type { ThreeElement } from '../../types/three'

//* Type Imports ==============================
import type {
  RootStore,
  EventHandlers,
  IsAllOptional,
  Root,
  AttachFnType,
  AttachType,
  ConstructorRepresentation,
  Catalogue,
  Args,
  InstanceProps,
  Instance,
  HostConfig,
} from '#types'

type Fiber = Omit<Reconciler.Fiber, 'alternate'> & { refCleanup: null | (() => void); alternate: Fiber | null }

function createReconciler<
  Type,
  Props,
  Container,
  InstanceType,
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
  config: Reconciler.HostConfig<
    Type,
    Props,
    Container,
    InstanceType,
    TextInstance,
    SuspenseInstance,
    HydratableInstance,
    FormInstance,
    PublicInstance,
    HostContext,
    ChildSet,
    TimeoutHandle,
    NoTimeout,
    TransitionStatus
  >,
): Reconciler.Reconciler<Container, InstanceType, TextInstance, SuspenseInstance, FormInstance, PublicInstance> {
  const reconciler = Reconciler(config as any)

  // @ts-ignore DefinitelyTyped is not up to date
  reconciler.injectIntoDevTools()

  return reconciler as any
}

const NoEventPriority = 0

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
  const name = toPascalCase(type)
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
  // Remove three* prefix from elements if native element not present
  type = toPascalCase(type) in catalogue ? type : type.replace(PREFIX_REGEX, '')

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
      // If the child is already in the parent's children array, move it to the new position
      // Otherwise, just insert it at the target position
      const existingIndex = parent.object.children.indexOf(child.object)
      if (existingIndex !== -1) {
        parent.object.children.splice(existingIndex, 1)
        const adjustedIndex = existingIndex < childIndex ? childIndex - 1 : childIndex
        parent.object.children.splice(adjustedIndex, 0, child.object)
      } else {
        child.object.parent = parent.object
        parent.object.children.splice(childIndex, 0, child.object)
        child.object.dispatchEvent({ type: 'added' })
        parent.object.dispatchEvent({ type: 'childadded', child: child.object })
      }
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

  // Remove existing child if it exists (re-order to last)
  // This emulates DOM appendChild behavior: https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild
  if (child.parent === parent) {
    const existingIndex = parent.children.indexOf(child)
    if (existingIndex !== -1) parent.children.splice(existingIndex, 1)
  }

  // Link instances
  child.parent = parent

  // Append child
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

  // Remove existing child if it exists (re-order)
  // This mirrors the logic in handleContainerEffects for object.children
  if (child.parent === parent) {
    const existingIndex = parent.children.indexOf(child)
    if (existingIndex !== -1) parent.children.splice(existingIndex, 1)
  }

  // Link instances
  child.parent = parent

  // Insert at target position (or append if beforeChild not found)
  const beforeChildIndex = parent.children.indexOf(beforeChild)
  if (beforeChildIndex !== -1) parent.children.splice(beforeChildIndex, 0, child)
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
    // Use internal.container for child attachment (supports portal wrapping)
    const target = container.getState().internal.container ?? container.getState().scene
    const instance = (target as unknown as Instance<Scene>['object']).__r3f
    if (!child || !instance) return

    appendChild(instance, child)
  },
  removeChildFromContainer(container, child) {
    // Use internal.container for child attachment (supports portal wrapping)
    const target = container.getState().internal.container ?? container.getState().scene
    const instance = (target as unknown as Instance<Scene>['object']).__r3f
    if (!child || !instance) return

    removeChild(instance, child)
  },
  insertInContainerBefore(container, child, beforeChild) {
    // Use internal.container for child attachment (supports portal wrapping)
    const target = container.getState().internal.container ?? container.getState().scene
    const instance = (target as unknown as Instance<Scene>['object']).__r3f
    if (!child || !beforeChild || !instance) return

    insertBefore(instance, child, beforeChild)
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
  preparePortalMount: (container) => {
    // Prepare the container (where children attach) for portal mounting
    const target = container.getState().internal.container ?? container.getState().scene
    return prepare(target, container, '', {})
  },
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
  suspendInstance() {},
  waitForCommitToBeReady: () => null,
  NotPendingTransition: null,
  // The reconciler types use the internal ReactContext with all the hidden properties
  // so we have to cast from the public React.Context type
  HostTransitionContext: /* @__PURE__ */ React.createContext<HostConfig['TransitionStatus']>(
    null,
  ) as unknown as Reconciler.ReactContext<HostConfig['TransitionStatus']>,
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
      case 'dragenter':
      case 'dragleave':
      case 'drop':
      case 'pointercancel':
      case 'pointerdown':
      case 'pointerup':
        return DiscreteEventPriority
      case 'dragover':
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
  // @ts-ignore DefinitelyTyped is not up to date
  rendererPackageName: '@react-three/fiber',
  rendererVersion: packageData.version,

  // 19.2 Reconciler

  // https://github.com/facebook/react/pull/31975
  // https://github.com/facebook/react/pull/31999
  applyViewTransitionName(_instance: any, _name: any, _className: any) {},
  restoreViewTransitionName(_instance: any, _props: any) {},
  cancelViewTransitionName(_instance: any, _name: any, _props: any) {},
  cancelRootViewTransitionName(_rootContainer: any) {},
  restoreRootViewTransitionName(_rootContainer: any) {},
  InstanceMeasurement: null,
  measureInstance: (_instance: any) => null,
  wasInstanceInViewport: (_measurement: any): boolean => true,
  hasInstanceChanged: (_oldMeasurement: any, _newMeasurement: any): boolean => false,
  hasInstanceAffectedParent: (_oldMeasurement: any, _newMeasurement: any): boolean => false,

  // https://github.com/facebook/react/pull/32002
  // https://github.com/facebook/react/pull/34486
  suspendOnActiveViewTransition(_state: any, _container: any) {},

  // https://github.com/facebook/react/pull/32451
  // https://github.com/facebook/react/pull/32760
  startGestureTransition: () => null,
  startViewTransition: () => null,
  stopViewTransition(_transition: null) {},

  // https://github.com/facebook/react/pull/32038
  createViewTransitionInstance: (_name: string): null => null,

  // https://github.com/facebook/react/pull/32379
  // https://github.com/facebook/react/pull/32786
  getCurrentGestureOffset(_provider: null): number {
    throw new Error('startGestureTransition is not yet supported in react-three-fiber.')
  },

  // https://github.com/facebook/react/pull/32500
  cloneMutableInstance(instance: any, _keepChildren: any) {
    return instance
  },
  cloneMutableTextInstance(textInstance: any) {
    return textInstance
  },
  cloneRootViewTransitionContainer(_rootContainer: any) {
    throw new Error('Not implemented.')
  },
  removeRootViewTransitionClone(_rootContainer: any, _clone: any) {
    throw new Error('Not implemented.')
  },

  // https://github.com/facebook/react/pull/32465
  createFragmentInstance: (_fiber: any): null => null,
  updateFragmentInstanceFiber(_fiber: any, _instance: any): void {},
  commitNewChildToFragmentInstance(_child: any, _fragmentInstance: any): void {},
  deleteChildFromFragmentInstance(_child: any, _fragmentInstance: any): void {},

  // https://github.com/facebook/react/pull/32653
  measureClonedInstance: (_instance: any) => null,

  // https://github.com/facebook/react/pull/32819
  maySuspendCommitOnUpdate: (_type: any, _oldProps: any, _newProps: any) => false,
  maySuspendCommitInSyncRender: (_type: any, _props: any) => false,

  // https://github.com/facebook/react/pull/34486
  startSuspendingCommit: () => null,

  // https://github.com/facebook/react/pull/34522
  getSuspendedCommitReason: (_state: any, _rootContainer: any) => null,
})
