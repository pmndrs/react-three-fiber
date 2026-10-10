import type { StateCreator, StoreApi } from 'zustand'
// Direct type-file import, not the #types barrel: useFrame (part of the three-free extension entry)
// imports this module, and the barrel side-effect-imports the JSX element augmentation
import type { RootState } from '../../../types/store'
import { notifyDepreciated } from './notices'
import { isInternalRendererAccess } from './isInternalRendererAccess'

//* Renderer accessors on root state ==============================
// `state.renderer` and `state.gl` are accessors over `internal.actualRenderer`, so both always name
// the renderer the root holds, and `gl` can log its deprecation notice when a WebGPU root reads it.
//
// Accessors do not survive a plain copy: zustand's set() builds the next state with Object.assign,
// and a spread does the same, both reading each getter once and storing the value. After the first
// update `gl` was a plain field frozen at its initial `null` (#4014). The helpers below copy property
// descriptors instead of values, so every state object a store holds keeps the accessors.

type AnyState = Record<PropertyKey, any>

const isAccessorDescriptor = (descriptor: PropertyDescriptor | undefined): boolean =>
  !!descriptor && (descriptor.get !== undefined || descriptor.set !== undefined)

/** Whether `key` is an accessor on `object` itself, so reading it would run a getter. */
export const isAccessor = (object: object, key: PropertyKey): boolean =>
  isAccessorDescriptor(Object.getOwnPropertyDescriptor(object, key))

/**
 * Shallow-merges state objects like a spread, later sources winning, but copies accessors as
 * accessors instead of reading them.
 */
export function cloneState<T extends object>(...sources: Array<Partial<T> | null | undefined>): T {
  const target = {} as T
  for (const source of sources) {
    if (source) Object.defineProperties(target, Object.getOwnPropertyDescriptors(source))
  }
  return target
}

/**
 * Wraps a zustand store's set() so the next state keeps the previous state's accessors. A patch
 * value for an accessor goes through its setter, after the patch's plain fields (such as a new
 * `internal`) are in place; an accessor on the patch itself is copied as an accessor.
 */
export function preserveAccessors<T extends object>(
  rawSet: StoreApi<T>['setState'],
  get: StoreApi<T>['getState'],
): StoreApi<T>['setState'] {
  return ((partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: boolean) => {
    const previous = get()
    const patch = typeof partial === 'function' ? (partial as (state: T) => T | Partial<T>)(previous) : partial
    if (replace || !previous || patch == null || Object.is(patch, previous)) {
      return (rawSet as (state: any, replace?: boolean) => void)(patch, replace)
    }

    const next = cloneState<AnyState>(previous)
    const viaSetter: PropertyKey[] = []
    for (const key of Reflect.ownKeys(patch)) {
      const descriptor = Object.getOwnPropertyDescriptor(patch, key)!
      if (!descriptor.enumerable) continue
      if (isAccessorDescriptor(descriptor)) {
        Object.defineProperty(next, key, descriptor)
      } else if (isAccessor(next, key)) {
        viaSetter.push(key)
      } else {
        Object.defineProperty(next, key, {
          value: descriptor.value,
          writable: true,
          enumerable: true,
          configurable: true,
        })
      }
    }
    for (const key of viaSetter) next[key as any] = (patch as AnyState)[key as any]
    ;(rawSet as (state: any, replace: true) => void)(next, true)
  }) as StoreApi<T>['setState']
}

/** zustand middleware form of {@link preserveAccessors}: the initializer and `api.setState` get it. */
export const keepAccessors =
  <T extends object>(initializer: StateCreator<T, [], []>): StateCreator<T, [], []> =>
  (rawSet, get, api) => {
    const set = preserveAccessors(rawSet, get)
    api.setState = set
    return initializer(set, get, api)
  }

let glNoticeShown = false

/**
 * Installs the `renderer` and `gl` accessors on a root state object. They read through `this`, so
 * a state object copied with {@link cloneState} or {@link keepAccessors} answers for itself.
 */
export function defineRendererAccessors(state: RootState): void {
  Object.defineProperty(state, 'gl', {
    get(this: RootState) {
      const renderer = this.internal?.actualRenderer
      // Warn once when a WebGPU root is read through `gl`. Skip reads made by library plumbing
      // that walks every enumerable getter (zustand, Object.assign); see isInternalRendererAccess.
      if (!glNoticeShown && renderer && !this.isLegacy) {
        const stack = new Error().stack || ''
        if (!isInternalRendererAccess(stack)) {
          glNoticeShown = true
          const cleanedStack = stack.split('\n').slice(2).join('\n') || 'Stack trace unavailable'
          notifyDepreciated({
            heading: 'Accessing state.gl in WebGPU mode',
            body:
              'Please use state.renderer instead. state.gl is deprecated and will be removed in future versions.\n\n' +
              'For backwards compatibility, state.gl currently maps to state.renderer, but this may cause issues with libraries expecting WebGLRenderer.\n\n' +
              'Accessed from:\n' +
              cleanedStack,
          })
        }
      }
      return renderer
    },
    set(this: RootState, value) {
      this.internal.actualRenderer = value
    },
    enumerable: true,
    configurable: true,
  })

  Object.defineProperty(state, 'renderer', {
    get(this: RootState) {
      return this.internal?.actualRenderer
    },
    set(this: RootState, value) {
      this.internal.actualRenderer = value
    },
    enumerable: true,
    configurable: true,
  })
}
