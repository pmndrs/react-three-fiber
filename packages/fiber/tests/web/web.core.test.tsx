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
  Object3D,
  WebGLRenderer,
  LinearEncoding,
  NoToneMapping,
} from 'three'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { render, act, unmountComponentAtNode, useFrame, extend } from '../../src/web/index'
import { UseStore } from 'zustand'
import { RootState } from '../../src/core/store'
import { ReactThreeFiber } from '../../src'
import { Instance } from '../../src/core/renderer'

type ComponentMesh = Mesh<BoxBufferGeometry, MeshBasicMaterial>

/* This class is used for one of the tests */
class HasObject3dMember extends Object3D {
  public attachment?: Object3D = undefined
}

/* This class is used for one of the tests */
class HasObject3dMethods extends Object3D {
  attachedObj3d?: Object3D
  detachedObj3d?: Object3D

  customAttach(obj3d: Object3D) {
    this.attachedObj3d = obj3d
  }

  detach(obj3d: Object3D) {
    this.detachedObj3d = obj3d
  }
}

extend({ HasObject3dMember, HasObject3dMethods })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      hasObject3dMember: ReactThreeFiber.Node<HasObject3dMember, typeof HasObject3dMember>
      hasObject3dMethods: ReactThreeFiber.Node<HasObject3dMethods, typeof HasObject3dMethods>
    }
  }
}

beforeAll(() => {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 2,
  })
})

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
    expect((scene.children[0] as ComponentMesh).geometry.type).toEqual('BoxGeometry')
    expect((scene.children[0] as ComponentMesh).material.type).toEqual('MeshBasicMaterial')
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, MeshStandardMaterial>).material.type).toEqual(
      'MeshBasicMaterial',
    )
  })

  it('renders an empty scene', async () => {
    const Empty = () => null
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
    expect(
      (scene.children[0].children[0] as THREE.Mesh<THREE.BoxGeometry, MeshStandardMaterial>).material.type,
    ).toEqual('MeshBasicMaterial')
  })

  it('renders some basics with an update', async () => {
    let renders = 0

    class Component extends React.PureComponent {
      state = { pos: 3 }

      componentDidMount() {
        this.setState({ pos: 7 })
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
    expect(renders).toBe(6)
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

  it('attaches Object3D children that use attach', async () => {
    let scene: Scene = null!
    await act(async () => {
      scene = render(
        <hasObject3dMember>
          <mesh attach="attachment" />
        </hasObject3dMember>,
        canvas,
      ).getState().scene
    })

    const attachedMesh = (scene.children[0] as HasObject3dMember).attachment
    expect(attachedMesh).toBeDefined()
    expect(attachedMesh?.type).toBe('Mesh')
    // attaching is *instead of* being a regular child
    expect(scene.children[0].children.length).toBe(0)
  })

  it('can attach a Scene', async () => {
    let scene: Scene = null!
    await act(async () => {
      scene = render(
        <hasObject3dMember>
          <scene attach="attachment" />
        </hasObject3dMember>,
        canvas,
      ).getState().scene
    })

    const attachedScene = (scene.children[0] as HasObject3dMember).attachment
    expect(attachedScene).toBeDefined()
    expect(attachedScene?.type).toBe('Scene')
    // attaching is *instead of* being a regular child
    expect(scene.children[0].children.length).toBe(0)
  })

  describe('attaches Object3D children that use attachFns', () => {
    it('attachFns as strings', async () => {
      let scene: Scene = null!
      await act(async () => {
        scene = render(
          <hasObject3dMethods>
            <mesh attach={['customAttach', 'detach']} />
          </hasObject3dMethods>,
          canvas,
        ).getState().scene
      })

      const attachedMesh = (scene.children[0] as HasObject3dMethods).attachedObj3d
      expect(attachedMesh).toBeDefined()
      expect(attachedMesh?.type).toBe('Mesh')
      // attaching is *instead of* being a regular child
      expect(scene.children[0].children.length).toBe(0)

      // and now detach ..
      expect((scene.children[0] as HasObject3dMethods).detachedObj3d).toBeUndefined()

      await act(async () => {
        render(<hasObject3dMethods />, canvas)
      })

      const detachedMesh = (scene.children[0] as HasObject3dMethods).detachedObj3d
      expect(detachedMesh).toBe(attachedMesh)
    })

    it('attachFns as functions', async () => {
      let scene: Scene = null!
      let attachedMesh: Instance = null!
      let detachedMesh: Instance = null!

      await act(async () => {
        scene = render(
          <hasObject3dMethods>
            <mesh
              attach={[
                (mesh: Instance) => {
                  attachedMesh = mesh
                },
                (mesh: Instance) => {
                  detachedMesh = mesh
                },
              ]}
            />
          </hasObject3dMethods>,
          canvas,
        ).getState().scene
      })

      expect(attachedMesh).toBeDefined()
      expect(attachedMesh?.type).toBe('Object3D')
      // attaching is *instead of* being a regular child
      expect(scene.children[0].children.length).toBe(0)

      await act(async () => {
        render(<hasObject3dMethods />, canvas)
      })

      expect(detachedMesh).toBe(attachedMesh)
    })
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

    expect(log).toEqual(['render Foo', 'mount Foo', 'unmount Foo'])
  })

  it('will mount/unmount event handlers correctly', async () => {
    let state: RootState = null!
    let mounted = false
    let attachEvents = false

    const EventfulComponent = () => (mounted ? <group onClick={attachEvents ? () => void 0 : undefined} /> : null)

    // Test initial mount without events
    mounted = true
    await act(async () => {
      state = render(<EventfulComponent />, canvas).getState()
    })
    expect(state.internal.interaction.length).toBe(0)

    // Test initial mount with events
    attachEvents = true
    await act(async () => {
      state = render(<EventfulComponent />, canvas).getState()
    })
    expect(state.internal.interaction.length).not.toBe(0)

    // Test events update
    attachEvents = false
    await act(async () => {
      state = render(<EventfulComponent />, canvas).getState()
    })
    expect(state.internal.interaction.length).toBe(0)

    attachEvents = true
    await act(async () => {
      state = render(<EventfulComponent />, canvas).getState()
    })
    expect(state.internal.interaction.length).not.toBe(0)

    // Test unmount with events
    mounted = false
    await act(async () => {
      state = render(<EventfulComponent />, canvas).getState()
    })
    expect(state.internal.interaction.length).toBe(0)
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
        dpr: [1, 2],
        performance: { min: 0.2 },
      })
    })

    expect(state.getState().viewport.initialDpr).toEqual(2)
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

  it('should toggle render mode in xr', async () => {
    let state: RootState = null!

    await act(async () => {
      state = render(<group />, canvas).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(state.gl.xr.enabled).toEqual(true)

    await act(async () => {
      state.gl.xr.isPresenting = false
      state.gl.xr.dispatchEvent({ type: 'sessionend' })
    })

    expect(state.gl.xr.enabled).toEqual(false)
  })

  it('should respect frameloop="never" in xr', async () => {
    let respected = true

    await act(async () => {
      const TestGroup = () => {
        useFrame(() => (respected = false))
        return <group />
      }
      const state = render(<TestGroup />, canvas, { frameloop: 'never' }).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('will render components that are extended', async () => {
    class MyColor extends Color {
      constructor(col: number) {
        super(col)
      }
    }

    const testExtend = async () => {
      await act(async () => {
        extend({ MyColor })

        // @ts-expect-error we're testing the extend feature, i'm not adding it to the namespace
        render(<myColor args={[0x0000ff]} />, canvas)
      })
    }

    expect(() => testExtend()).not.toThrow()
  })

  it('should set renderer props via gl prop', async () => {
    let gl: THREE.WebGLRenderer = null!
    await act(async () => {
      gl = render(<group />, canvas, {
        gl: { physicallyCorrectLights: true },
      }).getState().gl
    })

    expect(gl.physicallyCorrectLights).toBe(true)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends WebGLRenderer {}

    let gl: Renderer = null!
    await act(async () => {
      gl = render(<group />, canvas, {
        gl: (canvas) => new Renderer({ canvas }),
      }).getState().gl
    })

    expect(gl instanceof Renderer).toBe(true)
  })

  it('should respect color management preferences via gl', async () => {
    let gl: THREE.WebGLRenderer = null!
    await act(async () => {
      gl = render(<group />, canvas, {
        gl: { outputEncoding: LinearEncoding, toneMapping: NoToneMapping },
      }).getState().gl
    })

    expect(gl.outputEncoding).toBe(LinearEncoding)
    expect(gl.toneMapping).toBe(NoToneMapping)

    await act(async () => {
      gl = render(<group />, canvas, {
        flat: true,
        linear: true,
      }).getState().gl
    })

    expect(gl.outputEncoding).toBe(LinearEncoding)
    expect(gl.toneMapping).toBe(NoToneMapping)
  })
})
