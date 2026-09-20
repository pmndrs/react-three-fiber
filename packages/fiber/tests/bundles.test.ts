/**
 * Verify source entry exports and renderer flags.
 * For built output, run pnpm build and pnpm verify-treeshake.
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

  it('should export useRenderTarget hook', async () => {
    const fiber = await import('@react-three/fiber')
    expect(typeof fiber.useRenderTarget).toBe('function')
  })
})

//* Legacy Entry Point Tests ==============================

describe('Entry Point: Legacy (@react-three/fiber/legacy)', () => {
  it('should export R3F_BUILD_LEGACY as true', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    expect(legacy.R3F_BUILD_LEGACY).toBe(true)
  })

  it('should export R3F_BUILD_WEBGPU as false (no WebGPU in legacy)', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    expect(legacy.R3F_BUILD_WEBGPU).toBe(false)
  })

  it('should export core functions', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    expect(typeof legacy.createRoot).toBe('function')
    expect(typeof legacy.useThree).toBe('function')
    expect(typeof legacy.useFrame).toBe('function')
    expect(typeof legacy.extend).toBe('function')
  })

  it('should export useRenderTarget hook', async () => {
    const legacy = await import('@react-three/fiber/legacy')
    expect(typeof legacy.useRenderTarget).toBe('function')
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

  it('should export R3F_BUILD_LEGACY as false (no legacy in webgpu)', () => {
    if (!webgpu) return
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

  it('should export useRenderTarget hook', () => {
    if (!webgpu) return
    expect(typeof webgpu.useRenderTarget).toBe('function')
  })
})
