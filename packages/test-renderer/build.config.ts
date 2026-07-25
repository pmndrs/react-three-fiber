import { defineBuildConfig } from 'unbuild'

/**
 * Unbuild configuration for @react-three/test-renderer
 *
 * Mirrors the three-entry shape of @react-three/fiber:
 * - Default: `@react-three/test-renderer`         → pairs with @react-three/fiber
 * - Legacy:  `@react-three/test-renderer/legacy`  → pairs with @react-three/fiber/legacy
 * - WebGPU:  `@react-three/test-renderer/webgpu`  → pairs with @react-three/fiber/webgpu
 *
 * Unlike fiber, the sources here import `three` directly rather than through the `#three`
 * alias, so no alias plugin is needed — each entry only differs in which fiber entry and
 * which three sub-path it externalizes.
 */

//* Shared rollup configuration ==============================
const sharedRollup = {
  emitCJS: true,
  esbuild: {
    jsx: 'automatic' as const,
    target: 'es2020',
  },
}

//* Shared externals ==============================
// Everything the consumer already has: react, the fiber entries, and three itself.
const baseExternals = ['react', 'react-dom', '@react-three/fiber']

export default defineBuildConfig([
  //* Default Entry ==============================
  {
    name: 'default',
    entries: ['src/index.tsx'],
    outDir: 'dist',
    clean: true,
    declaration: true,
    failOnWarn: false,
    rollup: sharedRollup,
    externals: [...baseExternals, 'three'],
  },

  //* Legacy Entry - WebGL Only ==============================
  {
    name: 'legacy',
    entries: ['src/legacy.tsx'],
    outDir: 'dist',
    declaration: true,
    failOnWarn: false,
    rollup: sharedRollup,
    externals: [...baseExternals, '@react-three/fiber/legacy', 'three'],
  },

  //* WebGPU Entry - WebGPU Only ==============================
  {
    name: 'webgpu',
    entries: [{ input: 'src/webgpu/index.tsx', name: 'index' }],
    outDir: 'dist/webgpu',
    declaration: true,
    failOnWarn: false,
    rollup: sharedRollup,
    externals: [...baseExternals, '@react-three/fiber/webgpu', 'three', 'three/webgpu', 'three/tsl'],
  },
])
