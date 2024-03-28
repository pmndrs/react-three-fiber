import * as THREE from 'three'
import * as React from 'react'
import { useFiber, traverseFiber, useContextBridge } from 'its-fine'
import { Instance, catalogue } from './reconciler'
import type { Fiber } from 'react-reconciler'
import type { EventHandlers } from './events'
import type { Dpr, Renderer, RootStore, Size } from './store'

/**
 * Returns the instance's initial (outmost) root.
 */
export function findInitialRoot<T>(instance: Instance<T>): RootStore {
  let root = instance.root
  // TODO: this needs testing https://github.com/pmndrs/react-three-fiber/commit/a4a31ed93c48d1e6dac91329bb5f2ca6a25e5f9c
  // while (root.getState().previousRoot) root = root.getState().previousRoot!
  return root
}

/**
 * Returns `true` with correct TS type inference if an object has a configurable color space (since r152).
 */
export const hasColorSpace = <
  T extends Renderer | THREE.Texture | object,
  P = T extends Renderer ? { outputColorSpace: string } : { colorSpace: string },
>(
  object: T,
): object is T & P => 'colorSpace' in object || 'outputColorSpace' in object

export type ColorManagementRepresentation = { enabled: boolean | never } | { legacyMode: boolean | never }

/**
 * The current THREE.ColorManagement instance, if present.
 */
export const getColorManagement = (): ColorManagementRepresentation | null => (catalogue as any).ColorManagement ?? null

export type Act = <T = any>(cb: () => Promise<T>) => Promise<T>

/**
 * Safely flush async effects when testing, simulating a legacy root.
 */
export const act: Act = (React as any).act

export type Camera = (THREE.OrthographicCamera | THREE.PerspectiveCamera) & { manual?: boolean }
export const isOrthographicCamera = (def: Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera
export const isRef = (obj: any): obj is React.MutableRefObject<unknown> => obj && obj.hasOwnProperty('current')

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

export function useMutableCallback<T>(fn: T): React.MutableRefObject<T> {
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

export class ErrorBoundary extends React.Component<
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
}

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
    if (object) {
      object.__r3f = instance
      if (type) applyProps(object, instance.props)
    }
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
  // Behavior flags
  'dispose',
]

export const DEFAULTS = new Map()

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
      if (root.constructor && root.constructor.length === 0) {
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

type ClassConstructor = { new (): void }
const __DEV__ = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

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
    if (
      target?.copy &&
      // Some environments may break strict identity checks by duplicating versions of three.js.
      // Loosen to unminified names, ignoring descendents.
      // https://github.com/pmndrs/react-three-fiber/issues/2856
      // TODO: fix upstream and remove in v9
      (__DEV__
        ? target.constructor.name === (value as ClassConstructor).constructor.name
        : target.constructor === (value as ClassConstructor).constructor)
    ) {
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

  // Auto-attach geometries and materials
  if (instance && instance.props.attach === undefined) {
    if (instance.object instanceof THREE.BufferGeometry) instance.props.attach = 'geometry'
    else if (instance.object instanceof THREE.Material) instance.props.attach = 'material'
  }

  if (instance) invalidateInstance(instance)

  return object
}

export function invalidateInstance(instance: Instance): void {
  const state = instance.root?.getState?.()
  if (state && state.internal.frames === 0) state.invalidate()
}

export function updateCamera(camera: Camera, size: Size): void {
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

/**
 * Get a handle to the current global scope in window and worker contexts if able
 * https://github.com/pmndrs/react-three-fiber/pull/2493
 */
export const globalScope =
  (typeof global !== 'undefined' && global) ||
  (typeof self !== 'undefined' && self) ||
  (typeof window !== 'undefined' && window)

export const isObject3D = (object: any): object is THREE.Object3D => object?.isObject3D
