import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'

import { createRoot, useTexture, useTextures, useThree, extend } from '../src'
import type { UseTexturesReturn } from '../src'

extend(THREE as any)

/** Make TextureLoader.load resolve synchronously to a given texture (jsdom has no real image loading). */
function mockTextureLoad(tex: THREE.Texture) {
  return vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((
    _url: string,
    onLoad?: (t: any) => void,
  ) => {
    onLoad?.(tex)
    return tex
  }) as any)
}

describe('useTextures (registry)', () => {
  let root: ReturnType<typeof createRoot> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  /** Render a probe component that captures the registry handle. */
  async function mountProbe() {
    let api!: UseTexturesReturn
    let renders = 0
    function Probe() {
      api = useTextures()
      renders++
      return null
    }
    const store = await act(async () => root.render(<Probe />))
    return { store, getApi: () => api, getRenders: () => renders }
  }

  it('add + get + has across single, array, and record inputs', async () => {
    const { getApi } = await mountProbe()
    const a = new THREE.Texture()
    const b = new THREE.Texture()

    await act(async () => {
      getApi().add('a', a)
      getApi().add({ b })
    })

    const api = getApi()
    expect(api.has('a')).toBe(true)
    expect(api.has('missing')).toBe(false)

    // single
    expect(api.get('a')).toBe(a)
    expect(api.get('missing')).toBeUndefined()

    // array
    expect(api.get(['a', 'b', 'missing'])).toEqual([a, b, undefined])

    // record (mirrors input shape — lands straight into a material)
    expect(api.get({ map: 'a', normalMap: 'b' })).toEqual({ map: a, normalMap: b })
  })

  it('re-renders the consumer when the registry changes (reactive)', async () => {
    const { getApi, getRenders } = await mountProbe()
    const before = getRenders()

    await act(async () => {
      getApi().add('a', new THREE.Texture())
    })

    expect(getRenders()).toBeGreaterThan(before)
  })

  it('dispose frees GPU resources and removes the key', async () => {
    const { store, getApi } = await mountProbe()
    const tex = new THREE.Texture()
    const spy = vi.spyOn(tex, 'dispose')

    await act(async () => {
      getApi().add('a', tex)
    })

    let result!: boolean
    await act(async () => {
      result = getApi().dispose('a')
    })

    expect(result).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(store.getState().textures.has('a')).toBe(false)
  })

  it('disposeAll clears the registry and disposes everything', async () => {
    const { store, getApi } = await mountProbe()
    const a = new THREE.Texture()
    const b = new THREE.Texture()
    const sa = vi.spyOn(a, 'dispose')
    const sb = vi.spyOn(b, 'dispose')

    await act(async () => {
      getApi().add({ a, b })
    })
    await act(async () => {
      getApi().disposeAll()
    })

    expect(sa).toHaveBeenCalledTimes(1)
    expect(sb).toHaveBeenCalledTimes(1)
    expect(store.getState().textures.size).toBe(0)
  })

  it('dispose is refcount-aware: skips while referenced, force overrides', async () => {
    // A cached useTexture consumer holds a reference to the key.
    const tex = new THREE.Texture()
    mockTextureLoad(tex)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const URL = '/refcounted.png'
    let api!: UseTexturesReturn
    function Consumer() {
      useTexture(URL, { cache: true })
      api = useTextures()
      return null
    }

    const store = await act(async () => {
      const s = root.render(
        <React.Suspense fallback={null}>
          <Consumer />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
      return s
    })

    // Registered + retained by the mounted consumer
    expect(store.getState().textures.get(URL)).toBe(tex)
    expect(store.getState()._textureRefs.get(URL)).toBe(1)

    // dispose should refuse while referenced
    const disposeSpy = vi.spyOn(tex, 'dispose')
    let skipped!: boolean
    await act(async () => {
      skipped = api.dispose(URL)
    })
    expect(skipped).toBe(false)
    expect(warn).toHaveBeenCalled()
    expect(disposeSpy).not.toHaveBeenCalled()
    expect(store.getState().textures.has(URL)).toBe(true)

    // force overrides
    let forced!: boolean
    await act(async () => {
      forced = api.dispose(URL, { force: true })
    })
    expect(forced).toBe(true)
    expect(disposeSpy).toHaveBeenCalledTimes(1)
    expect(store.getState().textures.has(URL)).toBe(false)

    vi.restoreAllMocks()
  })

  it('releases the refcount when a cached consumer unmounts', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)

    const URL = '/unmount.png'
    function Consumer() {
      useTexture(URL, { cache: true })
      return null
    }
    function Probe() {
      useTextures()
      return null
    }

    const store = await act(async () => {
      const s = root.render(
        <React.Suspense fallback={null}>
          <Consumer />
          <Probe />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
      return s
    })
    expect(store.getState()._textureRefs.get(URL)).toBe(1)

    // Unmount the consumer — refcount drops, but the texture persists in the registry
    await act(async () => {
      root.render(
        <React.Suspense fallback={null}>
          <Probe />
        </React.Suspense>,
      )
    })

    expect(store.getState()._textureRefs.has(URL)).toBe(false)
    expect(store.getState().textures.has(URL)).toBe(true)

    vi.restoreAllMocks()
  })

  it('a refcount-only re-mount does not change the registry identity (no churn)', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)
    const URL = '/shared.png'

    function Consumer() {
      useTexture(URL, { cache: true })
      return null
    }

    // First consumer: texture genuinely added → registry identity changes (expected).
    const store = await act(async () => {
      const s = root.render(
        <React.Suspense fallback={null}>
          <Consumer />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
      return s
    })
    const mapAfterFirst = store.getState().textures
    expect(store.getState()._textureRefs.get(URL)).toBe(1)

    // Second consumer of the SAME url: only a refcount bump — the textures Map must be the same reference.
    await act(async () => {
      root.render(
        <React.Suspense fallback={null}>
          <Consumer />
          <Consumer />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(store.getState().textures).toBe(mapAfterFirst) // identity unchanged → registry subscribers not notified
    expect(store.getState()._textureRefs.get(URL)).toBe(2)

    vi.restoreAllMocks()
  })

  it('useTexture enrolls in the registry by default', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)

    function Consumer() {
      useTexture('/default-cached.png') // no options → cache defaults to true
      return null
    }

    const store = await act(async () => {
      const s = root.render(
        <React.Suspense fallback={null}>
          <Consumer />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
      return s
    })

    expect(store.getState().textures.get('/default-cached.png')).toBe(tex)
    expect(store.getState()._textureRefs.get('/default-cached.png')).toBe(1)

    vi.restoreAllMocks()
  })

  it('cache: false opts out of registry enrollment', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)

    function Consumer() {
      useTexture('/opt-out.png', { cache: false })
      return null
    }

    const store = await act(async () => {
      const s = root.render(
        <React.Suspense fallback={null}>
          <Consumer />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
      return s
    })

    expect(store.getState().textures.has('/opt-out.png')).toBe(false)
    expect(store.getState()._textureRefs.has('/opt-out.png')).toBe(false)

    vi.restoreAllMocks()
  })

  it('a mounted useTexture is non-reactive: registry changes do not re-render it', async () => {
    const original = new THREE.Texture()
    mockTextureLoad(original)
    const URL = '/non-reactive.png'

    let renders = 0
    let api!: UseTexturesReturn
    function Consumer() {
      useTexture(URL)
      renders++
      return null
    }
    function Probe() {
      api = useTextures()
      return null
    }

    await act(async () => {
      root.render(
        <React.Suspense fallback={null}>
          <Consumer />
          <Probe />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
    })
    const before = renders

    // Swap the consumer's OWN key, and an unrelated key — neither must re-render the consumer.
    await act(async () => {
      api.add(URL, new THREE.Texture())
      api.add('unrelated', new THREE.Texture())
    })

    expect(renders).toBe(before)

    vi.restoreAllMocks()
  })

  //* Render-loop regressions (#3849) ==============================
  // The array and record forms re-ran their registry effect on every render, and the setState
  // that effect performs re-renders every store subscriber, so the two fed each other until
  // React bailed out with "Maximum update depth exceeded". The single-URL form was unaffected.
  //
  // The loop only closes when the consuming component itself subscribes broadly to the store —
  // the very common `useThree()` with no selector. A sibling subscriber is not enough, since it
  // re-renders itself and not the useTexture caller, so the `useThree()` calls below are load
  // bearing: without them these tests pass even on the broken build.

  /** Mount `children` under Suspense and let the mocked loader settle. */
  async function mountAndSettle(children: React.ReactNode) {
    await act(async () => {
      root.render(<React.Suspense fallback={null}>{children}</React.Suspense>)
      await new Promise((r) => setTimeout(r, 20))
    })
  }

  it('array form settles instead of looping forever', async () => {
    mockTextureLoad(new THREE.Texture())

    let renders = 0
    function Consumer() {
      renders++
      useThree() // broad subscription — closes the feedback loop
      // Inline literal on purpose: a fresh reference every render is the common call shape,
      // and the issue notes that hoisting it to a module constant did not help either.
      useTexture(['/loop-a.png', '/loop-b.png'])
      return null
    }

    await mountAndSettle(<Consumer />)

    // A handful of renders is normal (suspense retry + registry commit). Hundreds means the loop.
    expect(renders).toBeLessThan(10)
  })

  it('record form settles instead of looping forever', async () => {
    mockTextureLoad(new THREE.Texture())

    let renders = 0
    function Consumer() {
      renders++
      useThree()
      useTexture({ map: '/loop-map.png', normalMap: '/loop-normal.png' })
      return null
    }

    await mountAndSettle(<Consumer />)

    expect(renders).toBeLessThan(10)
  })

  it('array form returns a reference-stable result across re-renders', async () => {
    // The underlying cause: useLoader built a new array every call, so the result could not be
    // used as an effect dependency by anyone — useTexture's registry effect was just the first
    // place it bit. Fixed in useLoader, so this holds for every consumer.
    mockTextureLoad(new THREE.Texture())

    const seen: unknown[] = []
    let forceRender!: () => void
    function Consumer() {
      const [, setTick] = React.useState(0)
      forceRender = () => setTick((t) => t + 1)
      seen.push(useTexture(['/stable-a.png', '/stable-b.png']))
      return null
    }

    await mountAndSettle(<Consumer />)
    const initial = seen.length
    expect(initial).toBeGreaterThan(0)

    await act(async () => forceRender())

    expect(seen.length).toBeGreaterThan(initial)
    expect(seen[seen.length - 1]).toBe(seen[initial - 1])
  })

  it('selector form returns scoped derived state', async () => {
    const a = new THREE.Texture()
    let seen: THREE.Texture | undefined
    function Probe() {
      seen = useTextures((registry) => registry.get('a'))
      return null
    }
    const store = await act(async () => root.render(<Probe />))

    expect(seen).toBeUndefined()

    await act(async () => {
      store.setState((s) => {
        const textures = new Map(s.textures)
        textures.set('a', a)
        return { textures }
      })
    })

    expect(seen).toBe(a)
  })
})
