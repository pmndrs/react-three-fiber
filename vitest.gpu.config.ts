import { defineConfig } from 'vitest/config'
import base from './vitest.config'

/**
 * Tier 3: R3F against a real WebGPU device, headless (`pnpm test:gpu`).
 *
 * `vitest-environment-webgpu-node` backs `navigator.gpu` with Dawn in Node and provides a headless
 * canvas with a `webgpu` context. On Linux without a GPU, Dawn runs on Mesa's software Vulkan
 * driver (`sudo apt-get install -y mesa-vulkan-drivers`); macOS uses Metal with no setup. See
 * docs/development/TESTING.md.
 *
 * Shares the jsdom project's source aliases and nothing else: no setupFiles (those mock WebGL and
 * WebGPU, which must stay real here) and no coverage (it is not part of the ratchet, and pixels
 * differ slightly across rasterizers, so these tests assert with tolerances).
 */
export default defineConfig({
  resolve: base.resolve,
  test: {
    globals: true,
    environment: 'webgpu-node',
    include: ['packages/**/tests/gpu/**/*.gpu.test.{ts,tsx}'],
    testTimeout: 30000,
  },
})
