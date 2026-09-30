import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import { ReconcilerRoot, RenderProps, RootStore, createRoot, extend } from '../src/index'

extend(THREE as any)

type Listener = () => void
const queries: { media: string; listeners: Set<Listener> }[] = []

// A resolution query matches one ratio. Moving to another display or zooming changes the ratio and
// fires `change` on the queries that stopped matching
function setDisplayDpr(dpr: number) {
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: dpr })
  for (const query of [...queries]) {
    if (query.media !== `(resolution: ${dpr}dppx)`) query.listeners.forEach((listener) => listener())
  }
}

function listenerCount() {
  return queries.reduce((count, query) => count + query.listeners.size, 0)
}

const originalDpr = window.devicePixelRatio
const originalMatchMedia = window.matchMedia
let roots: ReconcilerRoot<HTMLCanvasElement>[] = []

beforeEach(() => {
  queries.length = 0
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 1 })
  window.matchMedia = jest.fn((media: string) => {
    const query = { media, listeners: new Set<Listener>() }
    queries.push(query)
    return {
      media,
      matches: true,
      addEventListener: (_: string, listener: Listener) => query.listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => query.listeners.delete(listener),
    } as unknown as MediaQueryList
  })
})

afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount())
  roots = []
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: originalDpr })
  window.matchMedia = originalMatchMedia
})

async function render(
  dpr?: RenderProps<HTMLCanvasElement>['dpr'],
): Promise<[ReconcilerRoot<HTMLCanvasElement>, RootStore]> {
  const root = createRoot(createCanvas())
  roots.push(root)
  const store = await act(async () => (await root.configure(dpr === undefined ? {} : { dpr })).render(<group />))
  return [root, store]
}

describe('dpr display changes', () => {
  it('re-resolves the dpr prop when devicePixelRatio changes', async () => {
    const [, store] = await render([1, 2])
    expect(store.getState().viewport.dpr).toBe(1)

    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(2)
    expect(store.getState().gl.getPixelRatio()).toBe(2)

    // Still clamped by the prop
    await act(async () => setDisplayDpr(3))
    expect(store.getState().viewport.dpr).toBe(2)

    await act(async () => setDisplayDpr(1.5))
    expect(store.getState().viewport.dpr).toBe(1.5)
  })

  it('follows the default dpr', async () => {
    const [, store] = await render()
    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(2)
  })

  it('leaves a fixed dpr alone, without touching matchMedia', async () => {
    const [, store] = await render(1)
    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(1)
    expect(window.matchMedia).not.toHaveBeenCalled()
  })

  it('starts following once a fixed dpr becomes a range', async () => {
    const [root, store] = await render(1)
    await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    expect(listenerCount()).toBe(1)

    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(2)
  })

  it('redraws a demand frameloop after a display change', async () => {
    const root = createRoot(createCanvas())
    roots.push(root)
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    const store = await act(async () => (await root.configure({ dpr: [1, 2], frameloop: 'demand' })).render(<group />))
    await act(async () => {
      await nextFrame()
      await nextFrame()
    })
    const draw = jest.spyOn(store.getState().gl, 'render')

    await act(async () => {
      setDisplayDpr(2)
      await nextFrame()
      await nextFrame()
    })
    expect(draw).toHaveBeenCalled()
  })

  it('uses the latest dpr prop', async () => {
    const [root, store] = await render([1, 2])
    await act(async () => (await root.configure({ dpr: [1, 1.5] })).render(<group />))

    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(1.5)
  })

  it('treats a display change like a re-render: the prop wins over setDpr', async () => {
    const [root, store] = await render([1, 2])
    await act(async () => store.getState().setDpr(0.5))

    // A re-render already re-resolves the prop in 9.x
    await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    expect(store.getState().viewport.dpr).toBe(1)

    await act(async () => store.getState().setDpr(0.5))
    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(2)
  })

  it('keeps initialDpr', async () => {
    const [, store] = await render([1, 2])
    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.initialDpr).toBe(1)
  })

  it('waits for an XR session to end', async () => {
    const [, store] = await render([1, 2])
    const { gl } = store.getState()

    await act(async () => {
      gl.xr.isPresenting = true
      gl.xr.dispatchEvent({ type: 'sessionstart' })
    })
    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(1)

    await act(async () => {
      gl.xr.isPresenting = false
      gl.xr.dispatchEvent({ type: 'sessionend' })
    })
    expect(store.getState().viewport.dpr).toBe(2)
    expect(gl.getPixelRatio()).toBe(2)
  })

  it('waits while an XR session is starting', async () => {
    const [, store] = await render([1, 2])
    const { gl } = store.getState()
    // three holds the session before it sets isPresenting
    const getSession = jest.spyOn(gl.xr, 'getSession').mockReturnValue({} as XRSession)

    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(1)

    getSession.mockReturnValue(null)
    await act(async () => gl.xr.dispatchEvent({ type: 'sessionend' }))
    expect(store.getState().viewport.dpr).toBe(2)
  })

  it('follows the latest createRoot for a canvas', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const canvas = createCanvas()
    const first = createRoot(canvas)
    roots.push(first)
    await act(async () => (await first.configure({ dpr: [1, 2] })).render(<group />))

    const second = createRoot(canvas)
    const store = await act(async () => (await second.configure({ dpr: [1, 1.5] })).render(<group />))
    expect(listenerCount()).toBe(1)

    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(1.5)
    warn.mockRestore()
  })

  it('watches once per root and stops on unmount', async () => {
    const [root] = await render([1, 2])
    await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    expect(listenerCount()).toBe(1)

    await act(async () => setDisplayDpr(2))
    expect(listenerCount()).toBe(1)

    await act(async () => root.unmount())
    roots = []
    expect(listenerCount()).toBe(0)
  })

  it('works with a partial matchMedia', async () => {
    for (const result of [undefined, { matches: false }]) {
      window.matchMedia = (() => result) as unknown as typeof window.matchMedia
      const [root, store] = await render([1, 2])
      expect(store.getState().viewport.dpr).toBe(1)
      await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    }
  })

  it('works with a matchMedia that throws', async () => {
    window.matchMedia = (() => {
      throw new SyntaxError('unsupported media query')
    }) as unknown as typeof window.matchMedia
    const [root, store] = await render([1, 2])
    expect(store.getState().viewport.dpr).toBe(1)
    await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
  })

  it('applies a change even when watching again throws', async () => {
    const [, store] = await render([1, 2])
    const working = window.matchMedia
    window.matchMedia = (() => {
      throw new SyntaxError('unsupported media query')
    }) as unknown as typeof window.matchMedia

    await act(async () => setDisplayDpr(2))
    expect(store.getState().viewport.dpr).toBe(2)
    expect(listenerCount()).toBe(0)
    window.matchMedia = working
  })

  it('works without matchMedia', async () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    const [, store] = await render([1, 2])
    expect(store.getState().viewport.dpr).toBe(1)
  })
})
