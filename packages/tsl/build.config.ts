import { defineBuildConfig } from 'unbuild'

/**
 * Unbuild configuration for @react-three/tsl
 *
 * One entry. Everything the consumer already has stays external -- above all fiber, which this
 * package reaches only through the three-free `@react-three/fiber/extension` entry so it never
 * pulls a copy of fiber's core into an app. `scripts/verify-bundles.js` checks the output imports
 * no other fiber entry.
 */
export default defineBuildConfig({
  entries: ['src/index.ts'],
  outDir: 'dist',
  clean: true,
  declaration: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
    esbuild: {
      jsx: 'automatic',
      target: 'es2020',
    },
  },
  externals: [
    'react',
    'react/jsx-runtime',
    'three',
    'three/webgpu',
    'three/tsl',
    '@react-three/fiber',
    '@react-three/fiber/extension',
    '@react-three/fiber/webgpu',
    'zustand',
    'zustand/shallow',
    'zustand/traditional',
    'dequal',
    'dequal/lite',
  ],
})
