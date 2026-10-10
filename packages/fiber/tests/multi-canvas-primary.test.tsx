/**
 * `<Canvas primary>`, automatic sharing, `share`, and the timing around them.
 *
 * A primary owns a WebGPU renderer; every other WebGPU canvas shares it (drawing into its own
 * element through a CanvasTarget) unless it opts out with `share={false}` or brings its own renderer
 * instance/factory. `share="id"` names one primary when there are several. Sharing is decided when a
 * canvas creates its renderer, so the primary announces itself synchronously on mount: a canvas in
 * the same commit waits for it wherever it sits in the tree, and a canvas that was already running
 * when a primary mounted keeps its own renderer (with a warning).
 *
 * No GPU: the canvases use the root entry's provider shape (WebGL, or WebGPU when asked) with a
 * WebGPU support whose renderer is a mock keeping three's CanvasTarget contract (a default target
 * around its element, setCanvasTarget, target-implicit sizing).
 */
// Must load before react-dom, which hands its refresh entry points to the DevTools hook on load
import { hotSwap, findComponentType, refreshAvailable } from './utils/refresh'

import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { getScheduler, Scheduler } from '@pmndrs/scheduler'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

import { Canvas as CoreCanvas } from '../src/web/Canvas'
import { createRoot as createCoreRoot, _roots } from '../src/core/root'
import { livePrimaryKeys, resetCanvasRegistry } from '../src/core/renderer'
import { webgpuSupport } from '../src/support/webgpu'
import type { RendererProvider, RootStore, WebGPUSupport } from '../src'
// The core Canvas's props (the root entry's CanvasProps types onCreated against WebGPURootState)
import type { CanvasProps } from '../types/canvas'

const gpu = { instances: [] as MockWebGPURenderer[], drawn: [] as HTMLCanvasElement[] }
const { CanvasTarget } = webgpuSupport
type Target = InstanceType<typeof CanvasTarget>

class MockWebGPURenderer {
  params: Record<string, any>
  backend = { isWebGPUBackend: true, updateSize: () => {} }
  shadowMap = { enabled: false, type: 0, needsUpdate: false }
  outputColorSpace = ''
  toneMapping = 0
  renderLists = { dispose: () => {} }
  xr = {
    enabled: false,
    isPresenting: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAnimationLoop: () => {},
  }
  private initialized = false
  private target: Target
  constructor(params: Record<string, any>) {
    this.params = params
    this.target = new CanvasTarget(params.canvas)
    gpu.instances.push(this)
  }
  async init() {
    this.initialized = true
  }
  hasInitialized() {
    return this.initialized
  }
  getCanvasTarget() {
    return this.target
  }
  setCanvasTarget(target: Target) {
    this.target = target
  }
  setSize(width: number, height: number, updateStyle?: boolean) {
    this.target.setSize(width, height, updateStyle)
  }
  setPixelRatio(value: number) {
    this.target.setPixelRatio(value)
  }
  /** Records which element each frame went to: the active target's */
  render() {
    gpu.drawn.push(this.target.domElement as HTMLCanvasElement)
  }
  dispose = vi.fn()
}

// The root entry's provider, with the WebGPU support building the mock
const mockSupport = { ...webgpuSupport, Renderer: MockWebGPURenderer } as unknown as WebGPUSupport
const provider: RendererProvider = {
  webgl: () => import('../src/support/webgl').then((m) => m.webglSupport),
  webgpu: async () => mockSupport,
}
const Canvas = (props: CanvasProps) => <CoreCanvas {...props} provider={provider} />
const createRoot = (canvas: HTMLCanvasElement) => createCoreRoot(canvas, provider)

//* Helpers ==============================

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const settle = (ms = 60) => act(async () => wait(ms))

/** A sized box with one Canvas, found again by its test id. */
function Box({ name, ...props }: CanvasProps & { name: string }) {
  return (
    <div style={{ width: 100, height: 100 }}>
      <Canvas data-testid={name} frameloop="never" {...props} />
    </div>
  )
}

class Boundary extends React.Component<{ onError: (error: Error) => void; children: React.ReactNode }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error) {
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function canvasOf(name: string): HTMLCanvasElement {
  return document.querySelector(`[data-testid="${name}"] canvas`) as HTMLCanvasElement
}

function storeOf(name: string): RootStore {
  const store = _roots.get(canvasOf(name))?.store
  if (!store) throw new Error(`no root for ${name}`)
  return store
}

const rendererOf = (name: string) => storeOf(name).getState().internal.actualRenderer as any

let unmountAll: (() => void) | null = null
async function mount(ui: React.ReactElement, ms?: number) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(ui)
    unmountAll = result.unmount
  })
  await settle(ms)
  return result
}

describe('<Canvas primary> and renderer sharing', () => {
  let warn: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    Scheduler.reset()
    gpu.instances.length = 0
    gpu.drawn.length = 0
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(async () => {
    await act(async () => unmountAll?.())
    unmountAll = null
    await settle(20)
    // Every primary withdrew on unmount: nothing is left for the next test to share
    expect(livePrimaryKeys()).toEqual([])
    resetCanvasRegistry()
    Scheduler.reset()
    vi.restoreAllMocks()
  })

  const warnings = (text: string) => warn.mock.calls.filter(([message]: unknown[]) => String(message).includes(text))

  //* Ownership ==============================

  it('a canvas next to a primary shares its renderer, on the root entry without a renderer prop', async () => {
    await mount(
      <>
        <Box name="main" primary renderer={{ shadows: true }} />
        <Box name="side" />
      </>,
    )

    expect(gpu.instances).toHaveLength(1)
    const primary = storeOf('main').getState()
    const side = storeOf('side').getState()
    // `primary` implies WebGPU, and so does a primary to share: neither is a WebGL root
    expect(primary.isLegacy).toBe(false)
    expect(side.isLegacy).toBe(false)
    expect(side.internal.actualRenderer).toBe(primary.internal.actualRenderer)
    expect(side.internal.isSecondary).toBe(true)
    expect(side.primaryStore).toBe(storeOf('main'))
    expect(side.internal.canvasTarget?.domElement).toBe(canvasOf('side'))
    expect(primary.internal.isMultiCanvas).toBe(true)
    // Renderer-wide settings come from the primary
    expect(rendererOf('main').shadowMap.enabled).toBe(true)
  })

  it('waits for a primary placed after it in the same commit', async () => {
    await mount(
      <>
        <Box name="side" />
        <Box name="main" primary />
      </>,
    )

    expect(gpu.instances).toHaveLength(1)
    expect(rendererOf('side')).toBe(rendererOf('main'))
    expect(storeOf('side').getState().internal.isSecondary).toBe(true)
  })

  it('renders a sharing canvas after its primary by default, even one without an id', async () => {
    await mount(
      <>
        <Box name="side" />
        <Box name="main" primary />
      </>,
    )

    // Mounted (and registered with the scheduler) first, yet it draws after the primary
    getScheduler().step(1000)
    expect(gpu.drawn).toEqual([canvasOf('main'), canvasOf('side')])
  })

  it('orders a sharing canvas by its own scheduler prop, and keeps its fps', async () => {
    await mount(
      <>
        <Box name="main" id="main" primary />
        <Box name="side" scheduler={{ before: 'main', fps: 30 }} />
      </>,
    )

    getScheduler().step(1000)
    expect(gpu.drawn).toEqual([canvasOf('side'), canvasOf('main')])

    gpu.drawn.length = 0
    getScheduler().step(1010)
    // The throttled sharing canvas skips this frame; the primary does not
    expect(gpu.drawn).toEqual([canvasOf('main')])
  })

  it('share={false} keeps its own renderer', async () => {
    await mount(
      <>
        <Box name="main" primary />
        <Box name="own" share={false} renderer={{ toneMapping: 0 }} />
      </>,
    )

    expect(gpu.instances).toHaveLength(2)
    expect(rendererOf('own')).not.toBe(rendererOf('main'))
    expect(storeOf('own').getState().internal.isSecondary).toBeFalsy()
    expect(warnings('renderer settings on a sharing canvas')).toHaveLength(0)
  })

  it('a renderer props bag on a sharing canvas is ignored with one warning', async () => {
    const view = await mount(
      <>
        <Box name="main" primary />
        <Box name="side" renderer={{ toneMapping: 1, shadows: true }} />
      </>,
    )
    const shared = rendererOf('main')
    const before = { toneMapping: shared.toneMapping, shadows: shared.shadowMap.enabled }

    // Re-configure through a prop change
    view.rerender(
      <>
        <Box name="main" primary />
        <Box name="side" renderer={{ toneMapping: 1, shadows: true }} dpr={1} />
      </>,
    )
    await settle()

    expect(rendererOf('side')).toBe(shared)
    expect({ toneMapping: shared.toneMapping, shadows: shared.shadowMap.enabled }).toEqual(before)
    expect(
      warnings('renderer settings on a sharing canvas are ignored; set them on the <Canvas primary>'),
    ).toHaveLength(1)
  })

  it('a canvas with no primary around owns its renderer, as before', async () => {
    await mount(
      <>
        <Box name="a" renderer />
        <Box name="b" renderer />
        <Box name="gl" />
      </>,
    )

    expect(gpu.instances).toHaveLength(2)
    expect(rendererOf('a')).not.toBe(rendererOf('b'))
    // A plain Canvas on the root entry stays WebGL when nothing asks for WebGPU
    expect(storeOf('gl').getState().isLegacy).toBe(true)
  })

  //* Several primaries ==============================

  it('share="id" picks one of several primaries', async () => {
    await mount(
      <>
        <Box name="a" id="a" primary />
        <Box name="b" id="b" primary />
        <Box name="side" share="b" />
      </>,
    )

    expect(gpu.instances).toHaveLength(2)
    expect(rendererOf('side')).toBe(rendererOf('b'))
    expect(storeOf('side').getState().internal.targetId).toBe('b')
  })

  it('throws for a canvas that cannot tell which of several primaries to share', async () => {
    // React reports the caught error too
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const errors: Error[] = []
    await mount(
      <>
        <Box name="a" id="a" primary />
        <Box name="b" id="b" primary />
        <Boundary onError={(error) => errors.push(error)}>
          <Box name="side" />
        </Boundary>
      </>,
    )

    expect(errors.map((error) => error.message)).toEqual([
      expect.stringContaining('2 primaries are mounted (<Canvas id="a" primary>, <Canvas id="b" primary>)'),
    ])
    expect(errors[0].message).toContain('share="id"')
  })

  it('throws for two primaries without distinct ids; the first keeps its renderer', async () => {
    // React reports the caught error too
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const errors: Error[] = []
    await mount(
      <>
        <Box name="first" primary />
        <Boundary onError={(error) => errors.push(error)}>
          <Box name="second" primary />
        </Boundary>
        <Box name="side" />
      </>,
    )

    expect(errors.map((error) => error.message)).toEqual([
      expect.stringContaining('two <Canvas primary> are mounted without ids'),
    ])
    expect(gpu.instances).toHaveLength(1)
    expect(rendererOf('side')).toBe(rendererOf('first'))
  })

  //* Timing ==============================

  it('a primary mounting after canvases that own a renderer warns once and adopts none', async () => {
    const view = await mount(
      <>
        <Box name="early" renderer />
      </>,
    )
    expect(gpu.instances).toHaveLength(1)

    view.rerender(
      <>
        <Box name="early" renderer />
        <Box name="main" primary />
        <Box name="late" />
      </>,
    )
    await settle()

    expect(gpu.instances).toHaveLength(2)
    expect(rendererOf('early')).not.toBe(rendererOf('main'))
    // A canvas mounting with the primary still shares it
    expect(rendererOf('late')).toBe(rendererOf('main'))
    expect(warnings('mounted after 1 other WebGPU canvas(es) had already created their own renderer')).toHaveLength(1)
  })

  it('does not count canvases that opted out towards the late-primary warning', async () => {
    const view = await mount(<Box name="own" share={false} renderer />)
    view.rerender(
      <>
        <Box name="own" share={false} renderer />
        <Box name="main" primary />
      </>,
    )
    await settle()
    expect(warnings('mounted after')).toHaveLength(0)
  })

  it('a canvas mounting after the primary shares it', async () => {
    const view = await mount(<Box name="main" id="main" primary />)
    view.rerender(
      <>
        <Box name="main" id="main" primary />
        <Box name="later" />
      </>,
    )
    await settle()

    expect(gpu.instances).toHaveLength(1)
    expect(rendererOf('later')).toBe(rendererOf('main'))
  })

  it('a canvas waiting on a primary that unmounts before creating its renderer builds its own', async () => {
    let finish!: () => void
    const gate = new Promise<void>((resolve) => (finish = resolve))
    const slow = async (defaults: any) => {
      await gate
      return new MockWebGPURenderer(defaults) as any
    }
    const view = await mount(
      <>
        <Box key="main" name="main" primary renderer={slow} />
        <Box key="side" name="side" />
      </>,
    )
    expect(gpu.instances).toHaveLength(0)

    view.rerender(
      <>
        <Box key="side" name="side" />
      </>,
    )
    await settle()
    // The waiting canvas stopped waiting on the withdrawn primary
    expect(gpu.instances).toHaveLength(1)
    expect(storeOf('side').getState().internal.isSecondary).toBeFalsy()

    // The primary's late renderer is released, not published for new canvases to share
    await act(async () => {
      finish()
      await wait(20)
    })
    await settle()
    expect(livePrimaryKeys()).toEqual([])
    expect(gpu.instances[1].dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps sharing canvases rendering when the primary unmounts first', async () => {
    const view = await mount(
      <>
        <Box key="main" name="main" id="main" primary />
        <Box key="side" name="side" />
      </>,
    )
    const shared = rendererOf('main')

    view.rerender(
      <>
        <Box key="side" name="side" />
      </>,
    )
    await settle()

    expect(livePrimaryKeys()).toEqual([])
    expect(shared.dispose).not.toHaveBeenCalled()
    gpu.drawn.length = 0
    getScheduler().step(1000)
    expect(gpu.drawn).toEqual([canvasOf('side')])

    // The last canvas using it releases it
    view.rerender(<></>)
    await settle()
    expect(shared.dispose).toHaveBeenCalledTimes(1)
  })

  it('a remounted primary builds a new renderer while existing sharers keep theirs', async () => {
    const view = await mount(
      <>
        <Box key="v1" name="main" id="main" primary />
        <Box name="side" />
      </>,
    )
    const first = rendererOf('main')

    view.rerender(
      <>
        <Box key="v2" name="main" id="main" primary />
        <Box name="side" />
        <Box name="fresh" />
      </>,
    )
    await settle()

    const second = rendererOf('main')
    expect(second).not.toBe(first)
    expect(rendererOf('side')).toBe(first)
    expect(first.dispose).not.toHaveBeenCalled()
    expect(rendererOf('fresh')).toBe(second)
    expect(warnings('already registered')).toHaveLength(0)

    gpu.drawn.length = 0
    getScheduler().step(1000)
    expect(gpu.drawn).toHaveLength(3)
    expect(gpu.drawn).toEqual(expect.arrayContaining([canvasOf('main'), canvasOf('side'), canvasOf('fresh')]))
  })

  //* React ==============================

  it('survives StrictMode: one renderer, sharing, no stale announcement', async () => {
    const view = await mount(
      <React.StrictMode>
        <Box name="side" />
        <Box name="main" primary />
      </React.StrictMode>,
    )

    expect(gpu.instances).toHaveLength(1)
    expect(rendererOf('side')).toBe(rendererOf('main'))
    expect(warnings('createRoot should only be called once')).toHaveLength(0)
    expect(livePrimaryKeys()).toHaveLength(1)

    // A canvas added later shares immediately rather than waiting on a dead announcement
    view.rerender(
      <React.StrictMode>
        <Box name="side" />
        <Box name="main" primary />
        <Box name="later" />
      </React.StrictMode>,
    )
    await settle()
    expect(rendererOf('later')).toBe(rendererOf('main'))
    expect(gpu.instances).toHaveLength(1)
  })

  it('survives Fast Refresh of Canvas.tsx and of a user component', async () => {
    expect(refreshAvailable()).toBe(true)

    function Scene({ extra }: { extra?: boolean }) {
      return (
        <>
          <Box name="main" primary />
          <Box name="side" />
          {extra && <Box name="later" />}
        </>
      )
    }
    const view = await mount(<Scene />)
    const mainStore = storeOf('main')
    const sideStore = storeOf('side')
    const shared = rendererOf('main')

    // Edit Canvas.tsx: every CanvasImpl re-renders as a new function, replaying all its effects
    const previous = findComponentType(canvasOf('main'), 'CanvasImpl')!
    await act(async () => {
      hotSwap(previous, function CanvasImpl(props: any) {
        return previous(props)
      })
      await wait(10)
    })
    await settle()

    // Edit the user component
    await act(async () => {
      hotSwap(Scene, function Scene(props: { extra?: boolean }) {
        return (
          <>
            <Box name="main" primary />
            <Box name="side" />
            {props.extra && <Box name="later" />}
          </>
        )
      })
      await wait(10)
    })
    await settle()

    expect(storeOf('main')).toBe(mainStore)
    expect(storeOf('side')).toBe(sideStore)
    expect(rendererOf('side')).toBe(shared)
    expect(shared.dispose).not.toHaveBeenCalled()
    expect(gpu.instances).toHaveLength(1)
    expect(warnings('createRoot should only be called once')).toHaveLength(0)

    // The primary is still announced: a new canvas shares it
    view.rerender(<Scene extra />)
    await settle()
    expect(rendererOf('later')).toBe(shared)
    expect(gpu.instances).toHaveLength(1)
  })
})

//* createRoot ==============================

describe('configure({ primary, share })', () => {
  const roots: ReturnType<typeof createRoot>[] = []
  const newRoot = () => {
    const root = createRoot(createCanvas())
    roots.push(root)
    return root
  }
  const size = { width: 100, height: 100, top: 0, left: 0 }

  beforeEach(() => {
    Scheduler.reset()
    gpu.instances.length = 0
  })

  afterEach(async () => {
    await act(async () => {
      for (const root of roots) root.unmount()
    })
    roots.length = 0
    await settle(20)
    expect(livePrimaryKeys()).toEqual([])
    resetCanvasRegistry()
    Scheduler.reset()
  })

  it('announces a primary when configure is called, so a root configured next waits for it', async () => {
    const primary = newRoot()
    const secondary = newRoot()
    const [primaryRoot, secondaryRoot] = await act(async () =>
      Promise.all([
        primary.configure({ primary: true, size, frameloop: 'never' }),
        secondary.configure({ size, frameloop: 'never' }),
      ]),
    )
    const primaryStore = await act(async () => primaryRoot.render(null))
    const secondaryStore = await act(async () => secondaryRoot.render(null))

    expect(gpu.instances).toHaveLength(1)
    expect(secondaryStore.getState().internal.actualRenderer).toBe(primaryStore.getState().internal.actualRenderer)
    expect(secondaryStore.getState().internal.isSecondary).toBe(true)
  })

  it('rejects a second primary on the same key', async () => {
    await act(async () => (await newRoot().configure({ primary: true, size, frameloop: 'never' })).render(null))
    await expect(newRoot().configure({ primary: true, size })).rejects.toThrow(
      'two <Canvas primary> are mounted without ids',
    )
    await act(async () =>
      (await newRoot().configure({ id: 'x', primary: true, size, frameloop: 'never' })).render(null),
    )
    await expect(newRoot().configure({ id: 'x', primary: true, size })).rejects.toThrow(
      'two <Canvas primary> use the id "x"',
    )
  })

  it('rejects contradictory sharing config', async () => {
    await expect(newRoot().configure({ primary: true, share: 'x' })).rejects.toThrow(
      'a <Canvas primary> owns its renderer',
    )
    await expect(newRoot().configure({ primary: true, gl: {} })).rejects.toThrow('cannot be used with WebGL')
    await expect(newRoot().configure({ share: 'x', gl: {} })).rejects.toThrow('share="x" borrows a WebGPU renderer')
    await expect(newRoot().configure({ share: 'x', renderer: () => ({ render() {} }) as any })).rejects.toThrow(
      'cannot be combined with a renderer instance or factory',
    )
  })

  it('a renderer factory owns its renderer even next to a primary', async () => {
    const primaryStore = await act(async () =>
      (await newRoot().configure({ primary: true, size, frameloop: 'never' })).render(null),
    )
    const ownStore = await act(async () =>
      (
        await newRoot().configure({
          renderer: (defaults: any) => new MockWebGPURenderer(defaults) as any,
          size,
          frameloop: 'never',
        })
      ).render(null),
    )
    expect(ownStore.getState().internal.actualRenderer).not.toBe(primaryStore.getState().internal.actualRenderer)
    expect(ownStore.getState().internal.isSecondary).toBeFalsy()
  })

  it('share="id" waits for a primary configured later', async () => {
    const secondary = newRoot().configure({ share: 'later', size, frameloop: 'never' })
    await settle(10)
    const primaryStore = await act(async () =>
      (await newRoot().configure({ id: 'later', primary: true, size, frameloop: 'never' })).render(null),
    )
    const secondaryStore = await act(async () => (await secondary).render(null))
    expect(secondaryStore.getState().internal.actualRenderer).toBe(primaryStore.getState().internal.actualRenderer)
    expect(secondaryStore.getState().internal.targetId).toBe('later')
  })
})
