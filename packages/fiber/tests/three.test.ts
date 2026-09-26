/**
 * @fileoverview core/three: three's shared core as seen by core code before and after a root loads
 * a renderer. Isolated with vi.resetModules so this file starts with no namespace registered,
 * unlike the rest of the suite.
 */
import { vi } from 'vitest'

describe('core/three', () => {
  beforeEach(() => vi.resetModules())

  it('throws a pointed error before any root has loaded a renderer', async () => {
    const { getThree, hasThree } = await import('../src/core/three')
    expect(hasThree()).toBe(false)
    expect(() => getThree()).toThrow(/three is not loaded yet/)
  })

  it('resolves whenThree() once a renderer support registers, and getThree() from then on', async () => {
    const { getThree, whenThree, registerThree, hasThree } = await import('../src/core/three')
    const THREE = await import('three')
    const pending = whenThree()
    registerThree(THREE)
    await expect(pending).resolves.toBe(THREE)
    expect(hasThree()).toBe(true)
    expect(getThree().Vector3).toBe(THREE.Vector3)
    await expect(whenThree()).resolves.toBe(THREE)
  })

  it('keeps the first registered namespace: both flavours share the same core classes', async () => {
    const { getThree, registerThree } = await import('../src/core/three')
    const legacy = await import('three')
    const webgpu = await import('three/webgpu')
    registerThree(webgpu)
    registerThree(legacy)
    expect(getThree()).toBe(webgpu)
    // What core reads from either is the very same object
    expect(webgpu.Vector3).toBe(legacy.Vector3)
    expect(webgpu.Scene).toBe(legacy.Scene)
  })

  it('a preload issued before any Canvas waits for the first renderer', async () => {
    const { registerThree } = await import('../src/core/three')
    const { useTexture } = await import('../src/core/hooks/useTexture')
    const { useLoader } = await import('../src/core/hooks/useLoader')
    const preload = vi.spyOn(useLoader, 'preload').mockImplementation(() => {})

    useTexture.preload('/a.png')
    expect(preload).not.toHaveBeenCalled()

    const THREE = await import('three')
    registerThree(THREE)
    await Promise.resolve()
    expect(preload).toHaveBeenCalledWith(THREE.TextureLoader, '/a.png')
    preload.mockRestore()
  })
})
