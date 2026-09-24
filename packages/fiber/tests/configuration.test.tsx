import { act } from 'react'
import * as THREE from 'three'
import { createRoot, type ReconcilerRoot, type RenderProps } from '../src'
import { _roots } from '../src/core/root'

let canvas: HTMLCanvasElement
let root: ReconcilerRoot<HTMLCanvasElement>

beforeEach(() => {
  canvas = document.createElement('canvas')
  root = createRoot(canvas)
})

afterEach(async () => {
  await act(async () => root.unmount())
  jest.restoreAllMocks()
})

async function mount(props: RenderProps<HTMLCanvasElement> = {}) {
  return act(async () => (await root.configure(props)).render(null))
}

describe('configuration inputs', () => {
  it.each([undefined, 'always'] as const)('preserves a runtime frameloop with prop %s', async (frameloop) => {
    const store = await mount({ frameloop })
    await act(async () => store.getState().setFrameloop('demand'))
    await act(async () => root.configure({ frameloop, size: { width: 200, height: 100, top: 0, left: 0 } }))
    expect(store.getState().frameloop).toBe('demand')
    expect(store.getState().size.width).toBe(200)

    await act(async () => root.configure({ frameloop: 'never' }))
    expect(store.getState().frameloop).toBe('never')
    await act(async () => root.configure({}))
    expect(store.getState().frameloop).toBe('always')
  })

  it('preserves runtime shadow settings until the prop changes', async () => {
    const store = await mount({ shadows: true })
    const { shadowMap } = store.getState().gl
    expect(shadowMap.enabled).toBe(true)
    expect(shadowMap.type).toBe(THREE.PCFSoftShadowMap)
    shadowMap.type = THREE.BasicShadowMap
    shadowMap.enabled = false
    shadowMap.needsUpdate = false

    await act(async () => root.configure({ shadows: true }))
    expect(shadowMap.type).toBe(THREE.BasicShadowMap)
    expect(shadowMap.enabled).toBe(false)
    expect(shadowMap.needsUpdate).toBe(false)

    await act(async () => root.configure({ shadows: 'variance' }))
    expect(shadowMap.type).toBe(THREE.VSMShadowMap)
    expect(shadowMap.enabled).toBe(true)
    expect(shadowMap.needsUpdate).toBe(true)
    await act(async () => root.configure({}))
    expect(shadowMap.enabled).toBe(false)
  })

  it('does not reapply equivalent inline shadow objects', async () => {
    const store = await mount({ shadows: { type: THREE.PCFShadowMap, autoUpdate: true } })
    const { shadowMap } = store.getState().gl
    shadowMap.type = THREE.BasicShadowMap
    shadowMap.autoUpdate = false
    shadowMap.needsUpdate = false

    await act(async () => root.configure({ shadows: { type: THREE.PCFShadowMap, autoUpdate: true } }))
    expect(shadowMap.type).toBe(THREE.BasicShadowMap)
    expect(shadowMap.autoUpdate).toBe(false)
    expect(shadowMap.needsUpdate).toBe(false)
  })

  it('detects removed shadow keys', async () => {
    const store = await mount({ shadows: { enabled: false, type: THREE.BasicShadowMap } })
    expect(store.getState().gl.shadowMap.enabled).toBe(false)
    await act(async () => root.configure({ shadows: { type: THREE.BasicShadowMap } }))
    expect(store.getState().gl.shadowMap.enabled).toBe(true)
  })

  it('applies defaults on the first configure even to a preconfigured renderer', async () => {
    const gl = new THREE.WebGLRenderer({ canvas })
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.BasicShadowMap
    const store = await mount({ gl })
    expect(gl.shadowMap.enabled).toBe(false)
    expect(gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
    expect(store.getState().viewport.dpr).toBe(window.devicePixelRatio)

    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.BasicShadowMap
    await act(async () => root.configure({ gl }))
    expect(gl.shadowMap.enabled).toBe(true)
    expect(gl.shadowMap.type).toBe(THREE.BasicShadowMap)
  })

  it('preserves runtime performance and reapplies a removed then reintroduced prop', async () => {
    const store = await mount({ performance: { min: 0.5, max: 1 } })
    await act(async () => store.setState((state) => ({ performance: { ...state.performance, min: 0.2 } })))
    await act(async () => root.configure({ performance: { min: 0.5, max: 1 } }))
    expect(store.getState().performance.min).toBe(0.2)

    // A removed key is a prop change; merging still preserves unspecified fields.
    await act(async () => root.configure({ performance: { min: 0.5 } }))
    expect(store.getState().performance.min).toBe(0.5)
    expect(store.getState().performance.max).toBe(1)
    await act(async () => store.setState((state) => ({ performance: { ...state.performance, min: 0.2 } })))
    await act(async () => root.configure({}))
    expect(store.getState().performance.min).toBe(0.2)
    await act(async () => root.configure({ performance: { min: 0.5 } }))
    expect(store.getState().performance.min).toBe(0.5)
  })

  it('measures a direct root again when no explicit size is supplied', async () => {
    const parent = document.createElement('div')
    parent.appendChild(canvas)
    const bounds = jest.spyOn(parent, 'getBoundingClientRect')
    bounds.mockReturnValue({ width: 100, height: 100, top: 0, left: 0 } as DOMRect)
    const store = await mount()
    bounds.mockReturnValue({ width: 200, height: 100, top: 5, left: 10 } as DOMRect)
    await act(async () => root.configure())
    expect(store.getState().size).toEqual({ width: 200, height: 100, top: 5, left: 10 })
  })

  it('updates renderer and raycaster options only when their inputs change', async () => {
    const store = await mount({ gl: { toneMappingExposure: 2 }, raycaster: { near: 2 } })
    const { gl, raycaster } = store.getState()
    gl.toneMappingExposure = 0.5
    raycaster.near = 0.5
    await act(async () => root.configure({ gl: { toneMappingExposure: 2 }, raycaster: { near: 2 } }))
    expect(gl.toneMappingExposure).toBe(0.5)
    expect(raycaster.near).toBe(0.5)
    await act(async () => root.configure({ gl: { toneMappingExposure: 3 }, raycaster: { near: 3 } }))
    expect(gl.toneMappingExposure).toBe(3)
    expect(raycaster.near).toBe(3)
  })

  it('applies changed color settings and preserves runtime changes on unrelated configuration', async () => {
    const store = await mount()
    const { gl } = store.getState()
    gl.toneMapping = THREE.ReinhardToneMapping
    gl.outputColorSpace = THREE.LinearSRGBColorSpace
    await act(async () => root.configure())
    expect(gl.toneMapping).toBe(THREE.ReinhardToneMapping)
    expect(gl.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)

    await act(async () => root.configure({ flat: true, linear: true }))
    expect(gl.toneMapping).toBe(THREE.NoToneMapping)
    expect(store.getState().flat).toBe(true)
    expect(store.getState().linear).toBe(true)
    await act(async () => root.configure())
    expect(gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('preserves explicit renderer options when color modes change', async () => {
    const options = {
      toneMapping: THREE.ReinhardToneMapping,
      outputColorSpace: THREE.LinearSRGBColorSpace,
      toneMappingExposure: 2,
    }
    const store = await mount({ gl: options, flat: false, linear: true })
    const { gl } = store.getState()
    gl.toneMappingExposure = 0.5

    await act(async () => root.configure({ gl: options, flat: true, linear: false }))
    expect(gl.toneMapping).toBe(THREE.ReinhardToneMapping)
    expect(gl.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(gl.toneMappingExposure).toBe(0.5)
    expect(store.getState().flat).toBe(true)
    expect(store.getState().linear).toBe(false)
  })

  it('updates and removes callbacks without resetting runtime settings', async () => {
    const initial = jest.fn()
    const next = jest.fn()
    const store = await mount({ onPointerMissed: initial })
    await act(async () => store.getState().setFrameloop('demand'))
    await act(async () => root.configure({ onPointerMissed: next }))
    expect(store.getState().onPointerMissed).toBe(next)
    expect(store.getState().frameloop).toBe('demand')
    await act(async () => root.configure())
    expect(store.getState().onPointerMissed).toBeUndefined()
  })

  it('does not publish store updates for unchanged configuration', async () => {
    const store = await mount({ shadows: true, performance: { min: 0.5 } })
    const listener = jest.fn()
    const unsubscribe = store.subscribe(listener)
    await act(async () => root.configure({ shadows: true, performance: { min: 0.5 } }))
    expect(listener).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('keeps configuration history independent between roots', async () => {
    const store = await mount({ shadows: true })
    store.getState().gl.shadowMap.type = THREE.BasicShadowMap
    const other = createRoot(document.createElement('canvas'))
    try {
      const otherStore = await act(async () => (await other.configure({ shadows: true })).render(null))
      expect(otherStore.getState().gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
      await act(async () => root.configure({ shadows: true }))
      expect(store.getState().gl.shadowMap.type).toBe(THREE.BasicShadowMap)
    } finally {
      await act(async () => other.unmount())
    }
  })
})

describe('configuration lifecycle', () => {
  it('serializes configuration requested by store subscribers', async () => {
    const props = { dpr: 1, frameloop: 'never' } as const
    const store = await mount(props)
    const next = { ...props, dpr: 2 }
    let updates = 0
    const unsubscribe = store.subscribe(() => {
      // Bound the regression so a recursive implementation fails without overflowing.
      if (++updates < 10) root.configure(next)
    })
    try {
      await act(async () => root.configure(next))
      await root.ready
      expect(updates).toBe(1)
      expect(store.getState().viewport.dpr).toBe(2)
    } finally {
      unsubscribe()
    }
  })

  it('queues calls from the renderer factory before publishing readiness or mounting', async () => {
    const created = jest.fn()
    const factory = jest.fn((props) => {
      expect(root.ready.status).toBe('pending')
      root.configure({ dpr: 2, frameloop: 'never', onCreated: created })
      root.configure({ dpr: 3, frameloop: 'never', onCreated: created })
      return new THREE.WebGLRenderer(props)
    })
    await act(async () => {
      const first = root.configure({ gl: factory, dpr: 1 })
      expect(first.status).toBe('fulfilled')
      expect(root.ready.status).toBe('pending')
      root.render(null)
      expect(created).not.toHaveBeenCalled()
      await root.ready
    })
    expect(factory).toHaveBeenCalledTimes(1)
    expect(created).toHaveBeenCalledTimes(1)
    expect(created.mock.calls[0][0].viewport.dpr).toBe(3)
  })

  it('rejects reentrant queued work after failure and allows a later retry', async () => {
    const store = await mount({ dpr: 1 })
    const error = new Error('cannot apply')
    let queued!: ReturnType<typeof root.configure>
    const unsubscribe = store.subscribe(() => {
      unsubscribe()
      queued = root.configure({ dpr: 3 })
      throw error
    })
    await expect(root.configure({ dpr: 2 })).rejects.toBe(error)
    await expect(queued).rejects.toBe(error)
    expect(root.ready).toBe(queued)
    expect(root.ready.status).toBe('rejected')
    await act(async () => root.configure({ dpr: 1 }))
    expect(store.getState().viewport.dpr).toBe(1)
  })

  it('finishes reentrant queued work before disposing its renderer', async () => {
    const gl = new THREE.WebGLRenderer({ canvas })
    const store = await mount({ gl: () => gl, dpr: 1, frameloop: 'never' })
    const dispose = jest.spyOn(gl, 'dispose')
    let queued!: ReturnType<typeof root.configure>
    const unsubscribe = store.subscribe(() => {
      unsubscribe()
      queued = root.configure({ dpr: 3, frameloop: 'never' })
      root.unmount()
    })
    await act(async () => root.configure({ dpr: 2, frameloop: 'never' }))
    await expect(queued).resolves.toBe(root)
    expect(store.getState().viewport.dpr).toBe(3)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(_roots.has(canvas)).toBe(false)
  })

  it('applies queued inputs in order before mounting', async () => {
    let resolve!: (_gl: THREE.WebGLRenderer) => void
    const pending = new Promise<THREE.WebGLRenderer>((done) => (resolve = done))
    const gl = new THREE.WebGLRenderer({ canvas })
    const onCreated = jest.fn()
    root.configure({ gl: () => pending, shadows: true })
    root.configure({ shadows: { type: THREE.BasicShadowMap }, frameloop: 'never', onCreated })
    const store = root.render(null)
    await act(async () => resolve(gl))
    expect(store.getState().gl.shadowMap.enabled).toBe(true)
    expect(store.getState().gl.shadowMap.type).toBe(THREE.BasicShadowMap)
    expect(store.getState().frameloop).toBe('never')
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(onCreated.mock.calls[0][0].frameloop).toBe('never')
  })

  it('compares queued work with applied inputs without overwriting intervening runtime changes', async () => {
    let resolve!: (_gl: THREE.WebGLRenderer) => void
    const pending = new Promise<THREE.WebGLRenderer>((done) => (resolve = done))
    const gl = new THREE.WebGLRenderer({ canvas })
    const first = root.configure({ gl: () => pending, shadows: true })
    first.then(() => {
      gl.shadowMap.type = THREE.BasicShadowMap
    })
    const second = root.configure({ shadows: true })
    await act(async () => resolve(gl))
    await second
    expect(gl.shadowMap.type).toBe(THREE.BasicShadowMap)
  })

  it('reapplies inputs after a failure that partially changed renderer state', async () => {
    const store = await mount({ shadows: true })
    const gl = store.getState().gl
    let fail = true
    Object.defineProperty(gl, 'toneMappingExposure', {
      configurable: true,
      get: () => 1,
      set: () => {
        if (fail) throw new Error('cannot apply')
      },
    })
    await expect(root.configure({ shadows: 'basic', gl: { toneMappingExposure: 2 } })).rejects.toThrow('cannot apply')
    expect(gl.shadowMap.type).toBe(THREE.BasicShadowMap)
    fail = false
    await act(async () => root.configure({ shadows: true }))
    expect(gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })
})
