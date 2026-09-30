/**
 * @fileoverview What the `renderer` / `gl` props bag means, and the props v10 moved out of it.
 *
 * The bag configures a renderer the canvas owns: constructor parameters, renderer properties, and
 * R3F's own renderer settings (`shadows`, `textureColorSpace`). Multi-canvas and scheduling are
 * Canvas props (`primary`, `share`, `scheduler`), and `shadows` is no longer a top-level prop. The
 * old forms throw, naming the new API, instead of being silently ignored or leaking onto the
 * renderer.
 */
import { act } from 'react'
import * as THREE from 'three'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

const gpu = vi.hoisted(() => ({ instances: [] as any[] }))

// The root entry builds the WebGPU renderer from its support module's `Renderer`
vi.mock('../src/support/webgpu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/support/webgpu')>()
  class RecordingRenderer {
    params: Record<string, unknown>
    backend = { isWebGPUBackend: true }
    shadowMap = { enabled: false, type: 0, needsUpdate: false }
    outputColorSpace = ''
    toneMapping = 0
    xr = { addEventListener: () => {}, removeEventListener: () => {}, enabled: false, isPresenting: false }
    private initialized = false
    constructor(params: Record<string, unknown>) {
      this.params = params
      gpu.instances.push(this)
    }
    async init() {
      this.initialized = true
    }
    hasInitialized() {
      return this.initialized
    }
    setSize() {}
    setPixelRatio() {}
    render() {}
    dispose() {}
  }
  return { webgpuSupport: { ...actual.webgpuSupport, Renderer: RecordingRenderer } }
})

import { createRoot } from '../src'
import { createRoot as createLegacyRoot } from '../src/legacy'

type AnyRoot = { configure: (props?: any) => Promise<any>; render: (el: any) => any; unmount: () => void }

describe('renderer config', () => {
  const roots: AnyRoot[] = []
  const root = (legacy = false) => {
    const created = (legacy ? createLegacyRoot : createRoot)(createCanvas()) as unknown as AnyRoot
    roots.push(created)
    return created
  }

  beforeEach(() => {
    Scheduler.reset()
    gpu.instances.length = 0
  })

  afterEach(async () => {
    await act(async () => {
      for (const r of roots) r.unmount()
    })
    roots.length = 0
    Scheduler.reset()
  })

  describe('props moved out of the renderer bag throw, naming the new API', () => {
    it('renderer={{ primaryCanvas }}', async () => {
      await expect(root().configure({ renderer: { primaryCanvas: 'main' } })).rejects.toThrow(
        'R3F: `renderer={{ primaryCanvas }}` was removed: mark the owner <Canvas primary> and other canvases share it automatically (or use share="id")',
      )
    })

    it('renderer={{ scheduler }}', async () => {
      await expect(root().configure({ renderer: { scheduler: { fps: 30 } } })).rejects.toThrow(
        'R3F: `renderer={{ scheduler }}` moved to <Canvas scheduler>',
      )
    })

    it('renderer={{ scheduler }} alongside real options', async () => {
      await expect(root().configure({ renderer: { antialias: false, scheduler: { after: 'main' } } })).rejects.toThrow(
        'moved to <Canvas scheduler>',
      )
    })

    it('gl={{ primaryCanvas }} and gl={{ scheduler }}', async () => {
      await expect(root().configure({ gl: { primaryCanvas: 'main' } })).rejects.toThrow('`gl={{ primaryCanvas }}`')
      await expect(root().configure({ gl: { scheduler: { order: 1 } } })).rejects.toThrow(
        '`gl={{ scheduler }}` moved to <Canvas scheduler>',
      )
    })

    it('the top-level primaryCanvas prop', async () => {
      await expect(root().configure({ primaryCanvas: 'main', renderer: true })).rejects.toThrow(
        'R3F: `primaryCanvas` was removed',
      )
    })

    it('the top-level shadows prop', async () => {
      await expect(root().configure({ shadows: true })).rejects.toThrow(
        'R3F: the `shadows` Canvas prop moved into the renderer settings: use `renderer={{ shadows }}`',
      )
      await expect(root(true).configure({ shadows: 'soft' })).rejects.toThrow('`gl={{ shadows }}`')
    })

    it('builds no renderer for a rejected config', async () => {
      await expect(root().configure({ renderer: { primaryCanvas: 'main' } })).rejects.toThrow()
      expect(gpu.instances).toHaveLength(0)
    })
  })

  describe('the renderer bag', () => {
    it('keeps multi-canvas and scheduler config off the renderer: they are Canvas props', async () => {
      const r = root()
      const store = await act(async () =>
        (await r.configure({ renderer: {}, scheduler: { order: 2 }, frameloop: 'never' })).render(null),
      )
      const renderer = gpu.instances[0]
      expect(store.getState().internal.actualRenderer).toBe(renderer)
      for (const key of ['primaryCanvas', 'scheduler', 'primary', 'share']) {
        expect(renderer.params).not.toHaveProperty(key)
        expect(renderer).not.toHaveProperty(key)
      }
    })

    it('passes WebGPU constructor options to the constructor only, never onto the instance', async () => {
      const r = root()
      const getFallback = () => null
      const constructorOnly = {
        forceWebGL: true,
        depth: false,
        stencil: true,
        logarithmicDepthBuffer: true,
        reversedDepthBuffer: true,
        outputBufferType: THREE.HalfFloatType,
        multiview: true,
        getFallback,
        trackTimestamp: true,
        antialias: false,
        alpha: false,
        samples: 4,
        powerPreference: 'low-power',
      }
      await act(async () =>
        (
          await r.configure({
            renderer: { ...constructorOnly, toneMapping: THREE.NoToneMapping, textureColorSpace: 'srgb-linear' },
            frameloop: 'never',
          })
        ).render(null),
      )
      const renderer = gpu.instances[0]
      expect(renderer.params).toMatchObject(constructorOnly)
      for (const key of Object.keys(constructorOnly)) expect(renderer).not.toHaveProperty(key)
      // Renderer properties are applied; R3F's own settings are neither parameters nor properties
      expect(renderer.toneMapping).toBe(THREE.NoToneMapping)
      expect(renderer.params).not.toHaveProperty('textureColorSpace')
      expect(renderer).not.toHaveProperty('textureColorSpace')
    })

    it('reads shadows from the bag', async () => {
      const r = root()
      await act(async () => (await r.configure({ renderer: { shadows: 'variance' }, frameloop: 'never' })).render(null))
      const renderer = gpu.instances[0]
      expect(renderer.shadowMap.enabled).toBe(true)
      expect(renderer.shadowMap.type).toBe(THREE.VSMShadowMap)
      expect(renderer.params).not.toHaveProperty('shadows')
      expect(renderer).not.toHaveProperty('shadows')
    })

    it('reads shadows from the gl bag on /legacy', async () => {
      const store = await act(async () =>
        (await root(true).configure({ gl: { shadows: 'basic' }, frameloop: 'never' })).render(null),
      )
      const { gl } = store.getState()
      expect(gl.shadowMap.enabled).toBe(true)
      expect(gl.shadowMap.type).toBe(THREE.BasicShadowMap)
      expect(gl).not.toHaveProperty('shadows')
    })

    it("leaves a renderer instance's shadow map alone", async () => {
      const r = root()
      const Renderer = (await import('../src/support/webgpu')).webgpuSupport.Renderer as any
      const instance = new Renderer({ canvas: createCanvas() })
      instance.shadowMap.enabled = true
      await act(async () => (await r.configure({ renderer: instance, frameloop: 'never' })).render(null))
      expect(instance.shadowMap.enabled).toBe(true)
    })
  })

  describe('scheduler on /legacy', () => {
    const renderOrder: string[] = []
    const legacyRoot = async (name: string, props: Record<string, unknown>) => {
      const r = root(true)
      await act(async () =>
        (
          await r.configure({
            ...props,
            gl: (defaults: any) => {
              const renderer = new THREE.WebGLRenderer(defaults)
              renderer.render = () => void renderOrder.push(name)
              return renderer
            },
            frameloop: 'never',
          })
        ).render(null),
      )
      return r
    }

    beforeEach(() => {
      renderOrder.length = 0
    })

    it('orders roots with after and order', async () => {
      await legacyRoot('second', { id: 'legacy-second', scheduler: { after: 'legacy-first' } })
      await legacyRoot('first', { id: 'legacy-first' })
      await legacyRoot('last', { id: 'legacy-last', scheduler: { order: 10 } })

      getScheduler().step(1000)
      expect(renderOrder).toEqual(['first', 'second', 'last'])
    })

    it('throttles the default render with fps', async () => {
      await legacyRoot('throttled', { id: 'legacy-throttled', scheduler: { fps: 30 } })

      getScheduler().step(1000)
      getScheduler().step(1010)
      getScheduler().step(1050)
      expect(renderOrder).toEqual(['throttled', 'throttled'])
    })

    it('has no renderer sharing: primary and share="id" throw', async () => {
      await expect(root(true).configure({ primary: true })).rejects.toThrow(
        '<Canvas primary> shares a WebGPU renderer and is not available on this entry',
      )
      await expect(root(true).configure({ share: 'main' })).rejects.toThrow('share="main" borrows a WebGPU renderer')
    })
  })
})
