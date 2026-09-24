import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { createRoot } from '../src'

// Stands in for three's WebGPURenderer, which v9 apps build in an async `gl` factory
class MockWebGPURenderer {
  initialized = false
  xr = { addEventListener: jest.fn(), removeEventListener: jest.fn() }
  outputColorSpace = ''
  toneMapping = 0
  render = jest.fn()
  setSize = jest.fn()
  setPixelRatio = jest.fn()
  hasInitialized = () => this.initialized
  init = jest.fn(async () => {
    this.initialized = true
  })
  dispose = jest.fn(async () => {})
}

async function mount(gl?: any) {
  const root = createRoot(document.createElement('canvas'))
  let store!: ReturnType<typeof root.render>
  await act(async () => {
    store = (await root.configure({ gl, frameloop: 'never' })).render(<group />)
  })
  return { root, state: store.getState() }
}

describe('renderer ownership', () => {
  afterEach(() => jest.restoreAllMocks())

  it('disposes a renderer it created, then releases its context', async () => {
    const { root, state } = await mount()
    const dispose = jest.spyOn(state.gl, 'dispose')
    const forceContextLoss = jest.spyOn(state.gl, 'forceContextLoss')

    await act(async () => root.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
    expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(forceContextLoss.mock.invocationCallOrder[0])
  })

  it('disposes a renderer returned by a factory', async () => {
    let gl!: THREE.WebGLRenderer
    const { root } = await mount((props: any) => (gl = new THREE.WebGLRenderer(props)))
    const dispose = jest.spyOn(gl, 'dispose')

    await act(async () => root.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps the 9.x teardown for a renderer instance: context lost, not disposed', async () => {
    const gl = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') })
    const dispose = jest.spyOn(gl, 'dispose')
    const forceContextLoss = jest.spyOn(gl, 'forceContextLoss')
    const { root } = await mount(gl)

    await act(async () => root.unmount())
    expect(dispose).not.toHaveBeenCalled()
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('disposes a WebGPU renderer built by an async factory', async () => {
    const gl = new MockWebGPURenderer()
    const { root } = await mount(async () => {
      await gl.init()
      return gl
    })

    await act(async () => root.unmount())
    expect(gl.dispose).toHaveBeenCalledTimes(1)
  })

  it('reports a rejected async dispose instead of leaving it unhandled', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const gl = new MockWebGPURenderer()
    const failure = new Error('backend dispose failed')
    gl.dispose.mockImplementation(() => Promise.reject(failure))
    const { root } = await mount(async () => {
      await gl.init()
      return gl
    })

    await act(async () => root.unmount())
    expect(warn).toHaveBeenCalledWith('[R3F] Error disposing renderer', failure)
  })

  it('does not dispose a WebGPU renderer that never initialized', async () => {
    // three's dispose() would start its init, or reject unhandled after a failed one
    const gl = new MockWebGPURenderer()
    const { root } = await mount(() => gl)

    await act(async () => root.unmount())
    expect(gl.dispose).not.toHaveBeenCalled()
  })

  it('still releases the renderer when an earlier teardown step throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const { root, state } = await mount()
    const dispose = jest.spyOn(state.gl, 'dispose')
    state.events.disconnect = () => {
      throw new Error('disconnect failed')
    }

    await act(async () => root.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('teardown may be incomplete'), expect.any(Error))
  })
})
