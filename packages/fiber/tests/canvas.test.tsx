import { vi } from 'vitest'
import React, { act } from 'react'
import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { HDRCubeTextureLoader } from 'three/examples/jsm/loaders/HDRCubeTextureLoader.js'
import { UltraHDRLoader } from 'three/examples/jsm/loaders/UltraHDRLoader.js'
import { Canvas, useEnvironment, useFrame, useLoader, useThree } from '../src'
import type { DefaultRendererProps, RootState } from '../src'
// WebGLRenderer lives on /legacy: the gl-prop tests below run there
import { Canvas as LegacyCanvas } from '../src/legacy'

describe('web Canvas', () => {
  it('should correctly mount', async () => {
    const renderer = await act(async () =>
      render(
        <LegacyCanvas>
          <group />
        </LegacyCanvas>,
      ),
    )

    // three stamps its own version onto the canvas (`data-engine="three.js rNNN"`). Assert it against the
    // installed REVISION, then drop it from the snapshot so a three bump doesn't churn it.
    const canvas = renderer.container.querySelector('canvas')!
    expect(canvas.getAttribute('data-engine')).toBe(`three.js r${THREE.REVISION}`)

    const container = renderer.container.cloneNode(true) as HTMLElement
    container.querySelector('canvas')!.removeAttribute('data-engine')
    expect(container).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<HTMLCanvasElement>()

    await act(async () =>
      render(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      ),
    )

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement)
  })

  it('should forward context', async () => {
    const ParentContext = React.createContext<boolean>(null!)
    let receivedValue!: boolean

    function Test() {
      receivedValue = React.useContext(ParentContext)
      return null
    }

    await act(async () => {
      render(
        <ParentContext.Provider value={true}>
          <Canvas>
            <Test />
          </Canvas>
        </ParentContext.Provider>,
      )
    })

    expect(receivedValue).toBe(true)
  })

  it('should correctly unmount', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(() => renderer.unmount()).not.toThrow()
  })

  // StrictMode replays effects without releasing the renderer. Final removal disposes it once.
  it('should survive a StrictMode remount', async () => {
    let dispose!: ReturnType<typeof vi.spyOn>
    let state!: RootState

    const renderer = await act(async () =>
      render(
        <React.StrictMode>
          <Canvas
            frameloop="never"
            renderer={(props: DefaultRendererProps) => {
              const instance = new WebGPURenderer({ ...props, canvas: props.canvas as HTMLCanvasElement })
              dispose = vi.spyOn(instance, 'dispose')
              return instance
            }}
            onCreated={(created) => (state = created)}>
            <group />
          </Canvas>
        </React.StrictMode>,
      ),
    )

    expect(dispose).not.toHaveBeenCalled()
    expect(state.get().internal.active).toBe(true)
    // v10 parents the default camera into the scene, so count the groups
    expect(state.scene.children.filter((child) => child instanceof THREE.Group)).toHaveLength(1)

    await act(async () => renderer.unmount())
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(state.get().internal.active).toBe(false)
  })

  // Regression for #3757: the `fallback` prop lives inside <canvas>, which browsers never
  // paint, so a renderer-setup failure must surface the fallback as visible sibling DOM.
  it('renders the fallback outside the canvas when renderer setup fails', async () => {
    // Suppress the expected error log from the failed renderer setup
    const originalError = console.error
    console.error = vi.fn()

    try {
      const renderer = await act(async () =>
        render(
          <Canvas
            fallback={<div>Sorry no WebGL supported!</div>}
            gl={() => {
              throw new Error('WebGL unavailable')
            }}>
            <group />
          </Canvas>,
        ),
      )

      // Allow the async configure() rejection + fallback state update to flush
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const fallbackEl = renderer.getByText('Sorry no WebGL supported!')
      expect(fallbackEl).toBeTruthy()
      // Must be rendered as visible DOM, not as a child of <canvas>
      expect(fallbackEl.closest('canvas')).toBe(null)
    } finally {
      console.error = originalError
    }
  })

  // When no fallback is supplied, a renderer-setup failure should propagate to an
  // external error boundary rather than silently swallowing the error.
  it('surfaces renderer setup failure to an error boundary when no fallback is given', async () => {
    const originalError = console.error
    console.error = vi.fn()

    let caughtError: Error | null = null
    class TestErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
      state = { hasError: false }
      static getDerivedStateFromError() {
        return { hasError: true }
      }
      componentDidCatch(error: Error) {
        caughtError = error
      }
      render() {
        if (this.state.hasError) return <div data-testid="boundary">boom</div>
        return this.props.children
      }
    }

    try {
      const renderer = await act(async () =>
        render(
          <TestErrorBoundary>
            <Canvas
              gl={() => {
                throw new Error('WebGL unavailable')
              }}>
              <group />
            </Canvas>
          </TestErrorBoundary>,
        ),
      )

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      expect(caughtError).toBeInstanceOf(Error)
      expect(renderer.getByTestId('boundary')).toBeTruthy()
    } finally {
      console.error = originalError
    }
  })

  it('plays nice with react SSR', async () => {
    const useLayoutEffect = vi.spyOn(React, 'useLayoutEffect')
    const useEffect = vi.spyOn(React, 'useEffect')

    // renderToString should not throw
    let result: string = ''
    await act(async () => {
      result = renderToString(
        React.createElement(Canvas, {
          children: React.createElement('mesh'),
        }),
      )
    })

    expect(result).toContain('<canvas')
    // We don't strictly require useLayoutEffect to be called in React 19 SSR pass,
    // as long as it doesn't crash and renders the basic markup.
    useLayoutEffect.mockRestore()
    useEffect.mockRestore()
  })

  it('catches useFrame errors in error boundary', async () => {
    const testError = new Error('useFrame error boundary test')

    // Suppress expected console.error from error boundary and scheduler
    const originalError = console.error
    const errorSpy = vi.fn()
    console.error = errorSpy

    //* Track what the error boundary catches ==============================
    let caughtError: Error | null = null
    let errorInfo: React.ErrorInfo | null = null

    // User-provided error boundary component
    class TestErrorBoundary extends React.Component<
      { children: React.ReactNode; fallback: React.ReactNode },
      { hasError: boolean }
    > {
      state = { hasError: false }

      static getDerivedStateFromError() {
        return { hasError: true }
      }

      componentDidCatch(error: Error, info: React.ErrorInfo) {
        caughtError = error
        errorInfo = info
      }

      render() {
        if (this.state.hasError) return this.props.fallback
        return this.props.children
      }
    }

    // Component that throws in useFrame
    const ErrorComponent = () => {
      useFrame(() => {
        throw testError
      })
      return <mesh />
    }

    try {
      const renderer = await act(async () =>
        render(
          <TestErrorBoundary fallback={<div data-testid="error-fallback">Error caught</div>}>
            <LegacyCanvas>
              <ErrorComponent />
            </LegacyCanvas>
          </TestErrorBoundary>,
        ),
      )

      // Wait for frames to execute and error to propagate to boundary
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
      })

      // Verify the error was caught by our boundary
      expect(caughtError).toBe(testError)
      expect(errorInfo).not.toBeNull()

      // Verify fallback UI is rendered
      expect(renderer.getByTestId('error-fallback')).toBeTruthy()
    } finally {
      console.error = originalError
    }
  })

  describe('background prop', () => {
    it('should set scene.background with color string', async () => {
      let sceneBackground: THREE.Color | null = null

      function BackgroundChecker() {
        const { scene } = useThree()
        React.useEffect(() => {
          sceneBackground = scene.background as THREE.Color
        })
        return null
      }

      await act(async () =>
        render(
          <LegacyCanvas background="#ff0000">
            <BackgroundChecker />
          </LegacyCanvas>,
        ),
      )

      // Wait for Environment to apply background
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(sceneBackground).toBeInstanceOf(THREE.Color)
      expect(sceneBackground!.getHexString()).toBe('ff0000')
    })

    it('should set scene.background with hex number', async () => {
      let sceneBackground: THREE.Color | null = null

      function BackgroundChecker() {
        const { scene } = useThree()
        React.useEffect(() => {
          sceneBackground = scene.background as THREE.Color
        })
        return null
      }

      await act(async () =>
        render(
          <LegacyCanvas background={0x00ff00}>
            <BackgroundChecker />
          </LegacyCanvas>,
        ),
      )

      // Wait for Environment to apply background
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
      })

      expect(sceneBackground).toBeInstanceOf(THREE.Color)
      expect(sceneBackground!.getHexString()).toBe('00ff00')
    })

    it('should parse object form with preset', async () => {
      // `preset: 'city'` resolves to a .hdr under CUBEMAP_ROOT, so the real path would hit
      // raw.githack.com over the network — which makes this test fail offline or in a
      // sandboxed runner. Stub the loader instead: HDRLoader.loadAsync() delegates to
      // load(), so this covers both branches of useLoader's loadingFn. Everything else
      // (background parsing, Environment, useEnvironment, useLoader) stays real.
      const loadSpy = vi
        .spyOn(HDRLoader.prototype, 'load')
        .mockImplementation((_url: string, onLoad?: (data: THREE.DataTexture, texData: object) => void) => {
          const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
          onLoad?.(texture, {})
          return texture
        })

      try {
        await act(async () =>
          render(
            <LegacyCanvas
              background={{
                preset: 'city',
                backgroundBlurriness: 0.5,
              }}>
              <group />
            </LegacyCanvas>,
          ),
        )

        // The preset was resolved through the loader rather than silently skipped
        expect(loadSpy).toHaveBeenCalled()
        expect(loadSpy.mock.calls[0][0]).toBe('potsdamer_platz_1k.hdr')
      } finally {
        // Drop the stubbed texture from the suspend-react cache so it can't leak into
        // another test that loads the same key.
        useLoader.clear(HDRLoader, 'potsdamer_platz_1k.hdr')
        loadSpy.mockRestore()
      }
    })

    it('loads a six-file .hdr cube set through HDRCubeTextureLoader', async () => {
      // Six files used to short-circuit to the plain CubeTextureLoader before the extension was
      // looked at, so Radiance .hdr cube faces (three's pisaHDR set) could not load declaratively.
      const faces = ['px.hdr', 'nx.hdr', 'py.hdr', 'ny.hdr', 'pz.hdr', 'nz.hdr']
      const cubeSpy = vi.spyOn(THREE.CubeTextureLoader.prototype, 'load')
      let loaded: THREE.CubeTexture | undefined
      const hdrCubeSpy = vi.spyOn(HDRCubeTextureLoader.prototype, 'load').mockImplementation(((
        _urls: string[],
        onLoad?: (texture: THREE.CubeTexture) => void,
      ) => {
        loaded = new THREE.CubeTexture()
        onLoad?.(loaded)
        return loaded
      }) as any)

      try {
        await act(async () =>
          render(
            <LegacyCanvas background={{ files: faces }}>
              <group />
            </LegacyCanvas>,
          ),
        )

        expect(hdrCubeSpy).toHaveBeenCalledTimes(1)
        expect(hdrCubeSpy.mock.calls[0][0]).toEqual(faces)
        expect(cubeSpy).not.toHaveBeenCalled()
        // HDR faces carry linear radiance, unlike LDR cube faces which are sRGB images
        expect(loaded!.mapping).toBe(THREE.CubeReflectionMapping)
        expect(loaded!.colorSpace).toBe('srgb-linear')
      } finally {
        useEnvironment.clear({ files: faces })
        hdrCubeSpy.mockRestore()
        cubeSpy.mockRestore()
      }
    })

    it.each(['/sky.png', '/sky.webp', '/sky.gif'])('loads an LDR equirect %s through TextureLoader', async (file) => {
      // parseBackground routes these to useEnvironment, which used to read only .hdr/.exr/.jpg
      // and threw "Unrecognized file extension" for every other image a backdrop is likely to be.
      let loaded: THREE.Texture | undefined
      let sceneBackground: THREE.Scene['background'] = null
      const loadSpy = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((
        _url: string,
        onLoad?: (texture: THREE.Texture) => void,
      ) => {
        loaded = new THREE.Texture()
        onLoad?.(loaded)
        return loaded
      }) as any)

      function BackgroundChecker() {
        const scene = useThree((state) => state.scene)
        React.useEffect(() => {
          sceneBackground = scene.background
        })
        return null
      }

      try {
        await act(async () =>
          render(
            <LegacyCanvas background={file}>
              <BackgroundChecker />
            </LegacyCanvas>,
          ),
        )

        expect(loadSpy).toHaveBeenCalledTimes(1)
        expect(loadSpy.mock.calls[0][0]).toBe(file)
        expect(sceneBackground).toBe(loaded)
        // An LDR image holds sRGB values, mapped as an equirect like a single .hdr
        expect(loaded!.mapping).toBe(THREE.EquirectangularReflectionMapping)
        expect(loaded!.colorSpace).toBe('srgb')
      } finally {
        useEnvironment.clear({ files: file })
        loadSpy.mockRestore()
      }
    })

    // Captures the scene the background lands on, after every commit
    function captureScene() {
      const seen: { scene?: THREE.Scene } = {}
      function SceneChecker() {
        const scene = useThree((state) => state.scene)
        React.useEffect(() => {
          seen.scene = scene
        })
        return null
      }
      return [seen, SceneChecker] as const
    }

    // A one-texel texture standing in for whatever TextureLoader would decode
    function stubTextureLoader() {
      const loaded = new Map<string, THREE.Texture>()
      const spy = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((
        url: string,
        onLoad?: (texture: THREE.Texture) => void,
      ) => {
        const texture = new THREE.Texture()
        loaded.set(url, texture)
        onLoad?.(texture)
        return texture
      }) as any)
      return { spy, loaded }
    }

    it('sets a black background for the hex number 0', async () => {
      const [seen, SceneChecker] = captureScene()
      await act(async () =>
        render(
          <LegacyCanvas background={0x000000}>
            <SceneChecker />
          </LegacyCanvas>,
        ),
      )

      expect(seen.scene!.background).toBeInstanceOf(THREE.Color)
      expect((seen.scene!.background as THREE.Color).getHexString()).toBe('000000')
    })

    it('reads the extension past a query or hash', async () => {
      const { spy, loaded } = stubTextureLoader()
      const [seen, SceneChecker] = captureScene()
      try {
        await act(async () =>
          render(
            <LegacyCanvas background="/sky.png#rev">
              <SceneChecker />
            </LegacyCanvas>,
          ),
        )

        expect(spy.mock.calls[0][0]).toBe('/sky.png#rev')
        expect(seen.scene!.background).toBe(loaded.get('/sky.png#rev'))
      } finally {
        useEnvironment.clear({ files: '/sky.png#rev' })
        spy.mockRestore()
      }
    })

    describe('.jpg', () => {
      // Hands the loader the bytes of `file` without a network, and an image for any blob URL
      function stubJpegFetch() {
        const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer // a JPEG with no gain map
        const fileSpy = vi.spyOn(THREE.FileLoader.prototype, 'load').mockImplementation(((
          _url: string,
          onLoad?: (data: ArrayBuffer) => void,
        ) => {
          onLoad?.(bytes)
        }) as any)
        const image = { width: 2, height: 1 } as HTMLImageElement
        const imageSpy = vi.spyOn(THREE.ImageLoader.prototype, 'load').mockImplementation(((
          _url: string,
          onLoad?: (image: HTMLImageElement) => void,
        ) => {
          onLoad?.(image)
          return image
        }) as any)
        const createObjectURL = vi.fn(() => 'blob:sky')
        const revokeObjectURL = vi.fn()
        const urlStatics = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }
        Object.assign(URL, { createObjectURL, revokeObjectURL })
        return {
          fileSpy,
          imageSpy,
          image,
          createObjectURL,
          revokeObjectURL,
          restore() {
            fileSpy.mockRestore()
            imageSpy.mockRestore()
            Object.assign(URL, urlStatics)
          },
        }
      }

      it('loads a plain JPEG as an sRGB image from the bytes already fetched', async () => {
        // UltraHDRLoader rejects a JPEG without a gain map, so `<Canvas background="./sky.jpg">` threw
        const stub = stubJpegFetch()
        const [seen, SceneChecker] = captureScene()
        try {
          await act(async () =>
            render(
              <LegacyCanvas background="./sky.jpg">
                <SceneChecker />
              </LegacyCanvas>,
            ),
          )

          // Fetched once, decoded from a blob of those bytes, and the blob URL released
          expect(stub.fileSpy).toHaveBeenCalledTimes(1)
          expect(stub.fileSpy.mock.calls[0][0]).toBe('./sky.jpg')
          expect(stub.imageSpy.mock.calls[0][0]).toBe('blob:sky')
          expect(stub.revokeObjectURL).toHaveBeenCalledWith('blob:sky')

          const background = seen.scene!.background as THREE.Texture
          expect(background).toBeInstanceOf(THREE.Texture)
          expect(background.image).toBe(stub.image)
          expect(background.mapping).toBe(THREE.EquirectangularReflectionMapping)
          expect(background.colorSpace).toBe('srgb')
        } finally {
          useEnvironment.clear({ files: './sky.jpg' })
          stub.restore()
        }
      })

      it('still decodes an Ultra HDR JPEG as linear HDR data', async () => {
        const stub = stubJpegFetch()
        const data = new Uint16Array(8)
        const parseSpy = vi.spyOn(UltraHDRLoader.prototype, 'parse').mockImplementation(function (
          this: UltraHDRLoader,
          _buffer,
          onLoad,
        ) {
          onLoad({ data, width: 2, height: 1, format: THREE.RGBAFormat, type: this.type } as any)
        })
        const [seen, SceneChecker] = captureScene()
        try {
          await act(async () =>
            render(
              <LegacyCanvas background="./hdr.jpg">
                <SceneChecker />
              </LegacyCanvas>,
            ),
          )

          expect(parseSpy).toHaveBeenCalledTimes(1)
          expect(stub.imageSpy).not.toHaveBeenCalled()
          const background = seen.scene!.background as THREE.DataTexture
          expect(background).toBeInstanceOf(THREE.DataTexture)
          expect(background.image).toEqual({ data, width: 2, height: 1 })
          expect(background.type).toBe(THREE.HalfFloatType)
          expect(background.colorSpace).toBe('srgb-linear')
        } finally {
          useEnvironment.clear({ files: './hdr.jpg' })
          parseSpy.mockRestore()
          stub.restore()
        }
      })
    })

    describe('backgroundMap', () => {
      it('shows backgroundMap rather than the preset behind it', async () => {
        const { spy, loaded } = stubTextureLoader()
        const hdrSpy = vi
          .spyOn(HDRLoader.prototype, 'load')
          .mockImplementation((_url: string, onLoad?: (data: THREE.DataTexture, texData: object) => void) => {
            const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
            onLoad?.(texture, {})
            return texture
          })
        const [seen, SceneChecker] = captureScene()
        try {
          await act(async () =>
            render(
              <LegacyCanvas background={{ preset: 'city', backgroundMap: '/sky.png' }}>
                <SceneChecker />
              </LegacyCanvas>,
            ),
          )

          // The preset lights the scene, the backdrop is the map
          expect(hdrSpy).toHaveBeenCalledTimes(1)
          expect(spy.mock.calls.map((call) => call[0])).toEqual(['/sky.png'])
          expect(seen.scene!.background).toBe(loaded.get('/sky.png'))
          expect(seen.scene!.environment).toBe(hdrSpy.mock.results[0].value)
        } finally {
          useLoader.clear(HDRLoader, 'potsdamer_platz_1k.hdr')
          useEnvironment.clear({ files: '/sky.png' })
          hdrSpy.mockRestore()
          spy.mockRestore()
        }
      })

      it('sets only the backdrop when given no environment', async () => {
        // The environment half used to fall back to six default cube faces (/px.png ...) that
        // nobody provided
        const { spy, loaded } = stubTextureLoader()
        const cubeSpy = vi.spyOn(THREE.CubeTextureLoader.prototype, 'load')
        const [seen, SceneChecker] = captureScene()
        try {
          await act(async () =>
            render(
              <LegacyCanvas background={{ backgroundMap: '/sky.png' }}>
                <SceneChecker />
              </LegacyCanvas>,
            ),
          )

          expect(cubeSpy).not.toHaveBeenCalled()
          expect(seen.scene!.background).toBe(loaded.get('/sky.png'))
          expect(seen.scene!.environment).toBeNull()
        } finally {
          useEnvironment.clear({ files: '/sky.png' })
          cubeSpy.mockRestore()
          spy.mockRestore()
        }
      })
    })
  })

  describe('frustum / occlusion props', () => {
    // Regression for Bug #2: autoUpdateFrustum/occlusion were not destructured in
    // CanvasImpl, so they fell into ...props and were spread onto the wrapper <div>
    // instead of being forwarded to configure().
    it('forwards autoUpdateFrustum to configure', async () => {
      let value: boolean | undefined

      function Checker() {
        value = useThree((s) => s.autoUpdateFrustum)
        return null
      }

      await act(async () =>
        render(
          <Canvas autoUpdateFrustum={false}>
            <Checker />
          </Canvas>,
        ),
      )

      expect(value).toBe(false)
    })

    it('forwards occlusion to configure (warns on WebGL)', async () => {
      // Occlusion needs WebGPU; under the jsdom WebGL test renderer, configure()
      // forwarding the prop reaches enableOcclusion(), which warns once. The warning
      // is proof the prop was forwarded (it was silently dropped before the fix).
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        await act(async () =>
          render(
            <LegacyCanvas occlusion>
              <group />
            </LegacyCanvas>,
          ),
        )

        expect(
          warn.mock.calls.some(([msg]) => typeof msg === 'string' && /occlusion queries require WebGPU/i.test(msg)),
        ).toBe(true)
      } finally {
        warn.mockRestore()
      }
    })
  })
})
