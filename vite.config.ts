import { defineConfig, transformWithEsbuild } from 'vite'
import * as path from 'node:path'
import * as fs from 'node:fs'

/**
 * Vite configuration for patching react-reconciler
 *
 * This builds react-reconciler from node_modules into a local ESM-compatible version
 * since the official package is CJS-only or has ESM issues.
 *
 * Runs automatically during postinstall via `yarn patch-react-reconciler`
 */
export default defineConfig({
  build: {
    outDir: 'packages/fiber/react-reconciler',
    target: 'esnext',
    lib: {
      formats: ['es'],
      entry: {
        index: 'node_modules/react-reconciler/index.js',
        constants: 'node_modules/react-reconciler/cjs/react-reconciler-constants.production.js',
      },
      fileName: '[name]',
    },
    rollupOptions: {
      treeshake: false,
      external: (id: string) => !id.startsWith('.') && !path.isAbsolute(id),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
      },
    },
  },
  plugins: [
    //* CJS to ESM Transformation ==============================
    {
      name: 'vite-ts',
      enforce: 'pre',
      transform(code, id) {
        // Convert CJS constants to ESM format
        if (id.includes('react-reconciler-constants')) {
          return code.replace(/exports\.(\w+)\s*=\s*(.*?);/g, 'export const $1 = $2;').replace(/"use strict";\s*/g, '')
        }
        // Transitions from React 19.0 to 19.2 have no types field, so the check must accept undefined
        if (id.includes('/cjs/react-reconciler.') && !id.includes('?')) {
          const guard = /(\w+) = transition\.types;(\s*)if \(null !== \1\)/g
          if (code.match(guard)?.length !== 1) throw new Error(`Expected one transition types check in ${id}`)
          return code.replace(guard, '$1 = transition.types;$2if (null != $1)')
        }
      },
      generateBundle(_options, bundle) {
        // Copy TypeScript definitions for each entry point
        for (const key in bundle) {
          if (!('isEntry' in bundle[key]) || !bundle[key].isEntry) continue

          const name = bundle[key].name
          const typePath = `node_modules/@types/react-reconciler/${name}.d.ts`

          if (fs.existsSync(typePath)) {
            const source = fs.readFileSync(typePath, 'utf-8')
            this.emitFile({ type: 'asset', fileName: `${name}.d.ts`, source })
          }
        }
      },
    },

    //* Minification ==============================
    {
      name: 'vite-minify',
      renderChunk: {
        order: 'post',
        handler(code, { fileName }) {
          return transformWithEsbuild(code, fileName, { minify: true })
        },
      },
    },
  ],
})
