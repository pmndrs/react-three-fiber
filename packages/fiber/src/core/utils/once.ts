//* Mount-Only Method Calls ==============================
// Utility for calling methods only on initial mount

/**
 * Symbol marker for mount-only method calls.
 * Used to identify methods that should only be called once on initial mount.
 */
export const ONCE = Symbol.for('@react-three/fiber.once')

/**
 * Marks a method call to be executed only on initial mount.
 * Useful for geometry transforms that should not be reapplied on every render.
 *
 * When `args` prop changes (triggering reconstruction), the method will be
 * called again on the new instance since appliedOnce is not carried over.
 *
 * @param args - Arguments to pass to the method
 * @returns A marker value that applyProps will execute once
 *
 * @example
 * // Rotate geometry on mount
 * <boxGeometry args={[1, 1, 1]} rotateX={once(Math.PI / 2)} />
 *
 * // Multiple arguments
 * <bufferGeometry applyMatrix4={once(matrix)} />
 *
 * // No arguments
 * <geometry center={once()} />
 */
export function once<A extends unknown[]>(...args: A): OnceValue<A> {
  return { [ONCE]: args.length ? args : true } as unknown as OnceValue<A>
}

/**
 * What `once(...args)` is typed as, so the marker is assignable to the prop it targets:
 * the single argument itself (`rotateX={once(angle)}`), the argument tuple for multi-argument
 * methods (`translate={once(x, y, z)}`), or `true` for a bare call (`center={once()}`).
 *
 * The runtime value is always the marker object; only the declared type follows the prop.
 */
export type OnceValue<A extends unknown[]> = A extends [] ? true : A extends [infer Single] ? Single : A

/**
 * Type guard to check if a value is a once marker.
 *
 * @param value - Value to check
 * @returns True if value is a once marker
 */
export function isOnce(value: unknown): value is { [ONCE]: any[] | true } {
  return value !== null && typeof value === 'object' && ONCE in value
}
