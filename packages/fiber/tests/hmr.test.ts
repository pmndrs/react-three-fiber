import { createStore } from '../src/core/store'
import { clearHmrCaches } from '../src/core/utils/hmr'

describe('clearHmrCaches', () => {
  // Regression for Bug #4: the HMR handler cleared only nodes/uniforms, leaving
  // buffers/gpuStorage stale after a hot reload. It must clear all four maps.
  it('clears all four TSL resource maps and bumps _hmrVersion', () => {
    const store = createStore(
      () => {},
      () => {},
    )

    store.setState({
      nodes: { n: 1 } as any,
      uniforms: { u: 2 } as any,
      buffers: { b: 3 } as any,
      gpuStorage: { g: 4 } as any,
    })

    const before = store.getState()._hmrVersion

    clearHmrCaches(store)

    const state = store.getState()
    expect(state.nodes).toEqual({})
    expect(state.uniforms).toEqual({})
    expect(state.buffers).toEqual({})
    expect(state.gpuStorage).toEqual({})
    expect(state._hmrVersion).toBe(before + 1)
  })
})
