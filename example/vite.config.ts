import path from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

export default defineConfig({
  resolve: {
    alias: {
      'react': path.resolve('./node_modules/react'),
      'react-three-fiber': path.resolve('../packages/fiber/src/web/index.tsx'),
      '@react-three/fiber': path.resolve('../packages/fiber/src/web/index.tsx'),
    },
  },
  plugins: [reactRefresh()],
})
