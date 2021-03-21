import path from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

export default defineConfig({
  resolve: {
    alias: [
      { find: 'react', replacement: path.resolve('./node_modules/react') },
      //{ find: '@react-spring/three', replacement: path.resolve('./node_modules/@react-spring/three/index.js') },
      { find: 'react-three-fiber', replacement: path.resolve('../packages/fiber/src/web/index.tsx') },
      { find: '@react-three/fiber', replacement: path.resolve('../packages/fiber/src/web/index.tsx') },
    ],
  },
  plugins: [reactRefresh()],
})
