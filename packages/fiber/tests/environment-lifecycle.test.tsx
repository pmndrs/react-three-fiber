import { vi } from 'vitest'
import React, { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas, Environment, useThree, advance } from '../src/legacy'

// Tier 1: scene ownership and cube-camera scheduling, not rendered pixels.
describe('Environment lifecycle', () => {
  it.each([false, true, 'only'] as const)('restores scene properties after background=%s', async (background) => {
    const scene = new THREE.Scene()
    const originalBackground = new THREE.Color('red')
    const originalEnvironment = new THREE.Texture()
    const map = new THREE.Texture()
    scene.background = originalBackground
    scene.environment = originalEnvironment
    scene.backgroundBlurriness = 0.25
    scene.backgroundIntensity = 0.75
    scene.environmentIntensity = 0.5
    scene.backgroundRotation.set(0.1, 0.2, 0.3)
    scene.environmentRotation.set(0.4, 0.5, 0.6)
    const bgRotation = scene.backgroundRotation.clone()
    const envRotation = scene.environmentRotation.clone()
    const dispose = vi.spyOn(map, 'dispose')
    const tree = (visible: boolean) => (
      <Canvas frameloop="never">
        {visible && (
          <Environment
            map={map}
            scene={scene}
            background={background}
            backgroundBlurriness={0.8}
            backgroundIntensity={2}
            environmentIntensity={3}
            backgroundRotation={[1, 2, 3]}
            environmentRotation={[3, 2, 1]}
          />
        )}
      </Canvas>
    )
    const view = await act(async () => render(tree(true)))
    expect(scene.environment).toBe(background === 'only' ? originalEnvironment : map)
    expect(scene.background).toBe(background ? map : originalBackground)
    expect(scene.backgroundBlurriness).toBe(0.8)
    expect(scene.backgroundIntensity).toBe(2)
    expect(scene.environmentIntensity).toBe(3)
    expect(scene.backgroundRotation.toArray().slice(0, 3)).toEqual([1, 2, 3])
    expect(scene.environmentRotation.toArray().slice(0, 3)).toEqual([3, 2, 1])

    await act(async () => view.rerender(tree(false)))
    expect(scene.background).toBe(originalBackground)
    expect(scene.environment).toBe(originalEnvironment)
    expect(scene.backgroundBlurriness).toBe(0.25)
    expect(scene.backgroundIntensity).toBe(0.75)
    expect(scene.environmentIntensity).toBe(0.5)
    expect(scene.backgroundRotation.equals(bgRotation)).toBe(true)
    expect(scene.environmentRotation.equals(envRotation)).toBe(true)
    // A map supplied by the caller is not owned by Environment.
    expect(dispose).not.toHaveBeenCalled()
    dispose.mockRestore()
  })

  it('moves a supplied map between scene refs without leaving the old scene changed', async () => {
    const first = new THREE.Scene()
    const second = new THREE.Scene()
    const previous = new THREE.Texture()
    first.environment = previous
    const map = new THREE.Texture()
    let rootScene: THREE.Scene | undefined
    function Capture() {
      rootScene = useThree((state) => state.scene)
      return null
    }
    const tree = (scene: THREE.Scene) => (
      <Canvas frameloop="never">
        <Capture />
        <Environment map={map} scene={{ current: scene }} />
      </Canvas>
    )
    const view = await act(async () => render(tree(first)))
    expect(first.environment).toBe(map)
    expect(rootScene!.environment).toBeNull()
    await act(async () => view.rerender(tree(second)))
    expect(first.environment).toBe(previous)
    expect(second.environment).toBe(map)
    expect(rootScene!.environment).toBeNull()
    await act(async () => view.unmount())
    expect(second.environment).toBeNull()
  })

  it.each([1, Infinity])('schedules portal capture for frames=%s and releases its render target', async (frames) => {
    const update = vi.spyOn(THREE.CubeCamera.prototype, 'update').mockImplementation((renderer) => {
      expect((renderer as THREE.WebGLRenderer).autoClear).toBe(true)
    })
    const dispose = vi.spyOn(THREE.WebGLCubeRenderTarget.prototype, 'dispose')
    let scene: THREE.Scene | undefined
    let renderer: THREE.WebGLRenderer | undefined
    function Capture() {
      const state = useThree()
      scene = state.scene
      renderer = state.renderer as THREE.WebGLRenderer
      return null
    }
    try {
      const view = await act(async () =>
        render(
          <Canvas
            frameloop="never"
            onCreated={({ renderer }) => {
              renderer.autoClear = false
            }}>
            <Capture />
            <Environment frames={frames} resolution={16} background>
              <mesh />
            </Environment>
          </Canvas>,
        ),
      )
      const texture = scene!.environment
      expect(texture).toBeInstanceOf(THREE.CubeTexture)
      expect(scene!.background).toBe(texture)
      const autoClear = renderer!.autoClear
      expect(autoClear).toBe(false)
      await act(async () => {
        for (let frame = 0; frame < 5; frame++) advance(frame * 16)
      })
      expect(update).toHaveBeenCalledTimes(frames === Infinity ? 5 : 1)
      expect(renderer!.autoClear).toBe(autoClear)
      expect(dispose).not.toHaveBeenCalled()
      await act(async () => view.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(scene!.environment).toBeNull()
      expect(scene!.background).toBeNull()
    } finally {
      update.mockRestore()
      dispose.mockRestore()
    }
  })
})
