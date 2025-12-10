import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  optimizeDeps: {
    // Exclude fiber so Vite doesn't pre-bundle it (allows HMR from source)
    exclude: ['@react-three/fiber'],
  },
  resolve: {
    alias: {
      // Resolve internal aliases used in fiber source
      '#three': path.resolve(__dirname, '../packages/fiber/src/three/index.ts'),
      '#types': path.resolve(__dirname, '../packages/fiber/types/index.ts'),
    },
  },
  server: {
    watch: {
      // Watch the fiber package source for HMR
      ignored: ['!**/packages/fiber/**'],
    },
  },
  plugins: [react()],
})
