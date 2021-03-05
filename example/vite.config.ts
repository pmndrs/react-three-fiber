import path from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      'react-three-fiber': path.resolve('../src/web/index.tsx'),
    },
  },
  plugins: [reactRefresh()],
})
