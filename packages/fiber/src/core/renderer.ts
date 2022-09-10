import * as THREE from 'three'
import { UseBoundStore } from 'zustand'
import Reconciler from 'react-reconciler'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import { is, diffProps, applyProps, invalidateInstance, attach, detach, prepare } from './utils'
import { RootState } from './store'
import { removeInteractivity, getEventPriority, EventHandlers } from './events'

export interface Root {
  fiber: Reconciler.FiberRoot
  store: UseBoundStore<RootState>
}

export type AttachFnType<O = any> = (parent: any, self: O) => () => void
export type AttachType<O = any> = string | AttachFnType<O>

export type ConstructorRepresentation = new (...args: any[]) => any

export interface Catalogue {
  [name: string]: ConstructorRepresentation
}

export type Args<T> = T extends ConstructorRepresentation ? ConstructorParameters<T> : any[]

export interface InstanceProps<T = any> {
  args?: Args<T>
  object?: T
  visible?: boolean
  dispose?: null
  attach?: AttachType<T>
}

export interface Instance<O = any> {
  root: UseBoundStore<RootState>
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
  container: UseBoundStore<RootState>
  instance: Instance
  textInstance: void
  suspenseInstance: Instance
  hydratableInstance: never
  publicInstance: Instance['object']
  hostContext: never
  updatePayload: null | [true] | [false, Instance['props']]
  childSet: never
  timeoutHandle: number | undefined
  noTimeout: -1
}

const catalogue: Catalogue = {}
const extend = (objects: Partial<Catalogue>): void => void Object.assign(catalogue, objects)

function createInstance(
  type: string,
  props: HostConfig['props'],
  root: UseBoundStore<RootState>,
): HostConfig['instance'] {
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

  // Create instance
  const object = props.object ?? new target(...(props.args ?? []))
  const instance = prepare(object, root, type, props)

  // Auto-attach geometries and materials
  if (instance.props.attach === undefined) {
    if (instance.object instanceof THREE.BufferGeometry) instance.props.attach = 'geometry'
    else if (instance.object instanceof THREE.Material) instance.props.attach = 'material'
  }

  // Set initial props
  applyProps(instance.object, props)

  return instance
}

// https://github.com/facebook/react/issues/20271
// This will make sure events and attach are only handled once when trees are complete
function handleContainerEffects(parent: Instance, child: Instance) {
  // Bail if tree isn't mounted or parent is not a container.
  // This ensures that the tree is finalized and React won't discard results to Suspense
  const state = child.root.getState()
  if (!parent.parent && parent.object !== state.scene) return

  // Handle interactivity
  if (child.eventCount > 0 && child.object.raycast !== null && child.object instanceof THREE.Object3D) {
    state.internal.interaction.push(child.object)
  }

  // Handle attach
  if (child.props.attach) attach(parent, child)
  for (const childInstance of child.children) handleContainerEffects(child, childInstance)
}

function appendChild(parent: HostConfig['instance'], child: HostConfig['instance'] | HostConfig['textInstance']) {
  if (!child) return

  // Link instances
  child.parent = parent
  parent.children.push(child)

  // Add Object3Ds if able
  if (!child.props.attach && parent.object instanceof THREE.Object3D && child.object instanceof THREE.Object3D) {
    parent.object.add(child.object)
  }

  // Attach tree once complete
  handleContainerEffects(parent, child)

  // Tree was updated, request a frame
  invalidateInstance(child)
}

function insertBefore(
  parent: HostConfig['instance'],
  child: HostConfig['instance'] | HostConfig['textInstance'],
  beforeChild: HostConfig['instance'] | HostConfig['textInstance'],
) {
  if (!child || !beforeChild) return

  // Link instances
  child.parent = parent
  parent.children.splice(parent.children.indexOf(beforeChild), 0, child)

  // Manually splice Object3Ds
  if (
    !child.props.attach &&
    parent.object instanceof THREE.Object3D &&
    child.object instanceof THREE.Object3D &&
    beforeChild.object instanceof THREE.Object3D
  ) {
    child.object.parent = parent.object
    parent.object.children.splice(parent.object.children.indexOf(beforeChild.object), 0, child.object)
    child.object.dispatchEvent({ type: 'added' })
  }

  // Attach tree once complete
  handleContainerEffects(parent, child)

  // Tree was updated, request a frame
  invalidateInstance(child)
}

function removeChild(
  parent: HostConfig['instance'],
  child: HostConfig['instance'] | HostConfig['textInstance'],
  dispose?: boolean,
  recursive?: boolean,
) {
  if (!child) return

  // Unlink instances
  child.parent = null
  if (!recursive) {
    const childIndex = parent.children.indexOf(child)
    if (childIndex !== -1) parent.children.splice(childIndex, 1)
  }

  // Eagerly tear down tree
  if (child.props.attach) {
    detach(parent, child)
  } else if (child.object instanceof THREE.Object3D && parent.object instanceof THREE.Object3D) {
    parent.object.remove(child.object)
    removeInteractivity(child.root, child.object)
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
  const shouldDispose = child.props.dispose !== null && dispose !== false

  // Remove nested child objects. Primitives should not have objects and children that are
  // attached to them declaratively ...
  if (recursive !== false) {
    for (const childInstance of child.children) {
      removeChild(child, childInstance, shouldDispose, true)
    }
  }

  // Unlink instance object
  delete child.object.__r3f

  // Dispose object whenever the reconciler feels like it
  if (child.type !== 'primitive' && child.object.type !== 'Scene' && shouldDispose) {
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

  // Tree was updated, request a frame for top-level instance
  if (dispose === undefined) invalidateInstance(child)
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
  const parent = oldInstance.parent
  if (parent) {
    removeChild(parent, oldInstance, false)
    appendChild(parent, newInstance)
  }

  // Move children to new instance
  for (const child of oldInstance.children) {
    removeChild(oldInstance, child, false, false)
    appendChild(newInstance, child)
  }
  oldInstance.children = []

  // Re-bind event handlers
  if (newInstance.object.raycast !== null && newInstance.object instanceof THREE.Object3D && newInstance.eventCount) {
    const rootState = newInstance.root.getState()
    rootState.internal.interaction.push(newInstance.object)
  }

  // This evil hack switches the react-internal fiber node
  // https://github.com/facebook/react/issues/14983
  // https://github.com/facebook/react/pull/15021
  ;[fiber, fiber.alternate].forEach((fiber) => {
    if (fiber !== null) {
      fiber.stateNode = newInstance
      if (fiber.ref) {
        if (typeof fiber.ref === 'function') fiber.ref(newInstance.object)
        else fiber.ref.current = newInstance.object
      }
    }
  })

  // Tree was updated, request a frame
  invalidateInstance(newInstance)

  return newInstance
}

// Don't handle text instances, warn on undefined behavior
const handleTextInstance = () =>
  console.warn('R3F: Text is not allowed in JSX! This could be stray whitespace or characters.')

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
  getRootHostContext: () => null,
  getChildHostContext: (parentHostContext) => parentHostContext,
  prepareUpdate(instance, _type, oldProps, newProps) {
    // Reconstruct primitives if object prop changes
    if (instance.type === 'primitive' && oldProps.object !== newProps.object) return [true]

    // Reconstruct instance if args change
    if (newProps.args?.length !== oldProps.args?.length) return [true]
    if (newProps.args?.some((value, index) => value !== oldProps.args?.[index])) return [true]

    // Create a diff-set, flag if there are any changes
    const changedProps = diffProps(oldProps, newProps, true)
    if (Object.keys(changedProps).length) return [false, changedProps]

    // Otherwise do not touch the instance
    return null
  },
  commitUpdate(instance, diff, type, _oldProps, newProps, fiber) {
    const [reconstruct, changedProps] = diff!

    // Reconstruct when args or <primitive object={...} have changes
    if (reconstruct) return switchInstance(instance, type, newProps, fiber)

    // Otherwise just overwrite props
    Object.assign(instance.props, changedProps)
    applyProps(instance.object, changedProps)
  },
  finalizeInitialChildren: () => false,
  commitMount() {},
  getPublicInstance: (instance) => instance?.object!,
  prepareForCommit: () => null,
  preparePortalMount: (container) => prepare(container.getState().scene, container, '', {}),
  resetAfterCommit: () => {},
  shouldSetTextContent: () => false,
  clearContainer: () => false,
  hideInstance(instance) {
    if (instance.props.attach && instance.parent?.object) {
      detach(instance.parent, instance)
    } else if (instance.object instanceof THREE.Object3D) {
      instance.object.visible = false
    }

    instance.isHidden = true
    invalidateInstance(instance)
  },
  unhideInstance(instance) {
    if (instance.isHidden) {
      if (instance.props.attach && instance.parent?.object) {
        attach(instance.parent, instance)
      } else if (instance.object instanceof THREE.Object3D && instance.props.visible !== false) {
        instance.object.visible = true
      }
    }

    instance.isHidden = false
    invalidateInstance(instance)
  },
  createTextInstance: handleTextInstance,
  hideTextInstance: handleTextInstance,
  unhideTextInstance: handleTextInstance,
  // https://github.com/pmndrs/react-three-fiber/pull/2360#discussion_r916356874
  // @ts-ignore
  getCurrentEventPriority: () => getEventPriority(),
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

export { extend, reconciler }
