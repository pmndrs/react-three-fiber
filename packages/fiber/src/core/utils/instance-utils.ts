import { Fiber } from 'its-fine'
import { ConstructorRepresentation, Instance } from '../reconciler'
import { REACT_INTERNAL_PROPS } from './react-utils'
import { RootStore } from '../store'
import { is } from './misc-utils'
import { getColorManagement, hasColorSpace } from './color-utils'
import * as THREE from 'three'
import { EventHandlers } from '../events'

export const RESERVED_PROPS = [
  ...REACT_INTERNAL_PROPS,
  // Instance props
  'args',
  'dispose',
  'attach',
  'object',
  // Behavior flags
  'dispose',
]

export const DEFAULTS = new Map()

// Gets only instance props from reconciler fibers
export function getInstanceProps<T = any>(queue: Fiber['pendingProps']): Instance<T>['props'] {
  const props: Instance<T>['props'] = {}

  for (const key in queue) {
    if (!REACT_INTERNAL_PROPS.includes(key)) props[key] = queue[key]
  }

  return props
}

// Each object in the scene carries a small LocalState descriptor
export function prepare<T = any>(target: T, root: RootStore, type: string, props: Instance<T>['props']): Instance<T> {
  const object = target as unknown as Instance['object']

  // Create instance descriptor
  let instance = object.__r3f
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
    object.__r3f = instance
  }

  return instance
}

export function resolve(root: any, key: string): { root: any; key: string; target: any } {
  let target = root[key]
  if (!key.includes('-')) return { root, key, target }

  // Resolve pierced target
  const chain = key.split('-')
  target = chain.reduce((acc, key) => acc[key], root)
  key = chain.pop()!

  // Switch root if atomic
  if (!target?.set) root = chain.reduce((acc, key) => acc[key], root)

  return { root, key, target }
}

// Checks if a dash-cased string ends with an integer
const INDEX_REGEX = /-\d+$/

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

// This function prepares a set of changes to be applied to the instance
export function diffProps<T = any>(
  instance: Instance<T>,
  newProps: Instance<T>['props'],
  resetRemoved = false,
): Instance<T>['props'] {
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
  if (resetRemoved) {
    for (const prop in instance.props) {
      if (RESERVED_PROPS.includes(prop) || newProps.hasOwnProperty(prop)) continue

      const { root, key } = resolve(instance.object, prop)

      // https://github.com/mrdoob/three.js/issues/21209
      // HMR/fast-refresh relies on the ability to cancel out props, but threejs
      // has no means to do this. Hence we curate a small collection of value-classes
      // with their respective constructor/set arguments
      // For removed props, try to set default values, if possible
      if (root.constructor) {
        // create a blank slate of the instance and copy the particular parameter.
        let ctor = DEFAULTS.get(root.constructor)
        if (!ctor) {
          ctor = new root.constructor()
          DEFAULTS.set(root.constructor, ctor)
        }
        changedProps[key] = ctor[key]
      } else {
        // instance does not have constructor, just set it to 0
        changedProps[key] = 0
      }
    }
  }

  return changedProps
}

// This function applies a set of changes to the instance
export function applyProps<T = any>(object: Instance<T>['object'], props: Instance<T>['props']): Instance<T>['object'] {
  const instance = object.__r3f
  const rootState = instance?.root.getState()
  const prevHandlers = instance?.eventCount

  for (const prop in props) {
    let value = props[prop]

    // Don't mutate reserved keys
    if (RESERVED_PROPS.includes(prop)) continue

    // Deal with pointer events, including removing them if undefined
    if (instance && /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/.test(prop)) {
      if (typeof value === 'function') instance.handlers[prop as keyof EventHandlers] = value as any
      else delete instance.handlers[prop as keyof EventHandlers]
      instance.eventCount = Object.keys(instance.handlers).length
    }

    // Ignore setting undefined props
    if (value === undefined) continue

    let { root, key, target } = resolve(object, prop)

    // Alias (output)encoding => (output)colorSpace (since r152)
    // https://github.com/pmndrs/react-three-fiber/pull/2829
    if (hasColorSpace(root)) {
      const sRGBEncoding = 3001
      const SRGBColorSpace = 'srgb'
      const LinearSRGBColorSpace = 'srgb-linear'

      if (key === 'encoding') {
        key = 'colorSpace'
        value = value === sRGBEncoding ? SRGBColorSpace : LinearSRGBColorSpace
      } else if (key === 'outputEncoding') {
        key = 'outputColorSpace'
        value = value === sRGBEncoding ? SRGBColorSpace : LinearSRGBColorSpace
      }
    }

    // Copy if properties match signatures
    if (target?.copy && target?.constructor === (value as ConstructorRepresentation)?.constructor) {
      target.copy(value)
    }
    // Layers have no copy function, we must therefore copy the mask property
    else if (target instanceof THREE.Layers && value instanceof THREE.Layers) {
      target.mask = value.mask
    }
    // Set array types
    else if (target?.set && Array.isArray(value)) {
      if (target.fromArray) target.fromArray(value)
      else target.set(...value)
    }
    // Set literal types, ignore undefined
    // https://github.com/pmndrs/react-three-fiber/issues/274
    else if (target?.set && typeof value !== 'object') {
      const isColor = target instanceof THREE.Color
      // Allow setting array scalars
      if (!isColor && target.setScalar && typeof value === 'number') target.setScalar(value)
      // Otherwise just set ...
      else if (value !== undefined) target.set(value)

      // For versions of three which don't support THREE.ColorManagement,
      // Auto-convert sRGB colors
      // https://github.com/pmndrs/react-three-fiber/issues/344
      if (!getColorManagement() && !rootState?.linear && isColor) target.convertSRGBToLinear()
    }
    // Else, just overwrite the value
    else {
      root[key] = value

      // Auto-convert sRGB textures, for now ...
      // https://github.com/pmndrs/react-three-fiber/issues/344
      if (
        rootState &&
        root[key] instanceof THREE.Texture &&
        // sRGB textures must be RGBA8 since r137 https://github.com/mrdoob/three.js/pull/23129
        root[key].format === THREE.RGBAFormat &&
        root[key].type === THREE.UnsignedByteType
      ) {
        const texture = root[key] as THREE.Texture
        if (hasColorSpace(texture) && hasColorSpace(rootState.gl)) texture.colorSpace = rootState.gl.outputColorSpace
        else texture.encoding = rootState.gl.outputEncoding
      }
    }
  }

  if (
    instance?.parent &&
    rootState?.internal &&
    instance.object instanceof THREE.Object3D &&
    prevHandlers !== instance.eventCount
  ) {
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(instance.object)
    if (index > -1) rootState.internal.interaction.splice(index, 1)
    // Add the instance to the interaction manager only when it has handlers
    if (instance.eventCount && instance.object.raycast !== null && instance.object instanceof THREE.Object3D) {
      rootState.internal.interaction.push(instance.object)
    }
  }

  if (instance) invalidateInstance(instance)

  return object
}

export function invalidateInstance(instance: Instance): void {
  const state = instance.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}
