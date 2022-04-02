import * as THREE from 'three'
import * as React from 'react'
import { UseBoundStore } from 'zustand'
import { EventHandlers } from './events'
import { AttachType, Instance, InstanceProps, LocalState } from './renderer'
import { Dpr, RootState } from './store'

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect on the client.
const isSSR =
  typeof window === 'undefined' || !window.navigator || /ServerSideRendering|^Deno\//.test(window.navigator.userAgent)
export const useIsomorphicLayoutEffect = isSSR ? React.useEffect : React.useLayoutEffect

export type SetBlock = false | Promise<null> | null
export type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

export function Block({ set }: Omit<UnblockProps, 'children'>) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [set])
  return null
}

export class ErrorBoundary extends React.Component<{ set: React.Dispatch<any> }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error: any) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

type noop = (...args: any[]) => any
type PickFunction<T extends noop> = (...args: Parameters<T>) => ReturnType<T>

export function useMemoizedFn<T extends noop>(fn?: T): PickFunction<T> {
  const fnRef = React.useRef<T | undefined>(fn)
  useIsomorphicLayoutEffect(() => void (fnRef.current = fn), [fn])
  return (...args: Parameters<T>) => fnRef.current?.(...args)
}

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

/**
 * Returns instance root state
 */
export const getRootState = (obj: THREE.Object3D): RootState | undefined =>
  (obj as unknown as Instance).__r3f?.root.getState()

/**
 * Picks or omits keys from an object
 * `omit` will filter out keys, and otherwise cherry-pick them.
 */
export function filterKeys<TObj extends { [key: string]: any }, TOmit extends boolean, TKey extends keyof TObj>(
  obj: TObj,
  omit: TOmit,
  ...keys: TKey[]
): TOmit extends true ? Omit<TObj, TKey> : Pick<TObj, TKey> {
  const keysToSelect = new Set(keys)
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const shouldInclude = !omit
    if (keysToSelect.has(key as TKey) === shouldInclude) acc[key] = value
    return acc
  }, {} as any)
}

/**
 * Clones an object and cherry-picks keys.
 */
export const pick = <TObj>(obj: Partial<TObj>, keys: Array<keyof TObj>) =>
  filterKeys<Partial<TObj>, false, keyof TObj>(obj, false, ...keys)

/**
 * Clones an object and prunes or omits keys.
 */
export const omit = <TObj>(obj: Partial<TObj>, keys: Array<keyof TObj>) =>
  filterKeys<Partial<TObj>, true, keyof TObj>(obj, true, ...keys)

export type EquConfig = {
  /** Compare arrays by reference equality a === b (default), or by shallow equality */
  arrays?: 'reference' | 'shallow'
  /** Compare objects by reference equality a === b (default), or by shallow equality */
  objects?: 'reference' | 'shallow'
  /** If true the keys in both a and b must match 1:1 (default), if false a's keys must intersect b's */
  strict?: boolean
}

// A collection of compare functions
export const is = {
  obj: (a: any) => a === Object(a) && !is.arr(a) && typeof a !== 'function',
  fun: (a: any): a is Function => typeof a === 'function',
  str: (a: any): a is string => typeof a === 'string',
  num: (a: any): a is number => typeof a === 'number',
  boo: (a: any): a is boolean => typeof a === 'boolean',
  und: (a: any) => a === void 0,
  arr: (a: any) => Array.isArray(a),
  equ(a: any, b: any, { arrays = 'shallow', objects = 'reference', strict = true }: EquConfig = {}) {
    // Wrong type or one of the two undefined, doesn't match
    if (typeof a !== typeof b || !!a !== !!b) return false
    // Atomic, just compare a against b
    if (is.str(a) || is.num(a)) return a === b
    const isObj = is.obj(a)
    if (isObj && objects === 'reference') return a === b
    const isArr = is.arr(a)
    if (isArr && arrays === 'reference') return a === b
    // Array or Object, shallow compare first to see if it's a match
    if ((isArr || isObj) && a === b) return true
    // Last resort, go through keys
    let i
    for (i in a) if (!(i in b)) return false
    for (i in strict ? b : a) if (a[i] !== b[i]) return false
    if (is.und(i)) {
      if (isArr && a.length === 0 && b.length === 0) return true
      if (isObj && Object.keys(a).length === 0 && Object.keys(b).length === 0) return true
      if (a !== b) return false
    }
    return true
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
      type: '',
      root: null as unknown as UseBoundStore<RootState>,
      previousAttach: null,
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

function resolve(instance: Instance, key: string) {
  let target = instance
  if (key.includes('-')) {
    const entries = key.split('-')
    const last = entries.pop() as string
    target = entries.reduce((acc, key) => acc[key], instance)
    return { target, key: last }
  } else return { target, key }
}

// Checks if a dash-cased string ends with an integer
const INDEX_REGEX = /-\d+$/

export function attach(parent: Instance, child: Instance, type: AttachType) {
  if (is.str(type)) {
    // If attaching into an array (foo-0), create one
    if (INDEX_REGEX.test(type)) {
      const root = type.replace(INDEX_REGEX, '')
      const { target, key } = resolve(parent, root)
      if (!Array.isArray(target[key])) target[key] = []
    }

    const { target, key } = resolve(parent, type)
    child.__r3f.previousAttach = target[key]
    target[key] = child
  } else child.__r3f.previousAttach = type(parent, child)
}

export function detach(parent: Instance, child: Instance, type: AttachType) {
  if (is.str(type)) {
    const { target, key } = resolve(parent, type)
    target[key] = child.__r3f.previousAttach
  } else child.__r3f?.previousAttach?.(parent, child)
  delete child.__r3f?.previousAttach
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
    for (let i = 0; i < previousKeys.length; i++) {
      if (!props.hasOwnProperty(previousKeys[i])) entries.unshift([previousKeys[i], DEFAULT + 'remove'])
    }
  }

  entries.forEach(([key, value]) => {
    // Bail out on primitive object
    if (instance.__r3f?.primitive && key === 'object') return
    // When props match bail out
    if (is.equ(value, previous[key])) return
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
        value = new targetProp.constructor(...memoized.args)
      } else if (currentInstance.constructor) {
        // create a blank slate of the instance and copy the particular parameter.
        // @ts-ignore
        const defaultClassCall = new currentInstance.constructor(...currentInstance.__r3f.memoizedProps.args)
        value = defaultClassCall[targetProp]
        // destory the instance
        if (defaultClassCall.dispose) defaultClassCall.dispose()
        // instance does not have constructor, just set it to 0
      } else {
        value = 0
      }
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
      ) {
        targetProp.copy(value)
      }
      // If nothing else fits, just set the single value, ignore undefined
      // https://github.com/pmndrs/react-three-fiber/issues/274
      else if (value !== undefined) {
        const isColor = targetProp instanceof THREE.Color
        // Allow setting array scalars
        if (!isColor && targetProp.setScalar) targetProp.setScalar(value)
        // Layers have no copy function, we must therefore copy the mask property
        else if (targetProp instanceof THREE.Layers && value instanceof THREE.Layers) targetProp.mask = value.mask
        // Otherwise just set ...
        else targetProp.set(value)
        // For versions of three which don't support THREE.ColorManagement,
        // Auto-convert sRGB colors
        // https://github.com/pmndrs/react-three-fiber/issues/344
        const supportsColorManagement = (THREE as any).ColorManagement
        if (!supportsColorManagement && !rootState.linear && isColor) targetProp.convertSRGBToLinear()
      }
      // Else, just overwrite the value
    } else {
      currentInstance[key] = value
      // Auto-convert sRGB textures, for now ...
      // https://github.com/pmndrs/react-three-fiber/issues/344
      if (!rootState.linear && currentInstance[key] instanceof THREE.Texture) {
        currentInstance[key].encoding = THREE.sRGBEncoding
      }
    }

    invalidateInstance(instance)
  })

  if (localState.parent && rootState.internal && instance.raycast && prevHandlers !== localState.eventCount) {
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(instance as unknown as THREE.Object3D)
    if (index > -1) rootState.internal.interaction.splice(index, 1)
    // Add the instance to the interaction manager only when it has handlers
    if (localState.eventCount) rootState.internal.interaction.push(instance as unknown as THREE.Object3D)
  }

  // Call the update lifecycle when it is being updated, but only when it is part of the scene
  if (changes.length && instance.parent) updateInstance(instance)

  return instance
}

export function invalidateInstance(instance: Instance) {
  const state = instance.__r3f?.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}

export function updateInstance(instance: Instance) {
  instance.onUpdate?.(instance)
}
