import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'

import { createRoot, useLoader, ObjectMap, extend } from '../src'

extend(THREE as any)

describe('useLoader', () => {
  let root: ReturnType<typeof createRoot> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new THREE.Mesh()
    MockMesh.name = 'Scene'

    interface GLTF {
      scene: THREE.Object3D
    }
    class GLTFLoader extends THREE.Loader<GLTF, string> {
      load(url: string, onLoad: (gltf: GLTF) => void): void {
        onLoad({ scene: MockMesh })
      }
    }

    let gltf!: GLTF & ObjectMap
    const Component = () => {
      gltf = useLoader(GLTFLoader, '/suzanne.glb')
      return <primitive object={gltf.scene} />
    }

    const store = await act(async () => root.render(<Component />))
    const { scene } = store.getState()

    expect(scene.children[0]).toBe(MockMesh)
    expect(gltf.scene).toBe(MockMesh)
    expect(gltf.nodes.Scene).toBe(MockMesh)
  })

  it('can handle useLoader hook with an array of strings', async () => {
    // Use unique URLs to avoid any cache collision with other tests
    const URL_MESH = '/array-test-mesh.glb'
    const URL_GROUP = '/array-test-group.glb'

    const MockMesh = new THREE.Mesh()
    const MockGroup = new THREE.Group()
    const mat1 = new THREE.MeshBasicMaterial()
    mat1.name = 'Mat 1'
    const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat1)
    mesh1.name = 'Mesh 1'
    const mat2 = new THREE.MeshBasicMaterial()
    mat2.name = 'Mat 2'
    const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat2)
    mesh2.name = 'Mesh 2'
    MockGroup.add(mesh1, mesh2)

    // Use URL-based mock instead of mockImplementationOnce since
    // individual suspend calls may re-render and call load multiple times
    class ArrayTestLoader extends THREE.Loader {
      load = jest.fn((url: string, onLoad: (result: any) => void) => {
        if (url === URL_MESH) onLoad(MockMesh)
        else if (url === URL_GROUP) onLoad(MockGroup)
      })
    }

    const extensions = jest.fn()

    const Component = () => {
      const [mockMesh, mockScene] = useLoader(ArrayTestLoader, [URL_MESH, URL_GROUP], extensions)

      return (
        <>
          <primitive object={mockMesh as THREE.Mesh} />
          <primitive object={mockScene as THREE.Scene} />
        </>
      )
    }

    const store = await act(async () => root.render(<Component />))
    const { scene } = store.getState()

    expect(scene.children[0]).toBe(MockMesh)
    expect(scene.children[1]).toBe(MockGroup)
    // Extensions called once per URL (may be called more due to re-renders, but at least 2)
    expect(extensions.mock.calls.length).toBeGreaterThanOrEqual(2)

    // Clean up cache
    useLoader.clear(ArrayTestLoader, [URL_MESH, URL_GROUP])
  })

  it('can handle useLoader with an existing loader instance', async () => {
    class Loader extends THREE.Loader<null, string> {
      load(_url: string, onLoad: (result: null) => void): void {
        onLoad(null)
      }
    }

    const loader = new Loader()
    let proto!: Loader

    function Test(): null {
      return useLoader(loader, '', (loader) => (proto = loader))
    }
    await act(async () => root.render(<Test />))

    expect(proto).toBe(loader)
  })

  it('can handle useLoader with a loader extension', async () => {
    class Loader extends THREE.Loader<null, string> {
      load(_url: string, onLoad: (result: null) => void): void {
        onLoad(null)
      }
    }

    let proto!: Loader

    function Test(): null {
      return useLoader(Loader, '', (loader) => (proto = loader))
    }
    await act(async () => root.render(<Test />))

    expect(proto).toBeInstanceOf(Loader)
  })

  it('useLoader.preload with array caches each URL individually', async () => {
    const loadCalls: string[] = []

    class TestLoader extends THREE.Loader<string, string> {
      load(url: string, onLoad: (result: string) => void): void {
        loadCalls.push(url)
        onLoad(`loaded:${url}`)
      }
    }

    const URL_A = '/model-a.glb'
    const URL_B = '/model-b.glb'

    // Preload with an array - this should cache each URL individually
    useLoader.preload(TestLoader, [URL_A, URL_B])

    // Wait for preload promises to resolve
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Clear load tracking to isolate the useLoader calls
    const preloadCallCount = loadCalls.length
    expect(preloadCallCount).toBe(2) // Both URLs should have been loaded

    // Now use useLoader with individual URLs - should hit cache, not reload
    let resultA: string | undefined
    let resultB: string | undefined

    const ComponentA = () => {
      resultA = useLoader(TestLoader, URL_A)
      return null
    }

    const ComponentB = () => {
      resultB = useLoader(TestLoader, URL_B)
      return null
    }

    await act(async () => root.render(<ComponentA />))
    await act(async () => root.render(<ComponentB />))

    // The loader should NOT have been called again - cache should have been hit
    expect(loadCalls.length).toBe(2) // Still just the 2 preload calls
    expect(resultA).toBe(`loaded:${URL_A}`)
    expect(resultB).toBe(`loaded:${URL_B}`)

    // Clean up cache for other tests
    useLoader.clear(TestLoader, [URL_A, URL_B])
  })

  it('can abort loader with loadAsync and clears suspend', async () => {
    const URL_SLOW = '/slow-load.glb'
    let abortCalled = false
    let loadCompleted = false
    let loadAsyncCalled = false

    class AbortableLoader extends THREE.Loader<string, string> {
      private abortController: (() => void) | null = null

      // Implement loadAsync for abort support
      loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<string> {
        loadAsyncCalled = true
        return new Promise<string>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            loadCompleted = true
            this.abortController = null
            resolve(`loaded:${url}`)
          }, 5000) // 5 second load time

          // Store abort handler
          this.abortController = () => {
            abortCalled = true
            clearTimeout(timeoutId)
            reject(new Error('Load aborted'))
          }
        })
      }

      // Standard load method (won't be used since loadAsync exists)
      load(url: string, onLoad: (result: string) => void): void {
        onLoad(`loaded:${url}`)
      }

      // Override abort to call our controller
      abort(): this {
        if (this.abortController) {
          this.abortController()
          this.abortController = null
        }
        return super.abort()
      }
    }

    const Component = () => {
      const result = useLoader(AbortableLoader, URL_SLOW)
      return <mesh name={result} />
    }

    // Start rendering (will suspend and trigger loadAsync)
    let renderError: any = null
    act(() => {
      try {
        root.render(
          <React.Suspense fallback={<mesh name="loading" />}>
            <Component />
          </React.Suspense>,
        )
      } catch (err) {
        renderError = err
      }
    })

    // Wait for loadAsync to be called by suspend-react
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(loadAsyncCalled).toBe(true)
    expect(loadCompleted).toBe(false)

    // Get the loader instance and abort after 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const loaderInstance = useLoader.loader(AbortableLoader)
    loaderInstance.abort()

    // Verify abort was called
    expect(abortCalled).toBe(true)
    expect(loadCompleted).toBe(false)

    // Wait a bit for the abort to propagate
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Clear the cache to ensure suspend is cleared
    useLoader.clear(AbortableLoader, URL_SLOW)

    // Reset flags for next test
    loadAsyncCalled = false
    abortCalled = false

    // Verify the suspended load is no longer cached
    // If we try to use it again, it should start a fresh load
    const Component2 = () => {
      const result = useLoader(AbortableLoader, URL_SLOW)
      return <mesh name={result} />
    }

    // This should trigger a new load since cache was cleared
    act(() => {
      try {
        root.render(
          <React.Suspense fallback={<mesh name="loading2" />}>
            <Component2 />
          </React.Suspense>,
        )
      } catch (err) {
        // Expected to suspend again
      }
    })

    // Wait to let the new load attempt start
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(loadAsyncCalled).toBe(true) // New load started
    expect(abortCalled).toBe(false) // No abort on this new attempt yet

    // Clean up
    const newLoader = useLoader.loader(AbortableLoader)
    newLoader.abort()
    useLoader.clear(AbortableLoader, URL_SLOW)
  })
})
