import * as THREE from '#three'
import type { RootStore, Instance, ObjectMap, Disposable } from '#types'
import type { Fiber } from 'react-reconciler'
import { getUuidPrefix } from './three'

//* Instance & Scene Graph Management ==============================
// Functions for managing R3F instance descriptors and Three.js scene graphs

/**
 * React internal props that should not be passed to Three.js objects.
 */
export const REACT_INTERNAL_PROPS = ['children', 'key', 'ref']

/**
 * Returns the instance's initial (outermost) root.
 * Traverses through previousRoot links to find the original root store.
 *
 * @param instance - R3F instance to find root for
 * @returns The outermost root store
 */
export function findInitialRoot<T>(instance: Instance<T>): RootStore {
  let root = instance.root
  while (root.getState().previousRoot) root = root.getState().previousRoot!
  return root
}

/**
 * Returns instance root state.
 * If the object doesn't have __r3f (e.g., child meshes in primitives/GLTFs),
 * traverses ancestors to find the nearest managed parent.
 *
 * @param obj - Three.js object to get root state for
 * @returns Root state if found, undefined otherwise
 */
export function getRootState<T extends THREE.Object3D = THREE.Object3D>(obj: T) {
  let state = (obj as Instance<T>['object']).__r3f?.root.getState()
  if (!state) {
    obj.traverseAncestors((ancestor) => {
      const parentState = (ancestor as Instance['object']).__r3f?.root.getState()
      if (parentState) {
        state = parentState
        return false // Stop traversal
      }
    })
  }
  return state
}

/**
 * Collects nodes, materials, and meshes from a Three.js Object3D hierarchy.
 * Handles duplicate material names by appending UUID prefixes.
 *
 * @param object - Root object to traverse
 * @returns ObjectMap containing named nodes, materials, and meshes
 *
 * @example
 * const { nodes, materials, meshes } = buildGraph(gltf.scene)
 * // Access by name: nodes.Head, materials.Metal, meshes.Body
 */
export function buildGraph(object: THREE.Object3D): ObjectMap {
  const data: ObjectMap = { nodes: {}, materials: {}, meshes: {} }
  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) data.nodes[obj.name] = obj
      if (obj.material) {
        // because duplicate names should be possible we need slightly better parsing
        // see: https://github.com/pmndrs/react-three-fiber/issues/3358
        const material = Array.isArray(obj.material) ? obj.material[0] : obj.material
        const nameAlreadyUsed = data.materials[material.name]
        let materialName = material.name
        if (nameAlreadyUsed) {
          materialName = materialName + `-${getUuidPrefix(material.uuid)}`
          material.userData.materialCacheName = materialName
        }
        data.materials[materialName] = material
      }
      if (obj.isMesh && !data.meshes[obj.name]) data.meshes[obj.name] = obj
    })
  }
  return data
}

/**
 * Disposes an object and all its disposable properties.
 * Skips Scene objects as they should not be disposed automatically.
 *
 * @param obj - Object to dispose
 */
export function dispose<T extends Disposable>(obj: T): void {
  if (obj.type !== 'Scene') obj.dispose?.()
  for (const p in obj) {
    const prop = obj[p] as Disposable | undefined
    if (prop?.type !== 'Scene') prop?.dispose?.()
  }
}

/**
 * Extracts instance props from React reconciler fiber props.
 * Filters out React-internal props (children, key, ref).
 *
 * @param queue - Pending props from reconciler fiber
 * @returns Props object without React-internal keys
 */
export function getInstanceProps<T = any>(queue: Fiber['pendingProps']): Instance<T>['props'] {
  const props: Instance<T>['props'] = {}

  for (const key in queue) {
    if (!REACT_INTERNAL_PROPS.includes(key)) props[key] = queue[key]
  }

  return props
}

/**
 * Creates or retrieves an R3F instance descriptor for a Three.js object.
 * Each object in the scene carries a LocalState descriptor (__r3f).
 *
 * @param target - Target object to prepare
 * @param root - Root store for this instance
 * @param type - String identifier for the object type
 * @param props - Initial props for the instance
 * @returns Instance descriptor
 */
export function prepare<T = any>(target: T, root: RootStore, type: string, props: Instance<T>['props']): Instance<T> {
  const object = target as unknown as Instance['object']

  // Create instance descriptor
  let instance = object?.__r3f
  if (!instance) {
    instance = {
      root,
      type,
      parent: null,
      children: [],
      props: getInstanceProps(props),
      object,
      eventCount: 0,
      handlers: {},
      isHidden: false,
    }

    if (object) object.__r3f = instance
  }

  return instance
}

/**
 * Triggers an update for an instance.
 * Calls onUpdate callback and invalidates the frame if necessary.
 *
 * @param instance - Instance to invalidate
 */
export function invalidateInstance(instance: Instance): void {
  if (!instance.parent) return

  instance.props.onUpdate?.(instance.object)

  const state = instance.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}
