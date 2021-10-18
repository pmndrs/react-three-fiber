import * as THREE from 'three'
import { UseStore } from 'zustand'
import { EventHandlers } from './events'
import { Instance, InstanceProps, LocalState } from './renderer'
import { Dpr, RootState } from './store'

export const DEFAULT = '__default'

export type DiffSet = {
  memoized: { [key: string]: any }
  changes: [key: string, value: unknown, isEvent: boolean, keys: string[]][]
}

export const isDiffSet = (def: any): def is DiffSet => def && !!(def as DiffSet).memoized && !!(def as DiffSet).changes
export type ClassConstructor = { new (): void }

export type ObjectMap = {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
}

export function calculateDpr(dpr: Dpr) {
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], window.devicePixelRatio), dpr[1]) : dpr
}

// A collection of compare functions
export const is = {
  obj: (a: any) => a === Object(a) && !is.arr(a) && typeof a !== 'function',
  fun: (a: any): a is Function => typeof a === 'function',
  str: (a: any): a is string => typeof a === 'string',
  num: (a: any): a is number => typeof a === 'number',
  und: (a: any) => a === void 0,
  arr: (a: any) => Array.isArray(a),
  equ(a: any, b: any) {
    // Wrong type or one of the two undefined, doesn't match
    if (typeof a !== typeof b || !!a !== !!b) return false
    // Atomic, just compare a against b
    if (is.str(a) || is.num(a) || is.obj(a)) return a === b
    // Array, shallow compare first to see if it's a match
    if (is.arr(a) && a == b) return true
    // Last resort, go through keys
    let i
    for (i in a) if (!(i in b)) return false
    for (i in b) if (a[i] !== b[i]) return false
    return is.und(i) ? a === b : true
  },
}

// Collects nodes and materials from a THREE.Object3D
export function buildGraph(object: THREE.Object3D) {
  const data: ObjectMap = { nodes: {}, materials: {} }
  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) data.nodes[obj.name] = obj
      if (obj.material && !data.materials[obj.material.name]) data.materials[obj.material.name] = obj.material
    })
  }
  return data
}

// Disposes an object and all its properties
export function dispose<TObj extends { dispose?: () => void; type?: string; [key: string]: any }>(obj: TObj) {
  if (obj.dispose && obj.type !== 'Scene') obj.dispose()
  for (const p in obj) {
    ;(p as any).dispose?.()
    delete obj[p]
  }
}

// Each object in the scene carries a small LocalState descriptor
export function prepare<T = THREE.Object3D>(object: T, state?: Partial<LocalState>) {
  const instance = object as unknown as Instance
  if (state?.primitive || !instance.__r3f) {
    instance.__r3f = {
      root: null as unknown as UseStore<RootState>,
      memoizedProps: {},
      eventCount: 0,
      handlers: {},
      objects: [],
      parent: null,
      ...state,
    }
  }
  return object
}

// Shallow check arrays, but check objects atomically
function checkShallow(a: any, b: any) {
  if (is.arr(a) && is.equ(a, b)) return true
  if (a === b) return true
  return false
}

// This function prepares a set of changes to be applied to the instance
export function diffProps(
  instance: Instance,
  { children: cN, key: kN, ref: rN, ...props }: InstanceProps,
  { children: cP, key: kP, ref: rP, ...previous }: InstanceProps = {},
  remove = false,
): DiffSet {
  const localState = (instance?.__r3f ?? {}) as LocalState
  const entries = Object.entries(props)
  const changes: [key: string, value: unknown, isEvent: boolean, keys: string[]][] = []

  // Catch removed props, prepend them so they can be reset or removed
  if (remove) {
    const previousKeys = Object.keys(previous)
    for (let i = 0; i < previousKeys.length; i++)
      if (!props.hasOwnProperty(previousKeys[i])) entries.unshift([previousKeys[i], DEFAULT + 'remove'])
  }

  entries.forEach(([key, value]) => {
    // Bail out on primitive object
    if (instance.__r3f?.primitive && key === 'object') return
    // When props match bail out
    if (checkShallow(value, previous[key])) return
    // Collect handlers and bail out
    if (/^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/.test(key)) return changes.push([key, value, true, []])
    // Split dashed props
    let entries: string[] = []
    if (key.includes('-')) entries = key.split('-')
    changes.push([key, value, false, entries])
  })

  const memoized: { [key: string]: any } = { ...props }
  if (localState.memoizedProps && localState.memoizedProps.args) memoized.args = localState.memoizedProps.args
  if (localState.memoizedProps && localState.memoizedProps.attach) memoized.attach = localState.memoizedProps.attach

  return { memoized, changes }
}

// This function applies a set of changes to the instance
export function applyProps(instance: Instance, data: InstanceProps | DiffSet) {
  // Filter equals, events and reserved props
  const localState = (instance?.__r3f ?? {}) as LocalState
  const root = localState.root
  const rootState = root?.getState?.() ?? {}
  const { memoized, changes } = isDiffSet(data) ? data : diffProps(instance, data)
  const prevHandlers = localState.eventCount

  // Prepare memoized props
  if (instance.__r3f) instance.__r3f.memoizedProps = memoized

  changes.forEach(([key, value, isEvent, keys]) => {
    let currentInstance = instance
    let targetProp = currentInstance[key]

    // Revolve dashed props
    if (keys.length) {
      targetProp = keys.reduce((acc, key) => acc[key], instance)
      // If the target is atomic, it forces us to switch the root
      if (!(targetProp && targetProp.set)) {
        const [name, ...reverseEntries] = keys.reverse()
        currentInstance = reverseEntries.reverse().reduce((acc, key) => acc[key], instance)
        key = name
      }
    }

    // https://github.com/mrdoob/three.js/issues/21209
    // HMR/fast-refresh relies on the ability to cancel out props, but threejs
    // has no means to do this. Hence we curate a small collection of value-classes
    // with their respective constructor/set arguments
    // For removed props, try to set default values, if possible
    if (value === DEFAULT + 'remove') {
      if (targetProp && targetProp.constructor) {
        // use the prop constructor to find the default it should be
        value = new targetProp.constructor(memoized.args)
      } else if (currentInstance.constructor) {
        // create a blank slate of the instance and copy the particular parameter.
        // @ts-ignore
        const defaultClassCall = new currentInstance.constructor(currentInstance.__r3f.memoizedProps.args)
        value = defaultClassCall[targetProp]
        // destory the instance
        if (defaultClassCall.dispose) defaultClassCall.dispose()
        // instance does not have constructor, just set it to 0
      } else value = 0
    }

    // Deal with pointer events ...
    if (isEvent) {
      if (value) localState.handlers[key as keyof EventHandlers] = value as any
      else delete localState.handlers[key as keyof EventHandlers]
      localState.eventCount = Object.keys(localState.handlers).length
    }
    // Special treatment for objects with support for set/copy, and layers
    else if (targetProp && targetProp.set && (targetProp.copy || targetProp instanceof THREE.Layers)) {
      // If value is an array
      if (Array.isArray(value)) {
        if (targetProp.fromArray) targetProp.fromArray(value)
        else targetProp.set(...value)
      }
      // Test again target.copy(class) next ...
      else if (
        targetProp.copy &&
        value &&
        (value as ClassConstructor).constructor &&
        targetProp.constructor.name === (value as ClassConstructor).constructor.name
      )
        targetProp.copy(value)
      // If nothing else fits, just set the single value, ignore undefined
      // https://github.com/react-spring/react-three-fiber/issues/274
      else if (value !== undefined) {
        const isColor = targetProp instanceof THREE.Color
        // Allow setting array scalars
        if (!isColor && targetProp.setScalar) targetProp.setScalar(value)
        // Layers have no copy function, we must therefore copy the mask property
        else if (targetProp instanceof THREE.Layers && value instanceof THREE.Layers) targetProp.mask = value.mask
        // Otherwise just set ...
        else targetProp.set(value)
        // Auto-convert sRGB colors, for now ...
        // https://github.com/react-spring/react-three-fiber/issues/344
        if (!rootState.linear && isColor) targetProp.convertSRGBToLinear()
      }
      // Else, just overwrite the value
    } else {
      currentInstance[key] = value
      // Auto-convert sRGB textures, for now ...
      // https://github.com/react-spring/react-three-fiber/issues/344
      if (!rootState.linear && currentInstance[key] instanceof THREE.Texture)
        currentInstance[key].encoding = THREE.sRGBEncoding
    }

    invalidateInstance(instance)
    return instance
  })

  if (rootState.internal && instance.raycast && prevHandlers !== localState.eventCount) {
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(instance as unknown as THREE.Object3D)
    if (index > -1) rootState.internal.interaction.splice(index, 1)
    // Add the instance to the interaction manager only when it has handlers
    if (localState.eventCount) rootState.internal.interaction.push(instance as unknown as THREE.Object3D)
  }

  // Call the update lifecycle when it is being updated, but only when it is part of the scene
  if (changes.length && instance.parent) updateInstance(instance)
}

export function invalidateInstance(instance: Instance) {
  const state = instance.__r3f?.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}

export function updateInstance(instance: Instance) {
  instance.onUpdate?.(instance)
}
