import * as THREE from '#three'
import type { Instance, EventHandlers } from '#types'
import { hasConstructor, is, isColorRepresentation, isCopyable, isTexture, isVectorLike } from './is'
import { findInitialRoot, invalidateInstance } from './instance'

//* Property Resolution & Application ==============================
// Functions for resolving, diffing, attaching, and applying props to instances

/**
 * Reserved prop names that should not be applied to Three.js objects.
 */
export const RESERVED_PROPS = [
  'children',
  'key',
  'ref',
  // Instance props
  'args',
  'dispose',
  'attach',
  'object',
  'onUpdate',
  // Behavior flags
  'dispose',
]

/**
 * Regex to match event handler props (onPointer*, onClick, etc.)
 */
const EVENT_REGEX = /^on(Pointer|Drag|Drop|Click|DoubleClick|ContextMenu|Wheel)/

/**
 * Regex to check if a dash-cased string ends with an integer (e.g., 'lights-0')
 */
const INDEX_REGEX = /-\d+$/

/**
 * Memoized prototypes for resetting props during HMR
 */
const MEMOIZED_PROTOTYPES = new Map()

/**
 * Color maps that should have colorSpace set for 8-bit textures
 * https://github.com/mrdoob/three.js/pull/27042
 * https://github.com/mrdoob/three.js/pull/22748
 */
const colorMaps = ['map', 'emissiveMap', 'sheenColorMap', 'specularColorMap', 'envMap']

type ClassConstructor = { new (): void }

/**
 * Resolves a potentially pierced property key (e.g., 'material-color' → material.color).
 * First tries the entire key as a single property, then attempts piercing.
 *
 * @param root - Root object to resolve from
 * @param key - Property key (may contain dashes for piercing)
 * @returns Object containing root, key, and target value
 *
 * @example
 * resolve(mesh, 'material-color')
 * // => { root: mesh.material, key: 'color', target: mesh.material.color }
 */
export function resolve(root: any, key: string): { root: any; key: string; target: any } {
  if (!key.includes('-')) return { root, key, target: root[key] }

  // First try the entire key as a single property (e.g., 'foo-bar')
  if (key in root) return { root, key, target: root[key] }

  // Try piercing (e.g., 'material-color' -> material.color)
  const originalKey = key
  let target = root
  const parts = key.split('-')

  for (const part of parts) {
    if (typeof target !== 'object' || target === null) {
      if (target !== undefined) {
        // Property exists but has unexpected shape
        const remaining = parts.slice(parts.indexOf(part)).join('-')
        return { root: target, key: remaining, target: undefined }
      }
      // Property doesn't exist - preserve original key for better error messages
      return { root, key: originalKey, target: undefined }
    }
    key = part
    root = target
    target = target[key]
  }

  return { root, key, target }
}

/**
 * Attaches a child instance to a parent instance.
 * Handles both string-based attachment (e.g., 'geometry', 'material-map')
 * and function-based attachment for custom logic.
 *
 * @param parent - Parent instance
 * @param child - Child instance to attach
 *
 * @example
 * // String attachment
 * <bufferGeometry attach="geometry" />
 * // Array attachment
 * <light attach="lights-0" />
 * // Function attachment
 * <thing attach={(parent, self) => { parent.customProp = self }} />
 */
export function attach(parent: Instance, child: Instance): void {
  if (is.str(child.props.attach)) {
    // If attaching into an array (foo-0), create one
    if (INDEX_REGEX.test(child.props.attach)) {
      const index = child.props.attach.replace(INDEX_REGEX, '')
      const { root, key } = resolve(parent.object, index)
      if (!Array.isArray(root[key])) root[key] = []
    }

    const { root, key } = resolve(parent.object, child.props.attach)
    child.previousAttach = root[key]
    root[key] = child.object
  } else if (is.fun(child.props.attach)) {
    child.previousAttach = child.props.attach(parent.object, child.object)
  }
}

/**
 * Detaches a child instance from a parent instance.
 * Restores the previous value or deletes the property if it was never set.
 *
 * @param parent - Parent instance
 * @param child - Child instance to detach
 */
export function detach(parent: Instance, child: Instance): void {
  if (is.str(child.props.attach)) {
    const { root, key } = resolve(parent.object, child.props.attach)
    const previous = child.previousAttach
    // When the previous value was undefined, it means the value was never set to begin with
    if (previous === undefined) delete root[key]
    // Otherwise set the previous value
    else root[key] = previous
  } else {
    child.previousAttach?.(parent.object, child.object)
  }

  delete child.previousAttach
}

/**
 * Gets a memoized prototype instance for resetting props during HMR
 */
function getMemoizedPrototype(root: any) {
  let ctor = MEMOIZED_PROTOTYPES.get(root.constructor)
  try {
    if (!ctor) {
      ctor = new root.constructor()
      MEMOIZED_PROTOTYPES.set(root.constructor, ctor)
    }
  } catch (e) {
    // ...
  }
  return ctor
}

/**
 * Compares old and new props to determine which properties have changed.
 * Also handles resetting removed props for HMR/fast-refresh.
 *
 * @param instance - Instance to diff props for
 * @param newProps - New props to compare against
 * @returns Object containing only changed props
 *
 * @example
 * const changes = diffProps(instance, { position: [1, 2, 3], color: 'red' })
 * // => { position: [1, 2, 3] } (only if position changed)
 */
export function diffProps<T = any>(instance: Instance<T>, newProps: Instance<T>['props']): Instance<T>['props'] {
  const changedProps: Instance<T>['props'] = {}

  // Sort through props
  for (const prop in newProps) {
    // Skip reserved keys
    if (RESERVED_PROPS.includes(prop)) continue
    // Skip if props match
    if (is.equ(newProps[prop], instance.props[prop])) continue

    // Props changed, add them
    changedProps[prop] = newProps[prop]

    // Reset pierced props
    for (const other in newProps) {
      if (other.startsWith(`${prop}-`)) changedProps[other] = newProps[other]
    }
  }

  // Reset removed props for HMR
  for (const prop in instance.props) {
    if (RESERVED_PROPS.includes(prop) || newProps.hasOwnProperty(prop)) continue

    const { root, key } = resolve(instance.object, prop)

    // https://github.com/mrdoob/three.js/issues/21209
    // HMR/fast-refresh relies on the ability to cancel out props, but threejs
    // has no means to do this. Hence we curate a small collection of value-classes
    // with their respective constructor/set arguments
    // For removed props, try to set default values, if possible
    if (root.constructor && root.constructor.length === 0) {
      // create a blank slate of the instance and copy the particular parameter.
      const ctor = getMemoizedPrototype(root)
      if (!is.und(ctor)) changedProps[key] = ctor[key]
    } else {
      // instance does not have constructor, just set it to 0
      changedProps[key] = 0
    }
  }

  return changedProps
}

/**
 * Applies a set of props to a Three.js object.
 * Handles special cases like colors, vectors, textures, events, and pierced props.
 *
 * @param object - Three.js object to apply props to
 * @param props - Props to apply
 * @returns The object with props applied
 *
 * @example
 * applyProps(mesh, { position: [0, 1, 0], 'material-color': 'red' })
 */
export function applyProps<T = any>(object: Instance<T>['object'], props: Instance<T>['props']): Instance<T>['object'] {
  const instance = object.__r3f
  const rootState = instance && findInitialRoot(instance).getState()
  const prevHandlers = instance?.eventCount

  for (const prop in props) {
    let value = props[prop]

    // Don't mutate reserved keys
    if (RESERVED_PROPS.includes(prop)) continue

    // Deal with pointer events, including removing them if undefined
    if (instance && EVENT_REGEX.test(prop)) {
      if (typeof value === 'function') instance.handlers[prop as keyof EventHandlers] = value as any
      else delete instance.handlers[prop as keyof EventHandlers]
      instance.eventCount = Object.keys(instance.handlers).length
      continue
    }

    // Ignore setting undefined props
    // https://github.com/pmndrs/react-three-fiber/issues/274
    if (value === undefined) continue

    let { root, key, target } = resolve(object, prop)

    // Throw an error if we attempted to set a pierced prop to a non-object
    if (target === undefined && (typeof root !== 'object' || root === null)) {
      throw Error(`R3F: Cannot set "${prop}". Ensure it is an object before setting "${key}".`)
    }

    // Layers must be written to the mask property
    if (target instanceof THREE.Layers && value instanceof THREE.Layers) {
      target.mask = value.mask
    }
    // Set colors if valid color representation for automatic conversion (copy)
    // Use duck-typing (.isColor) instead of instanceof to handle multiple THREE instances
    else if ((target as THREE.Color)?.isColor && isColorRepresentation(value)) {
      ;(target as THREE.Color).set(value)
    }
    // Copy if properties match signatures and implement math interface (likely read-only)
    else if (isCopyable(target) && hasConstructor(value) && target.constructor === value.constructor) {
      target.copy(value)
    }
    // Set array types
    else if (isVectorLike(target) && Array.isArray(value)) {
      if ('fromArray' in target && typeof target.fromArray === 'function') target.fromArray(value)
      else target.set(...value)
    }
    // Set literal types
    else if (isVectorLike(target) && is.num(value)) {
      // Allow setting array scalars
      if ('setScalar' in target && typeof target.setScalar === 'function') target.setScalar(value)
      // Otherwise just set single value
      else target.set(value)
    }
    // Else, just overwrite the value
    else {
      root[key] = value

      // Auto-assign color space to 8-bit input textures (color maps)
      // Most 8-bit textures are authored in sRGB regardless of output display space
      // https://github.com/pmndrs/react-three-fiber/issues/344
      // https://github.com/mrdoob/three.js/pull/25857
      if (
        rootState &&
        !rootState.linear &&
        colorMaps.includes(key) &&
        isTexture(value) &&
        (root[key] as unknown as THREE.Texture | undefined)?.isTexture &&
        // sRGB textures must be RGBA8 since r137 https://github.com/mrdoob/three.js/pull/23129
        root[key].format === THREE.RGBAFormat &&
        root[key].type === THREE.UnsignedByteType
      ) {
        root[key].colorSpace = rootState.textureColorSpace
      }
    }
  }

  // Register event handlers
  if (
    instance?.parent &&
    rootState?.internal &&
    (instance.object as unknown as THREE.Object3D | undefined)?.isObject3D &&
    prevHandlers !== instance.eventCount
  ) {
    const object = instance.object as unknown as THREE.Object3D
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(object)
    if (index > -1) rootState.internal.interaction.splice(index, 1)
    // Add the instance to the interaction manager only when it has handlers
    if (instance.eventCount && object.raycast !== null) {
      rootState.internal.interaction.push(object)
    }
  }

  // Auto-attach geometries and materials
  if (instance && instance.props.attach === undefined) {
    if ((instance.object as unknown as THREE.BufferGeometry).isBufferGeometry) instance.props.attach = 'geometry'
    else if ((instance.object as unknown as THREE.Material).isMaterial) instance.props.attach = 'material'
  }

  // Instance was updated, request a frame
  if (instance) invalidateInstance(instance)

  return object
}
