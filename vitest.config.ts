import { defineConfig } from 'vitest/config'
import * as path from 'node:path'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'three'],
    alias: {
      '@react-three/fiber/legacy': path.resolve(__dirname, './packages/fiber/src/legacy.tsx'),
      '@react-three/fiber/webgpu': path.resolve(__dirname, './packages/fiber/src/webgpu/index.tsx'),
      '@react-three/fiber': path.resolve(__dirname, './packages/fiber/src/index.tsx'),
      '#three': path.resolve(__dirname, './packages/fiber/src/three'),
      '#types': path.resolve(__dirname, './packages/fiber/src/types.ts'),
      '#utils': path.resolve(__dirname, './packages/fiber/src/core/utils.ts'),
      'three/addons': path.resolve(__dirname, './node_modules/three/examples/jsm'),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./packages/fiber/tests/setupTests.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'packages/fiber/dist', 'packages/fiber/src/index', 'packages/test-renderer/dist'],
    },
    testTimeout: 30000,
  },
})
