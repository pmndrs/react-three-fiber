import { defineBuildConfig } from 'unbuild'
import alias from '@rollup/plugin-alias'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

/**
 * Unbuild configuration for @react-three/fiber
 *
 * One rollup run, four entries, one shared core:
 * - `dist/index.mjs`          @react-three/fiber           either renderer, loaded on demand
 * - `dist/legacy.mjs`         @react-three/fiber/legacy    WebGL support imported statically
 * - `dist/webgpu/index.mjs`   @react-three/fiber/webgpu    WebGPU support imported statically
 * - `dist/extension.mjs`      @react-three/fiber/extension the three-free surface for libraries
 * - `dist/shared/*`           the core (reconciler, store, events, hooks) and the two renderer
 *                             supports, each emitted once and imported by whichever entry needs it
 *
 * Core has no static import from `three` or `three/webgpu` (see src/support and src/core/three.ts),
 * so the shared core chunk is three-free and an app downloads only the support chunk its Canvas
 * asks for. `pnpm verify-treeshake` checks that on the built output.
 *
 * React Reconciler:
 * - Source code imports from ./react-reconciler/* using relative paths
 * - The patched ESM version is built via vite during postinstall (see root vite.config.ts)
 * - Gets bundled into the shared chunk (not externalized)
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineBuildConfig({
  entries: [
    'src/index.tsx',
    'src/legacy.tsx',
    { input: 'src/webgpu/index.tsx', name: 'webgpu/index' },
    'src/extension.tsx',
  ],
  outDir: 'dist',
  clean: true,
  declaration: true, // Generate .d.ts files for consumers
  failOnWarn: false,
  rollup: {
    emitCJS: true,
    esbuild: {
      jsx: 'automatic',
      target: 'es2020',
    },
  },
  hooks: {
    'rollup:options': (_ctx, options) => {
      options.plugins = [
        alias({ entries: [{ find: /^#types$/, replacement: resolve(__dirname, 'types/index.ts') }] }),
        ...(Array.isArray(options.plugins) ? options.plugins : []),
      ]
      // An entry imports the shared chunk, not what the shared chunk imports: a renderer support's
      // dependencies must stay with that support's chunk, or importing /legacy next to the root
      // entry would hoist three/webgpu into a WebGL app.
      for (const output of Array.isArray(options.output) ? options.output : [options.output]) {
        if (output) output.hoistTransitiveImports = false
      }
    },
  },
  // Note: react-reconciler is NOT external - we bundle our patched ESM version
  externals: [
    'react',
    'react-dom',
    'scheduler',
    '@pmndrs/scheduler',
    '@pmndrs/scheduler/react',
    'zustand',
    'zustand/shallow',
    'its-fine',
    'suspend-react',
    'react-use-measure',
    'use-sync-external-store',
    'use-sync-external-store/shim/with-selector',
    'dequal',
    'dequal/lite',
    'three',
    'three/webgpu',
    'three/tsl',
  ],
})
