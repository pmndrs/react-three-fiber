import { defineConfig, transformWithEsbuild } from 'vite'
import * as path from 'node:path'
import * as fs from 'node:fs'

export default defineConfig({
  build: {
    outDir: 'packages/fiber/react-reconciler',
    target: 'esnext',
    lib: {
      formats: ['es'],
      entry: {
        index: 'packages/fiber/node_modules/react-reconciler/index.js',
        constants: 'packages/fiber/node_modules/react-reconciler/cjs/react-reconciler-constants.production.js',
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
    {
      name: 'vite-ts',
      enforce: 'pre',
      transform(code, id) {
        // Vite does not preserve static exports which breaks ESM transpilation
        // Instead, we manually transpile constants from CJS -> ESM
        if (id.includes('react-reconciler-constants')) {
          return (
            code
              // Export top-level constants
              .replace(/exports\.(\w+)\s*=\s*(.*?);/g, 'export const $1 = $2;')
              // Remove "use strict"
              .replace(/"use strict";\s*/g, '')
          )
        }
      },
      generateBundle(_options, bundle) {
        for (const key in bundle) {
          if (!('isEntry' in bundle[key]) || !bundle[key].isEntry) continue

          const name = bundle[key].name
          const source = fs.readFileSync(`packages/fiber/node_modules/@types/react-reconciler/${name}.d.ts`, 'utf-8')
          this.emitFile({ type: 'asset', fileName: `${name}.d.ts`, source })
        }
      },
    },
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
