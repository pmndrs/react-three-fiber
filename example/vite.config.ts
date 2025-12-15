import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  optimizeDeps: {
    // Exclude fiber so Vite doesn't pre-bundle it (allows HMR from source)
    exclude: ['@react-three/fiber'],
  },
  resolve: {
    alias: [
      // Point directly to fiber source for HMR (bypasses dist/stub files)
      // NOTE: More specific paths must come BEFORE less specific ones
      {
        find: '@react-three/fiber/webgpu',
        replacement: path.resolve(__dirname, '../packages/fiber/src/webgpu/index.tsx'),
      },
      { find: '@react-three/fiber/legacy', replacement: path.resolve(__dirname, '../packages/fiber/src/legacy.tsx') },
      { find: '@react-three/fiber', replacement: path.resolve(__dirname, '../packages/fiber/src/index.tsx') },
      // Resolve internal aliases used in fiber source
      { find: '#three/tsl', replacement: path.resolve(__dirname, '../packages/fiber/src/three/tsl.ts') },
      { find: '#three', replacement: path.resolve(__dirname, '../packages/fiber/src/three/index.ts') },
      { find: '#types', replacement: path.resolve(__dirname, '../packages/fiber/types/index.ts') },
    ],
  },
  server: {
    watch: {
      // Watch the fiber package source for HMR
      ignored: ['!**/packages/fiber/**'],
    },
  },
  plugins: [react()],
})
