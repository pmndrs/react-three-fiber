import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@react-three/fiber': path.resolve(__dirname, '../packages/fiber/src/index.tsx'),
    },
  },
  optimizeDeps: {
    exclude: ['@react-three/fiber'],
  },
  plugins: [react()],
})
