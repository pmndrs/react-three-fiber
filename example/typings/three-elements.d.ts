/**
 * Three.js JSX Elements Type Augmentation
 *
 * During development (with stubs), the #three alias resolution doesn't
 * provide complete type information. This directly augments the JSX
 * IntrinsicElements with Three.js element types.
 *
 * This is only needed for development - the built package has correct types.
 */

import type { ThreeToJSXElements, ThreeElement } from '@react-three/fiber'
import type * as THREE from 'three'

type ThreeJSXElements = ThreeToJSXElements<typeof THREE>

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSXElements {
      primitive: Omit<ThreeElement<any>, 'args'> & { object: object }
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSXElements {
      primitive: Omit<ThreeElement<any>, 'args'> & { object: object }
    }
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeJSXElements {
      primitive: Omit<ThreeElement<any>, 'args'> & { object: object }
    }
  }
}
