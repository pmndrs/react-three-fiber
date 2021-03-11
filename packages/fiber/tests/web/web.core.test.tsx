jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { Group, Scene, Mesh, BoxBufferGeometry, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { createCanvas } from 'react-three-test-renderer/src/createTestCanvas'
import { createWebGLContext } from 'react-three-test-renderer/src/createWebGLContext'

import { render, testutil_act as act, unmountComponentAtNode } from '../../src/web/index'

type ComponentMesh = Mesh<BoxBufferGeometry, MeshBasicMaterial>

describe('web core', () => {
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

  it('renders a simple component', async () => {
    const Mesh = () => {
      return (
        <mesh>
          <boxBufferGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }
    let scene: Scene = null!

    await act(async () => {
      scene = render(<Mesh />, canvas).getState().scene
    })

    expect(scene.children[0].type).toEqual('Mesh')
  })

  it('renders an empty scene', async () => {
    const Empty = () => {
      return null
    }
    let scene: Scene = null!

    await act(async () => {
      scene = render(<Empty />, canvas).getState().scene
    })

    expect(scene.type).toEqual('Scene')
    expect(scene.children).toEqual([])
  })

  it('can render a composite component', async () => {
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

    let scene: Scene = null!

    await act(async () => {
      scene = render(<Parent />, canvas).getState().scene
    })

    expect(scene.children[0].type).toEqual('Group')
    // @ts-expect-error we do append background to group, but it's not wrong because it won't do anything.
    expect((scene.children[0] as Group).background.getStyle()).toEqual('rgb(0,0,0)')
    expect(scene.children[0].children[0].type).toEqual('Mesh')
    expect((scene.children[0].children[0] as ComponentMesh).geometry.type).toEqual('BoxGeometry')
    expect((scene.children[0].children[0] as ComponentMesh).material.type).toEqual('MeshBasicMaterial')
  })

  it('renders some basics with an update', async () => {
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

    let scene: Scene = null!

    await act(async () => {
      scene = render(<Component />, canvas).getState().scene
    })

    expect(scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(12)
  })

  it('updates types & names', async () => {
    let scene: Scene = null!

    await act(async () => {
      scene = render(
        <mesh>
          <meshBasicMaterial name="basicMat">
            <color attach="color" args={[0, 0, 0]} />
          </meshBasicMaterial>
        </mesh>,
        canvas,
      ).getState().scene
    })

    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshBasicMaterial>).material.type).toEqual(
      'MeshBasicMaterial',
    )
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshBasicMaterial>).material.name).toEqual('basicMat')

    await act(async () => {
      scene = render(
        <mesh>
          <meshStandardMaterial name="standardMat">
            <color attach="color" args={[255, 255, 255]} />
          </meshStandardMaterial>
        </mesh>,
        canvas,
      ).getState().scene
    })

    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshStandardMaterial>).material.type).toEqual(
      'MeshStandardMaterial',
    )
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshStandardMaterial>).material.name).toEqual(
      'standardMat',
    )
  })

  it('does the full lifecycle', async () => {
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

    await act(async () => {
      render(<Log key="foo" name="Foo" />, canvas)
    })

    await act(async () => {
      unmountComponentAtNode(canvas)
    })

    expect(log).toEqual(['render Foo', 'render Foo', 'mount Foo', 'unmount Foo'])
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
