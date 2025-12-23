import * as THREE from '#three'

import type {
  Dpr,
  RootStore,
  Size,
  EventHandlers,
  Instance,
  NonFunctionKeys,
  Overwrite,
  Properties,
  Mutable,
  IsOptional,
  IsAllOptional,
  Act,
  ThreeCamera,
  Bridge,
  SetBlock,
  UnblockProps,
  ObjectMap,
  EquConfig,
  Disposable,
} from '#types'

// Base is util for common patterns

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

//* Quick utils for common cases ==============================

export const isOrthographicCamera = (def: ThreeCamera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera

export const isRef = (obj: unknown): obj is React.RefObject<unknown> =>
  obj !== null && typeof obj === 'object' && obj.hasOwnProperty('current')

export const isColorRepresentation = (value: unknown): value is THREE.ColorRepresentation =>
  value != null && (typeof value === 'string' || typeof value === 'number' || (value as THREE.Color).isColor)

export const isObject3D = (object: any): object is THREE.Object3D => object?.isObject3D

export const isTexture = (value: unknown): value is THREE.Texture => !!(value as THREE.Texture | undefined)?.isTexture

type VectorLike = { set: (...args: any[]) => void; constructor?: Function }

export const isVectorLike = (object: unknown): object is VectorLike =>
  object !== null && typeof object === 'object' && 'set' in object && typeof object.set === 'function'

type Copyable = { copy: (...args: any[]) => void; constructor?: Function }
export const isCopyable = (object: unknown): object is Copyable =>
  isVectorLike(object) && 'copy' in object && typeof object.copy === 'function'

export const hasConstructor = (object: unknown): object is { constructor?: Function } => !!(object as any)?.constructor
