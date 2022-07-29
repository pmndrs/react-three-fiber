import * as THREE from 'three'
import * as React from 'react'
import { EventHandlers } from './events'
import { Instance, InstanceProps } from './renderer'
import { Dpr, RootState, Size } from './store'

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera
export const isOrthographicCamera = (def: Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' && (window.document?.createElement || window.navigator?.product === 'ReactNative')
    ? React.useLayoutEffect
    : React.useEffect

export function useMutableCallback<T>(fn: T) {
  const ref = React.useRef<T>(fn)
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn])
  return ref
}

export type SetBlock = false | Promise<null> | null
export type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

export function Block({ set }: Omit<UnblockProps, 'children'>) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [set])
  return null
}

export class ErrorBoundary extends React.Component<
  { set: React.Dispatch<any>; children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(error: any) {
    this.props.set(error)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

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
  ((obj as any).__r3f as Instance)?.root.getState()

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

function resolve(root: any, key: string) {
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

export function attach(parent: Instance, child: Instance) {
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

export function detach(parent: Instance, child: Instance) {
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

const DEFAULT = '__default'
const RESERVED_PROPS = [
  // React internal props
  'children',
  'key',
  'ref',
  // Instance props
  'args',
  'dispose',
  'attach',
  // 'object', -- internal to primitives
]

// This function prepares a set of changes to be applied to the instance
export function diffProps(newProps: InstanceProps, oldProps: InstanceProps, remove = false): InstanceProps {
  const changedProps: InstanceProps = {}

  // Sort through props
  for (const key in newProps) {
    // Skip reserved keys
    if (RESERVED_PROPS.includes(key)) continue
    // Skip if props match
    if (is.equ(newProps[key], oldProps[key])) continue

    // Props changed, add them
    changedProps[key] = newProps[key]
  }

  // Catch removed props, prepend them so they can be reset or removed
  if (remove) {
    for (const key in oldProps) {
      if (RESERVED_PROPS.includes(key)) continue
      else if (!newProps.hasOwnProperty(key)) changedProps[key] = DEFAULT + 'remove'
    }
  }

  return changedProps
}

// This function applies a set of changes to the instance
export function applyProps(object: any, props: any) {
  const instance = object.__r3f as Instance | undefined
  const rootState = instance?.root.getState()
  const prevHandlers = instance?.eventCount

  for (const prop in props) {
    let value = props[prop]

    // Don't mutate reserved keys
    if (RESERVED_PROPS.includes(prop)) continue

    // Deal with pointer events ...
    if (instance && /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/.test(prop)) {
      if (value) instance.handlers[prop as keyof EventHandlers] = value as any
      else delete instance.handlers[prop as keyof EventHandlers]
      instance.eventCount = Object.keys(instance.handlers).length
    }

    const { root, key, target } = resolve(object, prop)

    // https://github.com/mrdoob/three.js/issues/21209
    // HMR/fast-refresh relies on the ability to cancel out props, but threejs
    // has no means to do this. Hence we curate a small collection of value-classes
    // with their respective constructor/set arguments
    // For removed props, try to set default values, if possible
    if (value === DEFAULT + 'remove') {
      if (target && target.constructor) {
        // use the prop constructor to find the default it should be
        value = new target.constructor(...(instance?.props.args ?? []))
      } else if (root.constructor) {
        // create a blank slate of the instance and copy the particular parameter.
        // @ts-ignore
        const defaultClassCall = new root.constructor(...(root.__r3f?.props.args ?? []))
        value = defaultClassCall[target]
        // destroy the instance
        if (defaultClassCall.dispose) defaultClassCall.dispose()
      } else {
        // instance does not have constructor, just set it to 0
        value = 0
      }
    }

    // Special treatment for objects with support for set/copy, and layers
    if (target && target.set && (target.copy || target instanceof THREE.Layers)) {
      // If value is an array
      if (Array.isArray(value)) {
        if (target.fromArray) target.fromArray(value)
        else target.set(...value)
      }
      // Test again target.copy(class) next ...
      else if (
        target.copy &&
        value &&
        (value as ClassConstructor).constructor &&
        target.constructor.name === (value as ClassConstructor).constructor.name
      ) {
        target.copy(value)
      }
      // If nothing else fits, just set the single value, ignore undefined
      // https://github.com/pmndrs/react-three-fiber/issues/274
      else if (value !== undefined) {
        const isColor = target instanceof THREE.Color
        // Allow setting array scalars
        if (!isColor && target.setScalar) target.setScalar(value)
        // Layers have no copy function, we must therefore copy the mask property
        else if (target instanceof THREE.Layers && value instanceof THREE.Layers) target.mask = value.mask
        // Otherwise just set ...
        else target.set(value)
      }
      // Else, just overwrite the value
    } else {
      root[key] = value
      // Auto-convert sRGB textures, for now ...
      // https://github.com/pmndrs/react-three-fiber/issues/344
      if (!rootState?.linear && root[key] instanceof THREE.Texture) {
        root[key].encoding = THREE.sRGBEncoding
      }
    }
  }

  if (instance?.parent && rootState?.internal && instance?.object.raycast && prevHandlers !== instance?.eventCount) {
    // Pre-emptively remove the instance from the interaction manager
    const index = rootState.internal.interaction.indexOf(instance.object as unknown as THREE.Object3D)
    if (index > -1) rootState.internal.interaction.splice(index, 1)
    // Add the instance to the interaction manager only when it has handlers
    if (instance.eventCount) rootState.internal.interaction.push(instance.object as unknown as THREE.Object3D)
  }

  if (instance) invalidateInstance(instance)

  return object
}

export function invalidateInstance(instance: Instance) {
  const state = instance.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}

export function updateCamera(camera: Camera & { manual?: boolean }, size: Size) {
  // https://github.com/pmndrs/react-three-fiber/issues/92
  // Do not mess with the camera if it belongs to the user
  if (!camera.manual) {
    if (isOrthographicCamera(camera)) {
      camera.left = size.width / -2
      camera.right = size.width / 2
      camera.top = size.height / 2
      camera.bottom = size.height / -2
    } else {
      camera.aspect = size.width / size.height
    }
    camera.updateProjectionMatrix()
    // https://github.com/pmndrs/react-three-fiber/issues/178
    // Update matrix world since the renderer is a frame late
    camera.updateMatrixWorld()
  }
}
