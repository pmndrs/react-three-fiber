import path from 'path'
import { defineConfig } from 'vite'
import reactRefresh from '@vitejs/plugin-react-refresh'
import mkcert from 'vite-plugin-mkcert'

export default ({ command, mode }) => {
  return {
    resolve: {
      alias: {
        react: path.resolve('./node_modules/react'),
        'react-dom': path.resolve('./node_modules/react-dom'),
        '@react-three/fiber': path.resolve('../packages/fiber/src/index.tsx'),
      },
    },
    server: {
      https: command === 'dev-https',
    },
    plugins: [reactRefresh(), mkcert()],
  }
}
