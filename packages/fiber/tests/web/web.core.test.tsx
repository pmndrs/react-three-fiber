jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import {
  Color,
  Group,
  Camera,
  Scene,
  Mesh,
  BoxBufferGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  ACESFilmicToneMapping,
  sRGBEncoding,
} from 'three'
import { createCanvas } from 'react-three-test-renderer/src/createTestCanvas'
import { createWebGLContext } from 'react-three-test-renderer/src/createWebGLContext'

import { render, testutil_act as act, unmountComponentAtNode, extend } from '../../src/web/index'
import { UseStore } from 'zustand'
import { RootState } from '../../src/core/store'

type ComponentMesh = Mesh<BoxBufferGeometry, MeshBasicMaterial>

describe('web core', () => {
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

  it('will make an Orthographic Camera & set the position', async () => {
    let camera: Camera = null!

    await act(async () => {
      camera = render(<group />, canvas, { orthographic: true, camera: { position: [0, 0, 5] } }).getState().camera
    })

    expect(camera.type).toEqual('OrthographicCamera')
    expect(camera.position.z).toEqual(5)
  })

  it('should handle an performance changing functions', async () => {
    let state: UseStore<RootState> = null!
    await act(async () => {
      state = render(<group />, canvas, {
        dpr: [1, 10],
        performance: { min: 0.2 },
      })
    })

    expect(state.getState().viewport.initialDpr).toEqual(10)
    expect(state.getState().performance.min).toEqual(0.2)
    expect(state.getState().performance.current).toEqual(1)

    await act(async () => {
      state.getState().setDpr(0.1)
    })

    expect(state.getState().viewport.dpr).toEqual(0.1)

    jest.useFakeTimers()

    await act(async () => {
      state.getState().performance.regress()
      jest.advanceTimersByTime(100)
    })

    expect(state.getState().performance.current).toEqual(0.2)

    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    expect(state.getState().performance.current).toEqual(1)

    jest.useRealTimers()
  })

  it('should set PCFSoftShadowMap as the default shadow map', async () => {
    let state: UseStore<RootState> = null!
    await act(async () => {
      state = render(<group />, canvas, {
        shadows: true,
      })
    })

    expect(state.getState().gl.shadowMap.type).toBe(PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputEncoding to sRGBEncoding if linear is false', async () => {
    let state: UseStore<RootState> = null!
    await act(async () => {
      state = render(<group />, canvas, {
        linear: false,
      })
    })

    expect(state.getState().gl.toneMapping).toBe(ACESFilmicToneMapping)
    expect(state.getState().gl.outputEncoding).toBe(sRGBEncoding)
  })

  it('will render components that are extended', async () => {
    class MyColor extends Color {
      constructor(col: number) {
        super(col)
      }
    }

    await expect(async () => {
      await act(async () => {
        extend({ MyColor })

        // @ts-expect-error we're testing the extend feature, i'm not adding it to the namespace
        render(<myColor args={[0x0000ff]} />, canvas)
      })
    }).not.toThrow()
  })
})
