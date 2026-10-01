import { vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas as DefaultCanvas, createPortal, useFrame, type RootState } from '../src'
import { Canvas as LegacyCanvas } from '../src/legacy'
import { Canvas as WebGPUCanvas, type RootState as WebGPURootState } from '../src/webgpu'

const Activity = (
  React as unknown as {
    Activity: React.ComponentType<React.PropsWithChildren<{ mode: 'visible' | 'hidden' }>>
  }
).Activity
const describeActivity = Activity ? describe : describe.skip

describeActivity.each([
  ['default', DefaultCanvas],
  ['legacy', LegacyCanvas],
  ['webgpu', WebGPUCanvas],
] as const)('Activity on the %s entry', (_, Canvas) => {
  it('disconnects effects and frame jobs, then restores the same scene and renderer', async () => {
    let state!: RootState | WebGPURootState
    const frame = vi.fn()
    const effects = new Set<string>()
    function Scene() {
      useFrame(frame)
      React.useLayoutEffect(() => {
        effects.add('layout')
        return () => void effects.delete('layout')
      }, [])
      React.useEffect(() => {
        effects.add('passive')
        return () => void effects.delete('passive')
      }, [])
      return <group name="retained" />
    }
    const canvas = (
      <Canvas frameloop="never" onCreated={(created) => (state = created)}>
        <Scene />
      </Canvas>
    )
    const app = (mode: 'visible' | 'hidden') => <Activity mode={mode}>{canvas}</Activity>
    const view = await act(async () => render(app('visible')))
    const renderer = state.renderer
    // Exercise scheduler subscriptions; GPU drawing is outside this lifecycle test.
    vi.spyOn(renderer, 'render').mockImplementation(() => {})
    const object = state.scene.getObjectByName('retained')!
    const dispose = vi.spyOn(renderer, 'dispose')
    state.advance(1)
    expect(frame).toHaveBeenCalledTimes(1)
    await act(async () => view.rerender(app('hidden')))
    expect(effects.size).toBe(0)
    expect(object.visible).toBe(false)
    state.advance(2)
    expect(frame).toHaveBeenCalledTimes(1)
    expect(dispose).not.toHaveBeenCalled()
    await act(async () => view.rerender(app('visible')))
    expect(state.get().renderer).toBe(renderer)
    expect(state.scene.getObjectByName('retained')).toBe(object)
    expect(object.visible).toBe(true)
    expect(effects).toEqual(new Set(['layout', 'passive']))
    state.advance(3)
    expect(frame).toHaveBeenCalledTimes(2)
    await act(async () => view.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('restores an injected portal scene after Activity reconnects its effects', async () => {
    const target = new THREE.Group()
    const canvas = <Canvas frameloop="never">{createPortal(<group name="portal-child" />, target)}</Canvas>
    const app = (mode: 'visible' | 'hidden') => <Activity mode={mode}>{canvas}</Activity>
    const view = await act(async () => render(app('visible')))
    const child = target.getObjectByName('portal-child')!
    const scene = target.children[0]
    expect(child).toBeDefined()
    await act(async () => view.rerender(app('hidden')))
    await act(async () => view.rerender(app('visible')))
    expect(target.children[0]).toBe(scene)
    expect(target.getObjectByName('portal-child')).toBe(child)
    expect(child.visible).toBe(true)
    await act(async () => view.unmount())
    expect(target.children).toHaveLength(0)
  })
})
