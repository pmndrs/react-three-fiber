jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { Group, Camera, Scene, Raycaster, Mesh, BoxBufferGeometry, MeshBasicMaterial } from 'three'
// @ts-ignore
import * as Stdlib from 'three-stdlib'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { asyncUtils } from '../../../shared/asyncUtils'

import { render, advance, useLoader, act, useThree, useGraph, useFrame, ObjectMap } from '../../src/web/index'

const resolvers = []

const { waitFor } = asyncUtils(act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('web hooks', () => {
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
  })

  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: Camera
      scene: Scene
      raycaster: Raycaster
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
      render(<Component />, canvas)
    })

    expect(result.camera instanceof Camera).toBeTruthy()
    expect(result.scene instanceof Scene).toBeTruthy()
    expect(result.raycaster instanceof Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0 })
  })

  it('can handle useFrame hook', async () => {
    const frameCalls = []

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

    let scene: Scene = null!
    await act(async () => (scene = render(<Component />, canvas, { frameloop: 'never' }).getState().scene))
    advance(Date.now())
    expect(scene.children[0].position.x).toEqual(1)
    expect(frameCalls.length).toBeGreaterThan(0)
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new Mesh()
    // @ts-ignore
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(() => ({
      load: jest.fn().mockImplementation((url, onLoad) => {
        onLoad(MockMesh)
      }),
    }))

    const Component = () => {
      // @ts-ignore
      const model = useLoader(Stdlib.GLTFLoader, '/suzanne.glb')
      return <primitive object={model} />
    }

    let scene: Scene = null!
    await act(async () => {
      scene = render(
        <React.Suspense fallback={null}>
          <Component />
        </React.Suspense>,
        canvas,
      ).getState().scene
    })

    await waitFor(() => expect(scene.children[0]).toBeDefined())

    expect(scene.children[0]).toBe(MockMesh)
  })

  it('can handle useLoader hook with an array of strings', async () => {
    const MockMesh = new Mesh()

    const MockGroup = new Group()
    const mat1 = new MeshBasicMaterial()
    mat1.name = 'Mat 1'
    const mesh1 = new Mesh(new BoxBufferGeometry(2, 2), mat1)
    mesh1.name = 'Mesh 1'
    const mat2 = new MeshBasicMaterial()
    mat2.name = 'Mat 2'
    const mesh2 = new Mesh(new BoxBufferGeometry(2, 2), mat2)
    mesh2.name = 'Mesh 2'
    MockGroup.add(mesh1, mesh2)

    // @ts-ignore
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(() => ({
      load: jest
        .fn()
        .mockImplementationOnce((url, onLoad) => {
          onLoad(MockMesh)
        })
        .mockImplementationOnce((url, onLoad) => {
          onLoad({ scene: MockGroup })
        }),
      // @ts-ignore
      setPath: () => {},
    }))

    const Component = () => {
      // @ts-ignore
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

    let scene: Scene = null!
    await act(async () => {
      scene = render(
        <React.Suspense fallback={null}>
          <Component />
        </React.Suspense>,
        canvas,
      ).getState().scene
    })

    await waitFor(() => expect(scene.children[0]).toBeDefined())

    expect(scene.children[0]).toBe(MockMesh)
  })

  it('can handle useGraph hook', async () => {
    const group = new Group()
    const mat1 = new MeshBasicMaterial()
    mat1.name = 'Mat 1'
    const mesh1 = new Mesh(new BoxBufferGeometry(2, 2), mat1)
    mesh1.name = 'Mesh 1'
    const mat2 = new MeshBasicMaterial()
    mat2.name = 'Mat 2'
    const mesh2 = new Mesh(new BoxBufferGeometry(2, 2), mat2)
    mesh2.name = 'Mesh 2'
    const subGroup = new Group()
    const mat3 = new MeshBasicMaterial()
    mat3.name = 'Mat 3'
    const mesh3 = new Mesh(new BoxBufferGeometry(2, 2), mat3)
    mesh3.name = 'Mesh 3'
    const mat4 = new MeshBasicMaterial()
    mat4.name = 'Mat 4'
    const mesh4 = new Mesh(new BoxBufferGeometry(2, 2), mat4)
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
      render(<Component />, canvas)
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
})
