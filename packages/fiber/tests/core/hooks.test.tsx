import * as React from 'react'
import * as THREE from 'three'
import * as Stdlib from 'three-stdlib'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'

import { asyncUtils } from '../../../shared/asyncUtils'

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
  LocalState,
} from '../../src'
import { Instance } from 'packages/fiber/src/core/renderer'

const resolvers: (() => void)[] = []

const { waitFor } = asyncUtils(act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('hooks', () => {
  let canvas: HTMLCanvasElement = null!

  beforeEach(() => {
    canvas = createCanvas()
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

    await act(async () => {
      createRoot(canvas).render(<Component />)
    })

    expect(result.camera instanceof THREE.Camera).toBeTruthy()
    expect(result.scene instanceof THREE.Scene).toBeTruthy()
    expect(result.raycaster instanceof THREE.Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0, top: 0, left: 0, updateStyle: false })
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

    let scene: THREE.Scene = null!
    await act(
      async () =>
        (scene = createRoot(canvas)
          .configure({ frameloop: 'never' })
          .render(<Component />)
          .getState().scene),
    )
    advance(Date.now())
    expect(scene.children[0].position.x).toEqual(1)
    expect(frameCalls.length).toBeGreaterThan(0)
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new THREE.Mesh()
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(
      () =>
        ({
          load: jest.fn().mockImplementation((_url, onLoad) => {
            onLoad(MockMesh)
          }),
        } as unknown as Stdlib.GLTFLoader),
    )

    const Component = () => {
      const model = useLoader(Stdlib.GLTFLoader, '/suzanne.glb')
      return <primitive object={model} />
    }

    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(
          <React.Suspense fallback={null}>
            <Component />
          </React.Suspense>,
        )
        .getState().scene
    })

    await waitFor(() => expect(scene.children[0]).toBeDefined())

    expect(scene.children[0]).toBe(MockMesh)
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

    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(
      () =>
        ({
          load: jest
            .fn()
            .mockImplementationOnce((_url, onLoad) => {
              onLoad(MockMesh)
            })
            .mockImplementationOnce((_url, onLoad) => {
              onLoad({ scene: MockGroup })
            }),
          setPath: () => {},
        } as unknown as Stdlib.GLTFLoader),
    )

    const Component = () => {
      const [mockMesh, mockScene] = useLoader(Stdlib.GLTFLoader, ['/suzanne.glb', '/myModels.glb'], (loader) => {
        loader.setPath('/public/models')
      })

      return (
        <>
          <primitive object={mockMesh} />
          <primitive object={mockScene} />
        </>
      )
    }

    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(
          <React.Suspense fallback={null}>
            <Component />
          </React.Suspense>,
        )
        .getState().scene
    })

    await waitFor(() => expect(scene.children[0]).toBeDefined())

    expect(scene.children[0]).toBe(MockMesh)
  })

  it('can handle useLoader with a loader extension', async () => {
    class Loader extends THREE.Loader {
      load = (_url: string) => null
    }

    let proto!: Loader

    function Test() {
      return useLoader(Loader, '', (loader) => (proto = loader))
    }
    await act(async () => createRoot(canvas).render(<Test />))

    expect(proto).toBeInstanceOf(Loader)
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

    await act(async () => {
      createRoot(canvas).render(<Component />)
    })

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
    let instance!: React.MutableRefObject<LocalState>

    const Component = () => {
      instance = useInstanceHandle(ref)
      return <group ref={ref} />
    }
    await act(async () => createRoot(canvas).render(<Component />))

    expect(instance.current).toBe((ref.current as unknown as Instance).__r3f)
  })
})
