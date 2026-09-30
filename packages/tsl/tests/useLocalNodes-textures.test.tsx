/**
 * @fileoverview Textures loaded by `useTexture` are visible to a later creator in the same render
 * (#3895), on a real root.
 *
 * `useTexture` registers in a layout effect, so without staging a creator after it in the same
 * render found `textures.get(url)` empty, built a graph without the texture, and only rebuilt once
 * the registration landed.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three/webgpu'
import { texture } from 'three/tsl'

import { useTexture } from '@react-three/fiber'
import { useLocalNodes } from '../src'
import { mountPrimary, setupRealRoots } from './roots'

setupRealRoots('local-nodes-textures')

function mockTextureLoad(tex: THREE.Texture) {
  return vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((
    _url: string,
    onLoad?: (t: THREE.Texture) => void,
  ) => {
    onLoad?.(tex)
    return tex
  }) as never)
}

afterEach(() => vi.restoreAllMocks())

/** Mount under Suspense and let the mocked loads resolve. */
async function mountSuspended(children: React.ReactNode) {
  const mounted = await mountPrimary(<React.Suspense fallback={null}>{children}</React.Suspense>)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
  return mounted
}

describe('useLocalNodes + useTexture in the same render', () => {
  it('the first creator run sees a freshly loaded texture, and registration causes no second run', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)
    const URL = '/day.jpg'
    const seen: unknown[] = []

    function Globe() {
      useTexture(URL)
      useLocalNodes(({ textures }) => {
        const day = textures.get(URL)
        seen.push(day)
        return { dayNode: day ? texture(day) : null }
      }, [])
      return null
    }

    const { store } = await mountSuspended(<Globe />)

    expect(seen[0]).toBe(tex)
    // Registration commits the same texture the creator saw: nothing it read changed
    expect(seen).toHaveLength(1)
    expect(store.getState().textures.get(URL)).toBe(tex)
  })

  it('record inputs are all visible to the creator', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)
    const TEXTURES = { day: '/earth-day.jpg', night: '/earth-night.jpg' }
    let seen: { day: unknown; night: unknown } | null = null

    function Globe() {
      useTexture(TEXTURES)
      useLocalNodes(({ textures }) => {
        seen ??= { day: textures.get(TEXTURES.day), night: textures.get(TEXTURES.night) }
        return {}
      }, [])
      return null
    }

    await mountSuspended(<Globe />)
    expect(seen).toEqual({ day: tex, night: tex })
  })

  it('a texture loaded in another component later rebuilds a creator that read it as missing', async () => {
    const tex = new THREE.Texture()
    mockTextureLoad(tex)
    const URL = '/late.jpg'
    const seen: unknown[] = []

    function Reader() {
      useLocalNodes(({ textures }) => {
        seen.push(textures.get(URL))
        return {}
      }, [])
      return null
    }
    function Loader() {
      useTexture(URL)
      return null
    }

    const { root } = await mountSuspended(<Reader />)
    expect(seen).toEqual([undefined])

    await act(async () => {
      root.render(
        <React.Suspense fallback={null}>
          <Reader />
          <Loader />
        </React.Suspense>,
      )
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(seen.at(-1)).toBe(tex)
  })
})
