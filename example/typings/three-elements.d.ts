/**
 * Three.js JSX Elements Type Augmentation
 *
 * During development (with stubs), declaration resolution is incomplete.
 * This directly augments the JSX IntrinsicElements with Three.js element types.
 *
 * This is only needed for development - the built package has correct types.
 */

import type { ThreeToJSXElements, ThreeElements } from '@react-three/fiber'
import type * as THREE from 'three/webgpu'

type ThreeJSXElements = Omit<ThreeToJSXElements<typeof THREE>, 'audio' | 'source' | 'line' | 'path'>

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSXElements {
      primitive: ThreeElements['primitive']
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSXElements {
      primitive: ThreeElements['primitive']
    }
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSXElements {
      primitive: ThreeElements['primitive']
    }
  }
}
