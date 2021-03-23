import path from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

export default defineConfig({
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
      '@react-three/fiber': path.resolve('../packages/fiber/dist/react-three-fiber.esm.js'),
    },
  },
  plugins: [reactRefresh()],
})
