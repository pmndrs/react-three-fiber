import type * as React from 'react'

//* Deferred Ref Resolution ==============================
// Utility for deferring prop application until refs are populated

/**
 * Symbol marker for deferred ref resolution.
 * Used to identify values that should be resolved from refs after mount.
 */
export const FROM_REF = Symbol.for('@react-three/fiber.fromRef')

/** The marker `fromRef()` returns; resolved by the reconciler in `commitMount`. */
export interface FromRefMarker<T = unknown, R = T> {
  [FROM_REF]: React.RefObject<T | null>
  /** Optional transform applied to the resolved ref before assignment. */
  transform?: (value: T) => R
}

/**
 * Defers prop application until the referenced object is available.
 * Useful for props like `target` that need sibling refs to be populated.
 *
 * Only top-level props on a three element are resolved: a marker nested inside another value
 * (an array, an options object) is never seen. When the prop needs the sibling *wrapped* rather
 * than assigned as-is, pass a `transform`; it runs once the ref is populated and its result is
 * what gets assigned.
 *
 * @param ref - React ref object to resolve at mount time
 * @param transform - Optional mapping from the resolved object to the value the prop expects
 * @returns A marker value that the reconciler resolves after mount
 *
 * @example
 * const targetRef = useRef<THREE.Object3D>(null)
 *
 * <group ref={targetRef} position={[-3, -2, -15]} />
 * <spotLight target={fromRef(targetRef)} intensity={100} />
 *
 * @example
 * // Wrap the sibling: a node material's lightsNode needs a LightsNode, not the light itself
 * <meshPhongNodeMaterial lightsNode={fromRef(lightRef, (light) => lights([light]))} />
 */
export function fromRef<T>(ref: React.RefObject<T | null>): T
export function fromRef<T, R>(ref: React.RefObject<T | null>, transform: (value: T) => R): R
export function fromRef<T, R = T>(ref: React.RefObject<T | null>, transform?: (value: T) => R): R {
  const marker: FromRefMarker<T, R> = { [FROM_REF]: ref }
  if (transform) marker.transform = transform
  return marker as unknown as R
}

/**
 * Type guard to check if a value is a fromRef marker.
 *
 * @param value - Value to check
 * @returns True if value is a fromRef marker
 */
export function isFromRef(value: unknown): value is FromRefMarker<any, unknown> {
  return value !== null && typeof value === 'object' && FROM_REF in value
}
