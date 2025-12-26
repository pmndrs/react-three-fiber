import { defineBuildConfig } from 'unbuild'
import alias from '@rollup/plugin-alias'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

/**
 * Unbuild configuration for @react-three/fiber
 *
 * Each entry point is built separately with different #three alias resolution:
 * - Default: #three → three/index.ts (both WebGL + WebGPU)
 * - Legacy: #three → three/legacy.ts (WebGL only)
 * - WebGPU: #three → three/webgpu.ts (WebGPU only)
 */

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const threeAliases = {
  default: resolve(__dirname, 'src/three/index.ts'),
  legacy: resolve(__dirname, 'src/three/legacy.ts'),
  webgpu: resolve(__dirname, 'src/three/webgpu.ts'),
  tsl: resolve(__dirname, 'src/three/tsl.ts'),
}

// Types alias - points to the types barrel file
const typesAlias = resolve(__dirname, 'types/index.ts')

//* Shared rollup configuration ==============================
const sharedRollup = {
  emitCJS: true,
  esbuild: {
    jsx: 'automatic' as const,
    target: 'es2020',
  },
}

//* Shared externals ==============================
const baseExternals = [
  'react',
  'react-dom',
  'react-reconciler',
  'scheduler',
  'zustand',
  'zustand/shallow',
  'its-fine',
  'suspend-react',
  'react-use-measure',
  'use-sync-external-store',
  'use-sync-external-store/shim/with-selector',
  'dequal',
  'dequal/lite',
]

//* Create alias plugin for an entry ==============================
function createAliasPlugin(threeVariant: 'default' | 'legacy' | 'webgpu') {
  return alias({
    entries: [
      { find: /^#three\/tsl$/, replacement: threeAliases.tsl },
      { find: /^#three$/, replacement: threeAliases[threeVariant] },
      { find: /^#types$/, replacement: typesAlias },
    ],
  })
}

export default defineBuildConfig([
  //* Default Entry - Both WebGL and WebGPU ==============================
  {
    name: 'default',
    entries: ['src/index.tsx'],
    outDir: 'dist',
    clean: true,
    declaration: false, // Skip declaration for now - using source types
    failOnWarn: false,
    rollup: sharedRollup,
    hooks: {
      'rollup:options': (_ctx, options) => {
        options.plugins = [createAliasPlugin('default'), ...(Array.isArray(options.plugins) ? options.plugins : [])]
      },
    },
    externals: [...baseExternals, 'three', 'three/webgpu', 'three/tsl', 'three/addons/inspector/Inspector.js'],
  },

  //* Legacy Entry - WebGL Only ==============================
  {
    name: 'legacy',
    entries: ['src/legacy.tsx'],
    outDir: 'dist',
    declaration: false,
    failOnWarn: false,
    rollup: sharedRollup,
    hooks: {
      'rollup:options': (_ctx, options) => {
        options.plugins = [createAliasPlugin('legacy'), ...(Array.isArray(options.plugins) ? options.plugins : [])]
      },
    },
    externals: [...baseExternals, 'three'],
  },

  //* WebGPU Entry - WebGPU Only ==============================
  {
    name: 'webgpu',
    entries: [{ input: 'src/webgpu/index.tsx', name: 'index' }],
    outDir: 'dist/webgpu',
    declaration: false,
    failOnWarn: false,
    rollup: sharedRollup,
    hooks: {
      'rollup:options': (_ctx, options) => {
        options.plugins = [createAliasPlugin('webgpu'), ...(Array.isArray(options.plugins) ? options.plugins : [])]
      },
    },
    externals: [...baseExternals, 'three/webgpu', 'three/tsl', 'three/addons/inspector/Inspector.js'],
  },
])
