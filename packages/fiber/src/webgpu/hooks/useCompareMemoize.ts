import { useRef, useMemo } from 'react'
import { dequal } from 'dequal/lite'
import { shallow } from 'zustand/shallow'

/**
 * A memoization hook that returns the previous value if the new value is equal
 * according to the specified comparison method (shallow or deep).
 *
 * @internal - Utility for useShallowMemo and useDeepMemo
 *
 * This is useful for preventing unnecessary re-renders when passing objects or
 * arrays as dependencies that are recreated on each render but have the same values.
 *
 * **Difference from useMemo:**
 * - `useMemo` uses referential equality (===) to compare dependencies. If you pass
 *   a new object/array, it always recomputes, even if the contents are identical.
 * - `useCompareMemoize` compares the actual values (shallow or deep), not references.
 *   It returns the previous value if the contents haven't changed, even if it's a new object.
 *
 * @param value - The value to memoize
 * @param deep - If true, uses deep equality comparison. If false, uses shallow comparison
 * @returns The memoized value (either the new value or the previous value if equal)
 *
 * @example
 * // Problem with useMemo - always recomputes because config is a new object each render
 * function WithUseMemo({ user }) {
 *   const config = useMemo(() => ({ name: user.name, age: user.age }), [{ name: user.name, age: user.age }])
 *   // ❌ config changes every render because dependency is a new object
 * }
 *
 * // Solution with useCompareMemoize - compares values, not references
 * function WithCompareMemoize({ user }) {
 *   const config = { name: user.name, age: user.age }
 *   const memoizedConfig = useCompareMemoize(config, false)
 *   // ✅ memoizedConfig only changes when name or age values actually change
 *
 *   useEffect(() => {
 *     console.log('Config changed:', memoizedConfig)
 *   }, [memoizedConfig])
 * }
 */
export function useCompareMemoize(value: any, deep: boolean) {
  const ref = useRef()
  const compare = deep ? dequal : shallow

  if (!compare(value, ref.current)) {
    ref.current = value
  }

  return ref.current
}

/**
 * A version of useMemo that uses shallow equality comparison for dependencies.
 *
 * This is useful when you want to memoize a computed value but your dependencies
 * are recreated on each render (e.g., objects or arrays with the same values).
 *
 * @param fn - The function that computes the memoized value
 * @param deps - The dependency list to compare using shallow equality
 * @returns The memoized value
 *
 * @example
 * function MyComponent({ user }) {
 *   const fullName = useShallowMemo(
 *     () => `${user.firstName} ${user.lastName}`,
 *     [user]
 *   )
 *   // fullName only recomputes when user object values change
 * }
 */
export function useShallowMemo<T>(fn: () => T, deps: React.DependencyList | undefined) {
  // NOTE: useMemo implementation allows undefined, but types do not
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(fn, useCompareMemoize(deps, false) ?? [])
}

/**
 * A version of useMemo that uses deep equality comparison for dependencies.
 *
 * This is useful when you have nested objects/arrays as dependencies and want
 * to avoid recomputing when the deep values haven't actually changed.
 *
 * @param fn - The function that computes the memoized value
 * @param deps - The dependency list to compare using deep equality
 * @returns The memoized value
 *
 * @example
 * function MyComponent({ filters }) {
 *   const processedData = useDeepMemo(
 *     () => expensiveComputation(filters),
 *     [filters]
 *   )
 *   // processedData only recomputes when filters deeply changes
 * }
 */
export function useDeepMemo<T>(fn: () => T, deps: React.DependencyList | undefined) {
  // NOTE: useMemo implementation allows undefined, but types do not
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(fn, useCompareMemoize(deps, true) ?? [])
}
