import * as React from 'react'
import * as THREE from 'three'
import * as Stdlib from 'three-stdlib'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { asyncUtils } from '../../../shared/asyncUtils'

import { createRoot, useLoader, act } from '../../src/native'

const resolvers = []

const { waitFor } = asyncUtils(act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('useLoader', () => {
  let canvas: HTMLCanvasElement = null!

  beforeEach(() => {
    canvas = createCanvas({
      beforeReturn: (canvas) => {
        //@ts-ignore
        canvas.getContext = (type: string) => {
          if (type === 'webgl' || type === 'webgl2') {
            return createWebGLContext(canvas)
          }
        }
      },
    })

    // Emulate GLTFLoader
    // @ts-ignore
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(() => ({
      load: jest.fn().mockImplementation((input, onLoad) => {
        onLoad(true)
      }),
      parse: jest.fn().mockImplementation((data, _, onLoad) => {
        onLoad(true)
      }),
    }))
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
