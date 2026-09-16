import { defineConfig } from 'vitest/config'
import * as path from 'node:path'

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'three', 'use-sync-external-store'],
    alias: {
      '@react-three/fiber/legacy': path.resolve(__dirname, './packages/fiber/src/legacy.tsx'),
      '@react-three/fiber/webgpu': path.resolve(__dirname, './packages/fiber/src/webgpu/index.tsx'),
      '@react-three/fiber': path.resolve(__dirname, './packages/fiber/src/index.tsx'),
      '#three': path.resolve(__dirname, './packages/fiber/src/three'),
      '#types': path.resolve(__dirname, './packages/fiber/src/types.ts'),
      '#utils': path.resolve(__dirname, './packages/fiber/src/core/utils.ts'),
      'three/addons': path.resolve(__dirname, './node_modules/three/examples/jsm'),
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'use-sync-external-store': path.resolve(__dirname, './node_modules/use-sync-external-store'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./packages/fiber/tests/setupTests.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      exclude: ['node_modules/', 'packages/fiber/dist', 'packages/fiber/src/index', 'packages/test-renderer/dist'],
      /**
       * A ratchet, not a target. Each value sits just under what the suite currently achieves, so
       * the build fails if coverage *drops* — it does not assert that coverage is good.
       *
       * Raise these as coverage improves; never lower one to make a build pass. The 80% goal for
       * `src/core` in the release plan is a beta.1 objective and is not reachable by config: the
       * gap is concentrated in `Environment.tsx`, `useEnvironment.tsx` and `visibility.ts`, all of
       * which ship stable and need real tests.
       *
       * Statements/branches read low because v8 counts every bundled three.js expression that the
       * suite touches; `lines` is the meaningful figure for R3F's own code.
       */
      thresholds: {
        lines: 81,
        functions: 52,
        statements: 42,
        branches: 31,
      },
    },
    testTimeout: 30000,
  },
})
