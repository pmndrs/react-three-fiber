import * as React from 'react'
// @ts-ignore
import * as Stdlib from 'three-stdlib'
import { Material, Mesh, Camera, Scene, Raycaster } from 'three'
import { useFrame, useLoader, useThree } from 'react-three-fiber'

import { asyncUtils } from '../../../../test/asyncUtils'

import ReactThreeTestRenderer from '../index'

const resolvers = []

const { waitFor } = asyncUtils(ReactThreeTestRenderer.act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('ReactThreeTestRenderer', () => {
  it('renders a simple component', () => {
    const Mesh = () => {
      return (
        <mesh>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }
    const renderer = ReactThreeTestRenderer.create(<Mesh />)

    expect(renderer.scene.children[0].type).toEqual('Mesh')
  })

  it('renders an empty scene', () => {
    const Empty = () => {
      return null
    }
    const renderer = ReactThreeTestRenderer.create(<Empty />)

    expect(renderer.scene.type).toEqual('Scene')
    expect(renderer.scene.children).toEqual([])
    expect(renderer.toGraph()).toEqual([])
  })

  it('can render a composite component & correctly build simple graph', () => {
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
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = ReactThreeTestRenderer.create(<Parent />)

    expect(renderer.toGraph()).toEqual([
      {
        type: 'Group',
        name: '',
        children: [
          {
            type: 'Mesh',
            name: '',
            children: [],
          },
        ],
      },
    ])
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

    const renderer = ReactThreeTestRenderer.create(<Component />)

    expect(renderer.scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  it('updates types & names', async () => {
    const renderer = ReactThreeTestRenderer.create(
      <mesh>
        <meshBasicMaterial name="basicMat">
          <color attach="color" args={[0, 0, 0]} />
        </meshBasicMaterial>
      </mesh>,
    )

    expect(renderer.scene.children[0].material.type).toEqual('MeshBasicMaterial')
    expect(renderer.scene.children[0].material.name).toEqual('basicMat')

    renderer.update(
      <mesh>
        <meshStandardMaterial name="standardMat">
          <color attach="color" args={[255, 255, 255]} />
        </meshStandardMaterial>
      </mesh>,
    )

    expect(renderer.scene.children[0].material.type).toEqual('MeshStandardMaterial')
    expect(renderer.scene.children[0].material.name).toEqual('standardMat')
  })

  it('exposes the instance', () => {
    class Mesh extends React.PureComponent {
      state = { standardMat: false }

      handleStandard() {
        this.setState({ standardMat: true })
      }

      render() {
        return (
          <mesh>
            <boxGeometry args={[2, 2]} />
            {this.state.standardMat ? <meshStandardMaterial /> : <meshBasicMaterial />}
          </mesh>
        )
      }
    }

    const renderer = ReactThreeTestRenderer.create(<Mesh />)

    expect(renderer.toTree()).toEqual([
      {
        type: 'mesh',
        props: {},
        children: [
          { type: 'boxGeometry', props: { args: [2, 2], attach: 'geometry' }, children: [] },
          {
            type: 'meshBasicMaterial',
            props: {
              attach: 'material',
            },
            children: [],
          },
        ],
      },
    ])

    const instance = renderer.getInstance() as Mesh

    instance.handleStandard()

    expect(renderer.toTree()).toEqual([
      {
        type: 'mesh',
        props: {},
        children: [
          { type: 'boxGeometry', props: { args: [2, 2], attach: 'geometry' }, children: [] },
          {
            type: 'meshStandardMaterial',
            props: { attach: 'material' },
            children: [],
          },
        ],
      },
    ])
  })

  it('updates children', () => {
    const renderer = ReactThreeTestRenderer.create(
      <group>
        <mesh key="a" position-z={12}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="b" position-y={12}>
          <boxGeometry args={[4, 4]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="c" position-x={12}>
          <boxGeometry args={[6, 6]} />
          <meshBasicMaterial />
        </mesh>
      </group>,
    )

    expect(renderer.toTree()).toEqual([
      {
        type: 'group',
        props: {},
        children: [
          {
            type: 'mesh',
            props: {
              ['position-z']: 12,
            },
            children: [
              {
                type: 'boxGeometry',
                props: {
                  args: [2, 2],
                  attach: 'geometry',
                },
                children: [],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                },
                children: [],
              },
            ],
          },
          {
            type: 'mesh',
            props: {
              ['position-y']: 12,
            },
            children: [
              {
                type: 'boxGeometry',
                props: {
                  args: [4, 4],
                  attach: 'geometry',
                },
                children: [],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                },
                children: [],
              },
            ],
          },
          {
            type: 'mesh',
            props: {
              ['position-x']: 12,
            },
            children: [
              {
                type: 'boxGeometry',
                props: {
                  args: [6, 6],
                  attach: 'geometry',
                },
                children: [],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                },
                children: [],
              },
            ],
          },
        ],
      },
    ])

    renderer.update(
      <group>
        <mesh key="d" rotation-x={1}>
          <boxGeometry args={[6, 6]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="b" position-y={12}>
          <boxGeometry args={[4, 4]} />
          <meshBasicMaterial />
        </mesh>
        <mesh key="c" position-x={12}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      </group>,
    )

    expect(renderer.toTree()).toEqual([
      {
        type: 'group',
        props: {},
        children: [
          {
            type: 'mesh',
            props: {
              ['rotation-x']: 1,
            },
            children: [
              {
                type: 'boxGeometry',
                props: {
                  args: [6, 6],
                  attach: 'geometry',
                },
                children: [],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                },
                children: [],
              },
            ],
          },
          {
            type: 'mesh',
            props: {
              ['position-y']: 12,
            },
            children: [
              {
                type: 'boxGeometry',
                props: {
                  args: [4, 4],
                  attach: 'geometry',
                },
                children: [],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                },
                children: [],
              },
            ],
          },
          {
            type: 'mesh',
            props: {
              ['position-x']: 12,
            },
            children: [
              {
                type: 'boxGeometry',
                props: {
                  args: [2, 2],
                  attach: 'geometry',
                },
                children: [],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                },
                children: [],
              },
            ],
          },
        ],
      },
    ])
  })

  it('does the full lifecycle', () => {
    const log: string[] = []
    class Log extends React.Component<{ name: string }> {
      render() {
        log.push('render ' + this.props.name)
        return <group />
      }
      componentDidMount() {
        log.push('mount ' + this.props.name)
      }
      componentWillUnmount() {
        log.push('unmount ' + this.props.name)
      }
    }

    const renderer = ReactThreeTestRenderer.create(<Log key="foo" name="Foo" />)
    renderer.update(<Log key="bar" name="Bar" />)
    renderer.unmount()

    expect(log).toEqual(['render Foo', 'mount Foo', 'render Bar', 'unmount Foo', 'mount Bar', 'unmount Bar'])
  })

  it('gives a ref to native components', () => {
    const log: Mesh[] = []
    ReactThreeTestRenderer.create(<mesh ref={(r) => log.push(r as Mesh)} />)
    expect(log.length).toEqual(1)

    expect(log[0].type).toEqual('Mesh')
  })

  it('supports unmounting when using refs', () => {
    class Foo extends React.Component {
      meshRef = React.createRef<Mesh>()

      render() {
        return <mesh ref={this.meshRef} />
      }
    }
    const renderer = ReactThreeTestRenderer.create(<Foo />)

    expect(() => renderer.unmount()).not.toThrow()
  })

  it('toTree() handles nested Fragments', () => {
    const Component = () => (
      <>
        <>
          <group />
        </>
      </>
    )
    const renderer = ReactThreeTestRenderer.create(<Component />)

    expect(renderer.toTree()).toEqual([
      {
        type: 'group',
        props: {},
        children: [],
      },
    ])
  })

  it('correctly builds a tree', () => {
    const Component = () => {
      return (
        <group position={[1, 2, 3]}>
          <Child col={[0, 0, 255]} />
          <Mesh />
          <Null />
        </group>
      )
    }

    const vertices = new Float32Array([
      -1.0,
      -1.0,
      1.0,
      1.0,
      -1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      1.0,
      -1.0,
      1.0,
      1.0,
      -1.0,
      -1.0,
      1.0,
    ])

    const Mesh = () => {
      return (
        <mesh>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attachObject={['attributes', 'position']}
              array={vertices}
              count={vertices.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <meshBasicMaterial attach="material" color="hotpink" />
        </mesh>
      )
    }

    const Child = ({ col }: { col: [number, number, number] }) => {
      return <color attach="background" args={col} />
    }

    const Null = () => {
      return null
    }

    const renderer = ReactThreeTestRenderer.create(<Component />)

    expect(renderer.toTree()).toEqual([
      {
        type: 'group',
        props: {
          position: [1, 2, 3],
        },
        children: [
          {
            type: 'mesh',
            props: {},
            children: [
              {
                type: 'bufferGeometry',
                props: { attach: 'geometry' },
                children: [
                  {
                    type: 'bufferAttribute',
                    props: {
                      attachObject: ['attributes', 'position'],
                      array: vertices,
                      count: vertices.length / 3,
                      itemSize: 3,
                    },
                    children: [],
                  },
                ],
              },
              {
                type: 'meshBasicMaterial',
                props: {
                  attach: 'material',
                  color: 'hotpink',
                },
                children: [],
              },
            ],
          },
          {
            type: 'color',
            props: {
              attach: 'background',
              args: [0, 0, 255],
            },
            children: [],
          },
        ],
      },
    ])
  })

  it('toTree() handles complicated tree of fragments', () => {
    const renderer = ReactThreeTestRenderer.create(
      <>
        <>
          <group>
            <color attach="background" args={[0, 0, 0]} />
          </group>
          <>
            <group>
              <color attach="background" args={[0, 0, 255]} />
            </group>
          </>
        </>
        <group>
          <color attach="background" args={[255, 0, 0]} />
        </group>
      </>,
    )

    expect(renderer.toTree()).toEqual([
      {
        type: 'group',
        props: {},
        children: [
          {
            type: 'color',
            props: {
              args: [0, 0, 0],
              attach: 'background',
            },
            children: [],
          },
        ],
      },
      {
        type: 'group',
        props: {},
        children: [
          {
            type: 'color',
            props: {
              args: [0, 0, 255],
              attach: 'background',
            },
            children: [],
          },
        ],
      },
      {
        type: 'group',
        props: {},
        children: [
          {
            type: 'color',
            props: {
              args: [255, 0, 0],
              attach: 'background',
            },
            children: [],
          },
        ],
      },
    ])
  })

  it('root instance and refs return the same value', () => {
    let refInst = null
    const renderer = ReactThreeTestRenderer.create(<mesh ref={(ref) => (refInst = ref)} />)
    const root = renderer.getInstance() // this will be Mesh
    expect(root).toEqual(refInst)
  })

  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: Camera
      scene: Scene
      raycaster: Raycaster
      size: { width: number; height: number }
    }

    const Component = () => {
      const res = useThree((state) => ({
        camera: state.camera,
        scene: state.scene,
        size: state.size,
        raycaster: state.raycaster,
      }))

      result = res

      return <group />
    }

    ReactThreeTestRenderer.create(<Component />)

    expect(result.camera instanceof Camera).toBeTruthy()
    expect(result.scene instanceof Scene).toBeTruthy()
    expect(result.raycaster instanceof Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0 })
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

    const renderer = ReactThreeTestRenderer.create(
      <React.Suspense fallback={null}>
        <Component />
      </React.Suspense>,
    )

    await waitFor(() => expect(renderer.scene.children[0]).toBeDefined())

    expect(renderer.scene.children[0]).toBe(MockMesh)
  })

  it('can handle useFrame hook', async () => {
    const Component = () => {
      const meshRef = React.useRef<Mesh>(null!)
      useFrame((_, delta) => {
        meshRef.current.rotation.x += delta
      })

      return (
        <mesh ref={meshRef}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = ReactThreeTestRenderer.create(<Component />)

    expect(renderer.scene.children[0].rotation.x).toEqual(0)

    const delta = 2

    expect(renderer.scene.children[0].rotation.x).toEqual(delta)
  })
})
