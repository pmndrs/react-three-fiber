/**
 * @fileoverview Tests to verify R3F entry points work correctly
 *
 * These tests verify that each R3F entry point:
 * 1. Exports the correct build flags
 * 2. Exports core functions
 * 3. Entry-point specific features work
 *
 * NOTE: Jest tests run against SOURCE files via babel, not built bundles.
 * The babel config resolves #three to the default three/index.ts for all entry points.
 *
 * For actual bundle import verification (checking that legacy doesn't import three/webgpu),
 * use the verify-bundles.js script which analyzes the built output files:
 *   yarn build && yarn verify-bundles
 */

//* Default Entry Point Tests ==============================

describe('Entry Point: Default (@react-three/fiber)', () => {
  it('should export R3F_BUILD_LEGACY as true', async () => {
    const fiber = await import('@react-three/fiber')
    expect(fiber.R3F_BUILD_LEGACY).toBe(true)
  })

  it('should export R3F_BUILD_WEBGPU as true', async () => {
    const fiber = await import('@react-three/fiber')
    expect(fiber.R3F_BUILD_WEBGPU).toBe(true)
  })

  it('should export core functions', async () => {
    const fiber = await import('@react-three/fiber')
    expect(typeof fiber.createRoot).toBe('function')
    expect(typeof fiber.useThree).toBe('function')
    expect(typeof fiber.useFrame).toBe('function')
    expect(typeof fiber.extend).toBe('function')
  })
})

//* Legacy Entry Point Tests ==============================

describe('Entry Point: Legacy (@react-three/fiber/legacy)', () => {
  // NOTE: In Jest, babel resolves #three to the default (three/index.ts)
  // So both flags are true. In the BUILT bundle, legacy.mjs will have:
  // R3F_BUILD_LEGACY=true, R3F_BUILD_WEBGPU=false
  // Verify with: yarn build && yarn verify-bundles

  it('should export R3F_BUILD_LEGACY as true', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    expect(legacy.R3F_BUILD_LEGACY).toBe(true)
  })

  it('should export R3F_BUILD_WEBGPU as false (no WebGPU in legacy)', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    // Legacy uses explicit path to three/legacy.ts which has WEBGPU=false
    expect(legacy.R3F_BUILD_WEBGPU).toBe(false)
  })

  it('should export core functions', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    expect(typeof legacy.createRoot).toBe('function')
    expect(typeof legacy.useThree).toBe('function')
    expect(typeof legacy.useFrame).toBe('function')
    expect(typeof legacy.extend).toBe('function')
  })
})

//* WebGPU Entry Point Tests ==============================

describe('Entry Point: WebGPU (@react-three/fiber/webgpu)', () => {
  let webgpu: any
  let importError: Error | null = null

  beforeAll(async () => {
    try {
      webgpu = await import('@react-three/fiber/webgpu')
    } catch (err) {
      importError = err as Error
      console.error('WebGPU import error:', err)
    }
  })

  it('should import without errors', () => {
    if (importError) {
      console.error('Import failed with:', importError.message)
      console.error('Stack:', importError.stack)
    }
    expect(importError).toBeNull()
  })

  // NOTE: In Jest, babel resolves #three to the default (three/index.ts)
  // So both flags are true. In the BUILT bundle, webgpu/index.mjs will have:
  // R3F_BUILD_LEGACY=false, R3F_BUILD_WEBGPU=true
  // Verify with: yarn build && yarn verify-bundles

  it('should export R3F_BUILD_LEGACY as false (no legacy in webgpu)', () => {
    if (!webgpu) return
    // WebGPU uses explicit path to three/webgpu.ts which has LEGACY=false
    expect(webgpu.R3F_BUILD_LEGACY).toBe(false)
  })

  it('should export R3F_BUILD_WEBGPU as true', () => {
    if (!webgpu) return
    expect(webgpu.R3F_BUILD_WEBGPU).toBe(true)
  })

  it('should export core functions', () => {
    if (!webgpu) return
    expect(typeof webgpu.createRoot).toBe('function')
    expect(typeof webgpu.useThree).toBe('function')
    expect(typeof webgpu.useFrame).toBe('function')
    expect(typeof webgpu.extend).toBe('function')
  })

  it('should export WebGPU-specific hooks', () => {
    if (!webgpu) return
    expect(typeof webgpu.useUniforms).toBe('function')
    expect(typeof webgpu.useUniform).toBe('function')
  })
})
