import type { TrackedPromise } from '#types'

export const isPromiseLike = <T>(value: T | PromiseLike<T>): value is PromiseLike<T> =>
  typeof (value as PromiseLike<T> | undefined)?.then === 'function'

export const fulfilled = <T>(value: T): TrackedPromise<T> =>
  Object.assign(Promise.resolve(value), { status: 'fulfilled', value } as const)

export const rejected = <T>(reason: unknown): TrackedPromise<T> => {
  const promise = Promise.reject<T>(reason)
  promise.catch(() => {}) // the reason is read from `status`
  return Object.assign(promise, { status: 'rejected', reason } as const)
}

/** A pending promise, settled once from outside. Its `status` updates the moment it settles */
export const deferred = <T>() => {
  let resolve!: (_value: T) => void
  let reject!: (_reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = (value) => {
      Object.assign(promise, { status: 'fulfilled', value })
      yes(value)
    }
    reject = (reason) => {
      Object.assign(promise, { status: 'rejected', reason })
      no(reason)
    }
  }) as TrackedPromise<T>
  promise.status = 'pending'
  promise.catch(() => {}) // the reason is read from `status`
  return { promise, resolve, reject }
}

/** Apply immediately to a value, or after a genuinely asynchronous dependency settles. */
export function resolveThen<T, R>(value: T | PromiseLike<T>, apply: (value: T) => R | Promise<R>): R | Promise<R> {
  return isPromiseLike(value) ? Promise.resolve(value).then(apply) : apply(value)
}
