import * as THREE from 'three'
import * as React from 'react'
import { useFiber, traverseFiber, useContextBridge } from 'its-fine'
import { Instance } from './reconciler'
import type { Fiber } from 'react-reconciler'
import type { EventHandlers } from './events'
import type { Dpr, Renderer, RootStore, Size } from './store'

export type NonFunctionKeys<P> = { [K in keyof P]-?: P[K] extends Function ? never : K }[keyof P]
export type Overwrite<P, O> = Omit<P, NonFunctionKeys<O>> & O
export type Properties<T> = Pick<T, NonFunctionKeys<T>>
export type Mutable<P> = { [K in keyof P]: P[K] | Readonly<P[K]> }
export type IsOptional<T> = undefined extends T ? true : false
export type IsAllOptional<T extends any[]> = T extends [infer First, ...infer Rest]
  ? IsOptional<First> extends true
    ? IsAllOptional<Rest>
    : false
  : true

/**
 * Returns the instance's initial (outmost) root.
 */
export function findInitialRoot<T>(instance: Instance<T>): RootStore {
  let root = instance.root
  while (root.getState().previousRoot) root = root.getState().previousRoot!
  return root
}

export type Act = <T = any>(cb: () => Promise<T>) => Promise<T>

/**
 * Safely flush async effects when testing, simulating a legacy root.
 */
export const act: Act = (React as any).act

export type Camera = (THREE.OrthographicCamera | THREE.PerspectiveCamera) & { manual?: boolean }
export const isOrthographicCamera = (def: Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera
export const isRef = (obj: any): obj is React.RefObject<unknown> => obj && obj.hasOwnProperty('current')

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
export const useIsomorphicLayoutEffect = /* @__PURE__ */ (() =>
  typeof window !== 'undefined' && (window.document?.createElement || window.navigator?.product === 'ReactNative'))()
  ? React.useLayoutEffect
  : React.useEffect

export function useMutableCallback<T>(fn: T): React.RefObject<T> {
  const ref = React.useRef<T>(fn)
  useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn])
  return ref
}

export type Bridge = React.FC<{ children?: React.ReactNode }>

/**
 * Bridges renderer Context and StrictMode from a primary renderer.
 */
export function useBridge(): Bridge {
  const fiber = useFiber()
  const ContextBridge = useContextBridge()

  return React.useMemo(
    () =>
      ({ children }) => {
        const strict = !!traverseFiber(fiber, true, (node) => node.type === React.StrictMode)
        const Root = strict ? React.StrictMode : React.Fragment

        return (
          <Root>
            <ContextBridge>{children}</ContextBridge>
          </Root>
        )
      },
    [fiber, ContextBridge],
  )
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

// NOTE: static members get down-level transpiled to mutations which break tree-shaking
export const ErrorBoundary = /* @__PURE__ */ (() =>
  class ErrorBoundary extends React.Component<
    { set: React.Dispatch<Error | undefined>; children: React.ReactNode },
    { error: boolean }
  > {
    state = { error: false }
    static getDerivedStateFromError = () => ({ error: true })
    componentDidCatch(err: Error) {
      this.props.set(err)
    }
    render() {
      return this.state.error ? null : this.props.children
    }
  })()

export interface ObjectMap {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
}

export function calculateDpr(dpr: Dpr): number {
  // Err on the side of progress by assuming 2x dpr if we can't detect it
  // This will happen in workers where window is defined but dpr isn't.
  const target = typeof window !== 'undefined' ? window.devicePixelRatio ?? 2 : 1
  return Array.isArray(dpr) ? Math.min(Math.max(dpr[0], target), dpr[1]) : dpr
}

/**
 * Returns instance root state
 */
export function getRootState<T extends THREE.Object3D = THREE.Object3D>(obj: T) {
  return (obj as Instance<T>['object']).__r3f?.root.getState()
}

export interface EquConfig {
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
  nul: (a: any) => a === null,
  arr: (a: any) => Array.isArray(a),
  equ(a: any, b: any, { arrays = 'shallow', objects = 'reference', strict = true }: EquConfig = {}) {
    // Wrong type or one of the two undefined, doesn't match
    if (typeof a !== typeof b || !!a !== !!b) return false
    // Atomic, just compare a against b
    if (is.str(a) || is.num(a) || is.boo(a)) return a === b
    const isObj = is.obj(a)
    if (isObj && objects === 'reference') return a === b
    const isArr = is.arr(a)
    if (isArr && arrays === 'reference') return a === b
    // Array or Object, shallow compare first to see if it's a match
    if ((isArr || isObj) && a === b) return true
    // Last resort, go through keys
    let i
    // Check if a has all the keys of b
    for (i in a) if (!(i in b)) return false
    // Check if values between keys match
    if (isObj && arrays === 'shallow' && objects === 'shallow') {
      for (i in strict ? b : a) if (!is.equ(a[i], b[i], { strict, objects: 'reference' })) return false
    } else {
      for (i in strict ? b : a) if (a[i] !== b[i]) return false
    }
    // If i is undefined
    if (is.und(i)) {
      // If both arrays are empty we consider them equal
      if (isArr && a.length === 0 && b.length === 0) return true
      // If both objects are empty we consider them equal
      if (isObj && Object.keys(a).length === 0 && Object.keys(b).length === 0) return true
      // Otherwise match them by value
      if (a !== b) return false
    }
    return true
  },
}

// Collects nodes and materials from a THREE.Object3D
export function buildGraph(object: THREE.Object3D): ObjectMap {
  const data: ObjectMap = { nodes: {}, materials: {} }
  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) data.nodes[obj.name] = obj
      if (obj.material && !data.materials[obj.material.name]) data.materials[obj.material.name] = obj.material
    })
  }
  return data
}

export interface Disposable {
  type?: string
  dispose?: () => void
}

// Disposes an object and all its properties
export function dispose<T extends Disposable>(obj: T): void {
  if (obj.type !== 'Scene') obj.dispose?.()
  for (const p in obj) {
    const prop = obj[p] as Disposable | undefined
    if (prop?.type !== 'Scene') prop?.dispose?.()
  }
}

export const REACT_INTERNAL_PROPS = ['children', 'key', 'ref']

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

export const RESERVED_PROPS = [
  ...REACT_INTERNAL_PROPS,
  // Instance props
  'args',
  'dispose',
  'attach',
  'object',
  'onUpdate',
  // Behavior flags
  'dispose',
]

const MEMOIZED_PROTOTYPES = new Map()

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

// This function prepares a set of changes to be applied to the instance
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

// https://github.com/mrdoob/three.js/pull/27042
// https://github.com/mrdoob/three.js/pull/22748
const colorMaps = ['map', 'emissiveMap', 'sheenColorMap', 'specularColorMap', 'envMap']

const EVENT_REGEX = /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/

type ClassConstructor = { new (): void }

// This function applies a set of changes to the instance
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

    // Copy if properties match signatures
    if (
      target?.copy &&
      (value as ClassConstructor | undefined)?.constructor &&
      (target as ClassConstructor).constructor === (value as ClassConstructor).constructor
    ) {
      // fetch the default state of the target
      const ctor = getMemoizedPrototype(root)
      // The target key was originally null or undefined, which indicates that the object which
      // is now present was externally set by the user, we should therefore assign the value directly
      if (!is.und(ctor) && (is.und(ctor[key]) || is.nul(ctor[key]))) root[key] = value
      // Otherwise copy is correct
      else target.copy(value)
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
    // Set literal types
    else if (target?.set && typeof value !== 'object' && typeof target === 'object') {
      const isColor = (target as unknown as THREE.Color | undefined)?.isColor
      // Allow setting array scalars
      if (!isColor && target.setScalar && typeof value === 'number') target.setScalar(value)
      // Otherwise just set single value
      else target.set(value)
    }
    // Else, just overwrite the value
    else {
      root[key] = value

      // Auto-convert sRGB texture parameters for built-in materials
      // https://github.com/pmndrs/react-three-fiber/issues/344
      // https://github.com/mrdoob/three.js/pull/25857
      if (
        rootState &&
        !rootState.linear &&
        colorMaps.includes(key) &&
        (root[key] as unknown as THREE.Texture | undefined)?.isTexture &&
        // sRGB textures must be RGBA8 since r137 https://github.com/mrdoob/three.js/pull/23129
        root[key].format === THREE.RGBAFormat &&
        root[key].type === THREE.UnsignedByteType
      ) {
        // NOTE: this cannot be set from the renderer (e.g. sRGB source textures rendered to P3)
        root[key].colorSpace = THREE.SRGBColorSpace
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

export function invalidateInstance(instance: Instance): void {
  if (!instance.parent) return

  instance.props.onUpdate?.(instance.object)

  const state = instance.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}

export function updateCamera(camera: Camera, size: Size): void {
  // Do not mess with the camera if it belongs to the user
  // https://github.com/pmndrs/react-three-fiber/issues/92
  if (camera.manual) return

  if (isOrthographicCamera(camera)) {
    camera.left = size.width / -2
    camera.right = size.width / 2
    camera.top = size.height / 2
    camera.bottom = size.height / -2
  } else {
    camera.aspect = size.width / size.height
  }

  camera.updateProjectionMatrix()
}

export const isObject3D = (object: any): object is THREE.Object3D => object?.isObject3D
