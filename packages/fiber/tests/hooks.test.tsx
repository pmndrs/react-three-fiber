import * as React from 'react'
import * as THREE from 'three'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'

import {
  createRoot,
  advance,
  useLoader,
  act,
  useThree,
  useGraph,
  useFrame,
  ObjectMap,
  useInstanceHandle,
  Instance,
  extend,
} from '../src'
import { promiseCaches } from '../src/core/cache'

interface GLTF {
  scene: THREE.Object3D
}

extend(THREE as any)
const root = createRoot(document.createElement('canvas'))

describe('hooks', () => {
  let canvas: HTMLCanvasElement = null!

  beforeEach(() => {
    canvas = createCanvas()
    // Clear all caches before each test
    promiseCaches.forEach(async (cache) => await cache.clear())
  })

  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: THREE.Camera
      scene: THREE.Scene
      raycaster: THREE.Raycaster
      size: { width: number; height: number }
    }

    const Component = () => {
      /**
       * this causes an act problem, it'd be
       * good to figure out the best way to
       * resolve this at some point
       */
      const res = useThree((state) => ({
        camera: state.camera,
        scene: state.scene,
        size: state.size,
        raycaster: state.raycaster,
      }))

      result = res

      return <group />
    }

    await act(async () => root.render(<Component />))

    expect(result.camera instanceof THREE.Camera).toBeTruthy()
    expect(result.scene instanceof THREE.Scene).toBeTruthy()
    expect(result.raycaster instanceof THREE.Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0, top: 0, left: 0 })
  })

  it('can handle useFrame hook', async () => {
    const frameCalls: number[] = []

    const Component = () => {
      const ref = React.useRef<THREE.Mesh>(null!)
      useFrame((_, delta) => {
        frameCalls.push(delta)
        ref.current.position.x = 1
      })

      return (
        <mesh ref={ref}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const store = await act(async () => root.configure({ frameloop: 'never' }).render(<Component />))
    const { scene } = store.getState()

    advance(Date.now())
    expect(scene.children[0].position.x).toEqual(1)
    expect(frameCalls.length).toBeGreaterThan(0)
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new THREE.Mesh()
    MockMesh.name = 'Scene'

    class MockGLTFLoader extends THREE.Loader {
      load(url: string, onLoad: (gltf: GLTF) => void): void {
        onLoad({ scene: MockMesh })
      }
    }

    let gltf!: GLTF & ObjectMap
    const Component = () => {
      gltf = useLoader(MockGLTFLoader, gltfUri)
      return <primitive object={gltf.scene} />
    }

    const store = await act(async () => root.render(<Component />))
    const { scene } = store.getState()

    expect(scene.children[0]).toBe(MockMesh)
    expect(gltf.scene).toBe(MockMesh)
    expect(gltf.nodes.Scene).toBe(MockMesh)
  })

  it('can handle useLoader with an existing loader instance', async () => {
    const MockMesh = new THREE.Mesh()
    MockMesh.name = 'Scene'

    class MockGLTFLoader extends THREE.Loader {
      load(url: string, onLoad: (gltf: GLTF) => void): void {
        onLoad({ scene: MockMesh })
      }
    }

    const loader = new MockGLTFLoader()

    let gltf!: GLTF & ObjectMap
    const Component = () => {
      gltf = useLoader(loader, gltfUri)
      return <primitive object={gltf.scene} />
    }

    const store = await act(async () => root.render(<Component />))
    const { scene } = store.getState()

    expect(scene.children[0]).toBe(MockMesh)
    expect(gltf.scene).toBe(MockMesh)
    expect(gltf.nodes.Scene).toBe(MockMesh)
  })

  it('can handle useLoader hook with an array of strings', async () => {
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

    // Note: This will fail if loader gets two of the same urls since it will only call once instead of twice due to caching.
    class TestLoader extends THREE.Loader {
      load = jest
        .fn()
        .mockImplementationOnce((_url, onLoad) => {
          onLoad(MockMesh)
        })
        .mockImplementationOnce((_url, onLoad) => {
          onLoad(MockGroup)
        })
    }

    const Component = () => {
      const [mockMesh, mockScene] = useLoader(TestLoader, [gltfUri, altGltfUri])

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
  })

  it('can handle useGraph hook', async () => {
    const group = new THREE.Group()
    const mat1 = new THREE.MeshBasicMaterial()
    mat1.name = 'Mat 1'
    const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat1)
    mesh1.name = 'Mesh 1'
    const mat2 = new THREE.MeshBasicMaterial()
    mat2.name = 'Mat 2'
    const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat2)
    mesh2.name = 'Mesh 2'
    const subGroup = new THREE.Group()
    const mat3 = new THREE.MeshBasicMaterial()
    mat3.name = 'Mat 3'
    const mesh3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat3)
    mesh3.name = 'Mesh 3'
    const mat4 = new THREE.MeshBasicMaterial()
    mat4.name = 'Mat 4'
    const mesh4 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat4)
    mesh4.name = 'Mesh 4'

    subGroup.add(mesh3, mesh4)
    group.add(mesh1, mesh2, subGroup)

    let result = {} as ObjectMap

    const Component = () => {
      const data = useGraph(group)
      result = data
      return <mesh />
    }

    await act(async () => root.render(<Component />))

    expect(result).toEqual({
      nodes: {
        [mesh1.name]: mesh1,
        [mesh2.name]: mesh2,
        [mesh3.name]: mesh3,
        [mesh4.name]: mesh4,
      },
      materials: {
        [mat1.name]: mat1,
        [mat2.name]: mat2,
        [mat3.name]: mat3,
        [mat4.name]: mat4,
      },
    })
  })

  it('can handle useInstanceHandle hook', async () => {
    const ref = React.createRef<THREE.Group>()
    let instance!: React.RefObject<Instance>

    const Component = () => {
      instance = useInstanceHandle(ref)
      return <group ref={ref} />
    }
    await act(async () => root.render(<Component />))

    expect(instance.current).toBe((ref.current as unknown as Instance<THREE.Group>['object']).__r3f)
  })
})
