import type { TrackedPromise } from '#types'

export const fulfilled = <T>(value: T): TrackedPromise<T> =>
  Object.assign(Promise.resolve(value), { status: 'fulfilled', value } as const)

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
