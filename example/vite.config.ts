import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'

export default defineConfig({
  optimizeDeps: {
    exclude: ['@react-three/fiber'],
  },
  plugins: [reactRefresh()],
})
