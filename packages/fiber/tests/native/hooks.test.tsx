import * as React from 'react'
import * as THREE from 'three'
import * as Stdlib from 'three-stdlib'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'

import { asyncUtils } from '../../../shared/asyncUtils'

import { createRoot, useLoader, act } from '../../src/native'
import { polyfills } from '../../src/native/polyfills'

polyfills()

const resolvers: (() => void)[] = []

const { waitFor } = asyncUtils(act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('useLoader', () => {
  let canvas: HTMLCanvasElement = null!

  beforeEach(() => {
    canvas = createCanvas()

    // Emulate GLTFLoader
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(
      () =>
        ({
          load: jest.fn().mockImplementation((_input, onLoad) => {
            onLoad(true)
          }),
          parse: jest.fn().mockImplementation((_data, _, onLoad) => {
            onLoad(true)
          }),
        } as unknown as Stdlib.GLTFLoader),
    )
  })

  it('produces data textures for TextureLoader', async () => {
    let texture: any

    const Component = () => {
      texture = useLoader(THREE.TextureLoader, '/texture.jpg')
      return null
    }

    await act(async () => {
      createRoot(canvas).render(
        <React.Suspense fallback={null}>
          <Component />
        </React.Suspense>,
      )
    })

    await waitFor(() => expect(texture).toBeDefined())

    expect(texture.isDataTexture).toBe(true)
  })

  it('can load external assets using the loader signature', async () => {
    let gltf: any

    const Component = () => {
      gltf = useLoader(Stdlib.GLTFLoader, 'http://test.local/test.glb')
      return null
    }

    await act(async () => {
      createRoot(canvas).render(
        <React.Suspense fallback={null}>
          <Component />
        </React.Suspense>,
      )
    })

    await waitFor(() => expect(gltf).toBeDefined())

    expect(gltf).toBe(true)
  })

  it('can parse assets using the file system', async () => {
    let gltf: any

    const Component = () => {
      gltf = useLoader(Stdlib.GLTFLoader, 1 as any)
      return null
    }

    await act(async () => {
      createRoot(canvas).render(
        <React.Suspense fallback={null}>
          <Component />
        </React.Suspense>,
      )
    })

    await waitFor(() => expect(gltf).toBeDefined())

    expect(gltf).toBe(true)
  })
})
