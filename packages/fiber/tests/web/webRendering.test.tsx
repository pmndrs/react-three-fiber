import * as React from 'react'
import {
  Group,
  Camera,
  Scene,
  Raycaster,
  Mesh,
  BoxBufferGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Ray,
} from 'three'
// @ts-ignore
import * as Stdlib from 'three-stdlib'
import { createCanvas } from 'react-three-test-renderer/src/createTestCanvas'
import { createWebGLContext } from 'react-three-test-renderer/src/createWebGLContext'

import { asyncUtils } from '../../../../test/asyncUtils'

import { render, advance, useLoader, testutil_act as act, useThree, useGraph, useFrame, ObjectMap } from '../../src/web/index'
import { RootState } from '../../src/core/store'
import { UseStore } from 'zustand'

type ComponentMesh = Mesh<BoxBufferGeometry, MeshBasicMaterial>

const resolvers = []

const { waitFor } = asyncUtils(act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('web renderer', () => {
  const canvas = createCanvas({
    beforeReturn: (canvas) => {
      //@ts-ignore
      canvas.getContext = (type: string) => {
        if (type === 'webgl' || type === 'webgl2') {
          return createWebGLContext(canvas)
        }
      }
    },
  })

  it('renders a simple component', () => {
    const Mesh = () => {
      return (
        <mesh>
          <boxBufferGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }
    const scene = render(<Mesh />, canvas).getState().scene
    expect(scene.children[0].type).toEqual('Mesh')
  })

  it('renders an empty scene', () => {
    const Empty = () => {
      return null
    }
    const scene = render(<Empty />, canvas).getState().scene

    expect(scene.type).toEqual('Scene')
    expect(scene.children).toEqual([])
  })

  it('can render a composite component', () => {
    class Parent extends React.Component {
      render() {
        return (
          <group>
            <color attach="background" args={[0, 0, 0]} />
            <Child />
          </group>
        )
      }
    }

    const Child = () => {
      return (
        <mesh>
          <boxBufferGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const scene = render(<Parent />, canvas).getState().scene

    expect(scene.children[0].type).toEqual('Group')
    // @ts-expect-error we do append background to group, but it's not wrong because it won't do anything.
    expect((scene.children[0] as Group).background.getStyle()).toEqual('rgb(0,0,0)')
    expect(scene.children[0].children[0].type).toEqual('Mesh')
    expect((scene.children[0].children[0] as ComponentMesh).geometry.type).toEqual('BoxGeometry')
    expect((scene.children[0].children[0] as ComponentMesh).material.type).toEqual('MeshBasicMaterial')
  })

  it('renders some basics with an update', () => {
    let renders = 0

    class Component extends React.PureComponent {
      state = {
        pos: 3,
      }

      componentDidMount() {
        this.setState({
          pos: 7,
        })
      }

      render() {
        renders++
        return (
          <group position-x={this.state.pos}>
            <Child />
            <Null />
          </group>
        )
      }
    }

    const Child = () => {
      renders++
      return <color attach="background" args={[0, 0, 0]} />
    }

    const Null = () => {
      renders++
      return null
    }

    const scene = render(<Component />, canvas).getState().scene

    expect(scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  it('updates types & names', async () => {
    let scene = render(
      <mesh>
        <meshBasicMaterial name="basicMat">
          <color attach="color" args={[0, 0, 0]} />
        </meshBasicMaterial>
      </mesh>,
      canvas,
    ).getState().scene

    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshBasicMaterial>).material.type).toEqual(
      'MeshBasicMaterial',
    )
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshBasicMaterial>).material.name).toEqual('basicMat')

    scene = render(
      <mesh>
        <meshStandardMaterial name="standardMat">
          <color attach="color" args={[255, 255, 255]} />
        </meshStandardMaterial>
      </mesh>,
      canvas,
    ).getState().scene

    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshStandardMaterial>).material.type).toEqual(
      'MeshStandardMaterial',
    )
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshStandardMaterial>).material.name).toEqual(
      'standardMat',
    )
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

    render(<Component />, canvas)

    expect(result.camera instanceof Camera).toBeTruthy()
    expect(result.scene instanceof Scene).toBeTruthy()
    expect(result.raycaster instanceof Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0 })
  })

  it('can handle useFrame hook', async () => {
    const frameCalls = []

    const Component = () => {
      const meshRef = React.useRef<Mesh>()

      useFrame((_, delta) => {
        if (meshRef.current) {
          console.log('calling delta', delta)
          frameCalls.push(delta)
          meshRef.current.rotation.x += delta
        }
      })

      return (
        <mesh ref={meshRef}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    await act(async () => render(<Component />, canvas, { frameloop: 'never' }))
    advance(Date.now())
    expect(frameCalls.length).toBeGreaterThan(0)
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new Mesh()
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(() => ({
      load: jest.fn().mockImplementation((url, onLoad) => {
        onLoad(MockMesh)
      }),
    }))

    const Component = () => {
      // @ts-ignore i only need to provide an onLoad function
      const model = useLoader(Stdlib.GLTFLoader, '/suzanne.glb')

      return <primitive object={model} />
    }

    const scene = render(
      <React.Suspense fallback={null}>
        <Component />
      </React.Suspense>,
      canvas,
    ).getState().scene

    await waitFor(() => expect(scene.children[0]).toBeDefined())

    expect(scene.children[0]).toBe(MockMesh)
  })

  it('can handle useGraph hook', () => {
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

    render(<Component />, canvas)

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

  // it('will apply raycaster props', () => {
  //   expect(true).toBe(false)
  // })

  // it('will apply shadowMap props', () => {
  //   expect(true).toBe(false)
  // })

  // it('will apply camera props', () => {
  //   expect(true).toBe(false)
  // })

  // it('will make an Orthographic Camera', () => {
  //   expect(true).toBe(false)
  // })
})
