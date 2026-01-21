import type * as React from 'react'

//* Deferred Ref Resolution ==============================
// Utility for deferring prop application until refs are populated

/**
 * Symbol marker for deferred ref resolution.
 * Used to identify values that should be resolved from refs after mount.
 */
export const FROM_REF = Symbol.for('@react-three/fiber.fromRef')

/**
 * Defers prop application until the referenced object is available.
 * Useful for props like `target` that need sibling refs to be populated.
 *
 * @param ref - React ref object to resolve at mount time
 * @returns A marker value that applyProps will resolve after mount
 *
 * @example
 * const targetRef = useRef<THREE.Object3D>(null)
 *
 * <group ref={targetRef} position={[-3, -2, -15]} />
 * <spotLight target={fromRef(targetRef)} intensity={100} />
 */
export function fromRef<T>(ref: React.RefObject<T | null>): T {
  return { [FROM_REF]: ref } as unknown as T
}

/**
 * Type guard to check if a value is a fromRef marker.
 *
 * @param value - Value to check
 * @returns True if value is a fromRef marker
 */
export function isFromRef(value: unknown): value is { [FROM_REF]: React.RefObject<any> } {
  return value !== null && typeof value === 'object' && FROM_REF in value
}
