/**
 * Three.js JSX Elements Type Augmentation
 *
 * Each fiber entry augments react's `JSX.IntrinsicElements` with its own element map. The example
 * app compiles fiber from source through tsconfig paths, and resolves `react` from its own
 * node_modules, so that augmentation lands on a different module identity than the demos see.
 * Re-declare it here against the example's `react`, from the root entry's map (both renderers).
 *
 * This is only needed for development - the built package has correct types.
 */

import type { ThreeElements } from '@react-three/fiber'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
