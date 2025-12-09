/**
 * @fileoverview Pluggable GL Context Provider
 *
 * Allows swapping the GL context implementation (expo-gl, react-native-webgpu, etc.)
 * Default uses expo-gl's GLView.
 *
 * Usage with custom GL provider:
 *   import { Canvas, GLContextProvider } from '@react-three/native'
 *   import { WebGPUView } from 'react-native-webgpu'
 *
 *   <GLContextProvider value={{ GLView: WebGPUView, contextType: 'webgpu' }}>
 *     <Canvas>...</Canvas>
 *   </GLContextProvider>
 */

import * as React from 'react'
import type { ComponentType } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'

//* Types ==============================

export interface GLViewProps {
  /** MSAA samples for antialiasing (expo-gl specific) */
  msaaSamples?: number
  /** Callback when GL context is created */
  onContextCreate: (context: any) => void
  /** Style for the GL view */
  style?: StyleProp<ViewStyle>
}

export interface GLContextValue {
  /** The GL View component to render */
  GLView: ComponentType<GLViewProps>
  /** Type of context: 'webgl' | 'webgpu' */
  contextType: 'webgl' | 'webgpu'
  /** Whether this context requires async initialization */
  asyncInit?: boolean
}

export interface GLContextProps {
  children: React.ReactNode
  value: GLContextValue
}

//* Default Context (expo-gl) ==============================

let defaultGLContext: GLContextValue | null = null

function getDefaultGLContext(): GLContextValue {
  if (!defaultGLContext) {
    try {
      // Dynamic import to avoid hard dependency
      const { GLView } = require('expo-gl')
      defaultGLContext = {
        GLView,
        contextType: 'webgl',
        asyncInit: false,
      }
    } catch (e) {
      throw new Error(
        '[@react-three/native] expo-gl not found. ' + 'Either install expo-gl or provide a custom GLContextProvider.',
      )
    }
  }
  return defaultGLContext
}

//* Context ==============================

const GLContext = React.createContext<GLContextValue | null>(null)

/**
 * Provider for custom GL context implementations.
 * Use this to swap expo-gl for react-native-webgpu or other GL providers.
 */
export function GLContextProvider({ children, value }: GLContextProps): React.JSX.Element {
  return <GLContext.Provider value={value}>{children}</GLContext.Provider>
}

/**
 * Hook to get the current GL context configuration.
 * Falls back to expo-gl if no provider is present.
 */
export function useGLContext(): GLContextValue {
  const context = React.useContext(GLContext)
  return context ?? getDefaultGLContext()
}
