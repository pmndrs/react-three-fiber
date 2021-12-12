import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'
import * as THREE from 'three'
import { extend } from '../src'
import * as React from 'react'
import { ViewProps, LayoutChangeEvent } from 'react-native'

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

// Polyfills WebGL canvas
// @ts-expect-error
HTMLCanvasElement.prototype.getContext = function () {
  return createWebGLContext(this)
}

// Extend catalogue for render API in tests
extend(THREE)

// Mock native dependencies for native
jest.mock('react-native', () => ({
  StyleSheet: {},
  View: React.memo(
    React.forwardRef(({ onLayout, ...props }: ViewProps, ref) => {
      React.useLayoutEffect(() => {
        onLayout?.({
          nativeEvent: {
            layout: {
              x: 0,
              y: 0,
              width: 1280,
              height: 800,
            },
          },
        } as LayoutChangeEvent)

        ref = { current: { props } }
      }, [])

      return null
    }),
  ),
}))
jest.mock('react-native/Libraries/Pressability/Pressability.js', () => ({}))
jest.mock('expo-asset', () => ({}))
jest.mock('expo-file-system', () => ({}))
jest.mock('expo-gl', () => ({
  GLView: ({ onContextCreate }: { onContextCreate: (gl: any) => void }) => {
    React.useLayoutEffect(() => {
      const gl = createWebGLContext({ width: 1280, height: 800 } as HTMLCanvasElement)
      onContextCreate(gl)
    }, [])

    return null
  },
}))
