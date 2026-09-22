export const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | undefined)?.then === 'function'

/** A promise tagged with its state, the protocol React's `use` reads */
export type TrackedPromise<T> = Promise<T> &
  ({ status: 'pending' } | { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: unknown })

export const fulfilled = <T>(value: T): TrackedPromise<T> =>
  Object.assign(Promise.resolve(value), { status: 'fulfilled', value } as const)

export const rejected = <T>(reason: unknown): TrackedPromise<T> => {
  const promise = Promise.reject<T>(reason)
  promise.catch(() => {}) // the reason is read from `status`
  return Object.assign(promise, { status: 'rejected', reason } as const)
}

/** Tags `promise` in place once it settles. */
export const tracked = <T>(promise: PromiseLike<T>): TrackedPromise<T> => {
  const result = Promise.resolve(promise) as TrackedPromise<T>
  result.status = 'pending'
  // Statement bodies: returning `result` would make this derived promise adopt its rejection
  result.then(
    (value) => {
      Object.assign(result, { status: 'fulfilled', value })
    },
    (reason) => {
      Object.assign(result, { status: 'rejected', reason })
    },
  )
  return result
}
