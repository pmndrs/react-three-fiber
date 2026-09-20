import { defineBuildConfig } from 'unbuild'
import alias from '@rollup/plugin-alias'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

/**
 * Build all entries with one shared core chunk, including the patched React reconciler.
 * Entry providers supply renderer classes so core stays independent of either renderer.
 */

export default defineBuildConfig({
  entries: [
    //* Default Entry - Both WebGL and WebGPU ==============================
    'src/index.tsx',
    //* Legacy Entry - WebGL Only ==============================
    'src/legacy.tsx',
    //* WebGPU Entry - WebGPU Only ==============================
    { input: 'src/webgpu/index.tsx', name: 'webgpu/index' },
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
        alias({
          entries: [
            { find: /^#types$/, replacement: resolve(dirname(fileURLToPath(import.meta.url)), 'types/index.ts') },
          ],
        }),
        ...(Array.isArray(options.plugins) ? options.plugins : []),
      ]
      // Keep transitive imports in the shared chunk so entries retain only their own renderer dependencies.
      for (const output of Array.isArray(options.output) ? options.output : [options.output]) {
        if (output) output.hoistTransitiveImports = false
      }
    },
  },
  // The patched React reconciler is bundled into shared core.
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
