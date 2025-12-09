/**
 * @fileoverview React Native bindings for @react-three/fiber
 *
 * This package provides React Native support for react-three-fiber.
 * It re-exports core fiber functionality and adds native-specific Canvas and polyfills.
 *
 * Usage:
 *   import { Canvas } from '@react-three/native'
 *
 * With custom GL context provider:
 *   import { Canvas, GLContextProvider } from '@react-three/native'
 *   <GLContextProvider value={MyCustomGLView}>
 *     <Canvas>...</Canvas>
 *   </GLContextProvider>
 */

// Re-export everything from fiber for convenience
export * from '@react-three/fiber'

// Native-specific exports
export { Canvas, type CanvasProps } from './Canvas'
export { polyfills } from './polyfills'
export { createTouchEvents as events } from './events'

// Pluggable GL context
export { GLContextProvider, useGLContext, type GLContextValue, type GLContextProps } from './context'

// Initialize polyfills on import (can be disabled by not importing from root)
import { Platform } from 'react-native'
import { polyfills } from './polyfills'

if (Platform.OS !== 'web') {
  polyfills()
}
