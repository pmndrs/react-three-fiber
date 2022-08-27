import * as THREE from 'three'
import { Store } from './store'
import { unstable_IdlePriority as idlePriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler'
import { prepare, applyProps, updateInstance, invalidateInstance, attach, detach } from './utils'
import { EventHandlers, removeInteractivity } from './events'

export type Root<T = {}> = T & { store: Store }

export type LocalState = {
  type: string
  root: Store
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

export function createInstance(type: string, { args = [], attach, ...props }: InstanceProps, root: Store) {
  let name = `${type[0].toUpperCase()}${type.slice(1)}`
  let instance: Instance

  if (type === 'primitive') {
    if (props.object === undefined) throw new Error("R3F: Primitives without 'object' are invalid!")
    const object = props.object as Instance
    instance = prepare<Instance>(object, { type, root, attach, primitive: true })
  } else {
    const target = catalogue[name]
    if (!target) {
      throw new Error(
        `R3F: ${name} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`,
      )
    }

    // Throw if an object or literal was passed for args
    if (!Array.isArray(args)) throw new Error('R3F: The args prop must be an array!')

    // Instanciate new object, link it to the root
    // Append memoized props with args so it's not forgotten
    instance = prepare(new target(...args), {
      type,
      root,
      attach,
      // Save args in case we need to reconstruct later for HMR
      memoizedProps: { args },
    })
  }

  // Auto-attach geometries and materials
  if (instance.__r3f.attach === undefined) {
    if (instance instanceof THREE.BufferGeometry) instance.__r3f.attach = 'geometry'
    else if (instance instanceof THREE.Material) instance.__r3f.attach = 'material'
  }

  // It should NOT call onUpdate on object instanciation, because it hasn't been added to the
  // view yet. If the callback relies on references for instance, they won't be ready yet, this is
  // why it passes "true" here
  // There is no reason to apply props to injects
  if (name !== 'inject') applyProps(instance, props)
  return instance
}

export function appendChild(parentInstance: Instance, child: Instance) {
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

export function insertBefore(parentInstance: Instance, child: Instance, beforeChild: Instance) {
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

export function removeChild(parentInstance: Instance, child: Instance, dispose?: boolean) {
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

    // Allow objects to bail out of recursive dispose altogether by passing dispose={null}
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

export { prepare, extend }
