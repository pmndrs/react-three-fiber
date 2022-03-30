import * as React from 'react'
import * as THREE from 'three'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { createRoot, act, unmountComponentAtNode, useFrame, extend, ReactThreeFiber } from '../../src/index'
import { UseBoundStore } from 'zustand'
import { RootState } from '../../src/core/store'
import { Instance } from '../../src/core/renderer'

type ComponentMesh = THREE.Mesh<THREE.BoxBufferGeometry, THREE.MeshBasicMaterial>

/* This class is used for one of the tests */
class HasObject3dMember extends THREE.Object3D {
  public attachment?: THREE.Object3D = undefined
}

/* This class is used for one of the tests */
class HasObject3dMethods extends THREE.Object3D {
  attachedObj3d?: THREE.Object3D
  detachedObj3d?: THREE.Object3D

  customAttach(obj3d: THREE.Object3D) {
    this.attachedObj3d = obj3d
  }

  detach(obj3d: THREE.Object3D) {
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

describe('renderer', () => {
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
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(<Mesh />)
        .getState().scene
    })

    expect(scene.children[0].type).toEqual('Mesh')
    expect((scene.children[0] as ComponentMesh).geometry.type).toEqual('BoxGeometry')
    expect((scene.children[0] as ComponentMesh).material.type).toEqual('MeshBasicMaterial')
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.type).toEqual(
      'MeshBasicMaterial',
    )
  })

  it('renders an empty scene', async () => {
    const Empty = () => null
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(<Empty />)
        .getState().scene
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

    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(<Parent />)
        .getState().scene
    })

    expect(scene.children[0].type).toEqual('Group')
    // @ts-ignore we do append background to group, but it's not wrong because it won't do anything.
    expect((scene.children[0] as Group).background.getStyle()).toEqual('rgb(0,0,0)')
    expect(scene.children[0].children[0].type).toEqual('Mesh')
    expect((scene.children[0].children[0] as ComponentMesh).geometry.type).toEqual('BoxGeometry')
    expect((scene.children[0].children[0] as ComponentMesh).material.type).toEqual('MeshBasicMaterial')
    expect(
      (scene.children[0].children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.type,
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

    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(<Component />)
        .getState().scene
    })

    expect(scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  it('updates types & names', async () => {
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(
          <mesh>
            <meshBasicMaterial name="basicMat">
              <color attach="color" args={[0, 0, 0]} />
            </meshBasicMaterial>
          </mesh>,
        )
        .getState().scene
    })

    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>).material.type).toEqual(
      'MeshBasicMaterial',
    )
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>).material.name).toEqual(
      'basicMat',
    )

    await act(async () => {
      scene = createRoot(canvas)
        .render(
          <mesh>
            <meshStandardMaterial name="standardMat">
              <color attach="color" args={[255, 255, 255]} />
            </meshStandardMaterial>
          </mesh>,
        )
        .getState().scene
    })

    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.type).toEqual(
      'MeshStandardMaterial',
    )
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.name).toEqual(
      'standardMat',
    )
  })

  it('should forward ref three object', async () => {
    // Note: Passing directly should be less strict, and assigning current should be more strict
    let immutableRef!: React.RefObject<THREE.Mesh>
    let mutableRef!: React.MutableRefObject<THREE.Object3D | undefined>
    let mutableRefSpecific!: React.MutableRefObject<THREE.Mesh | null>

    const RefTest = () => {
      immutableRef = React.createRef()
      mutableRef = React.useRef()
      mutableRefSpecific = React.useRef(null)

      return (
        <>
          <mesh ref={immutableRef} />
          <mesh ref={mutableRef} />
          <mesh ref={(r) => (mutableRefSpecific.current = r)} />
        </>
      )
    }

    await act(async () => {
      createRoot(canvas).render(<RefTest />)
    })

    expect(immutableRef.current).toBeTruthy()
    expect(mutableRef.current).toBeTruthy()
    expect(mutableRefSpecific.current).toBeTruthy()
  })

  it('attaches Object3D children that use attach', async () => {
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(
          <hasObject3dMember>
            <mesh attach="attachment" />
          </hasObject3dMember>,
        )
        .getState().scene
    })

    const attachedMesh = (scene.children[0] as HasObject3dMember).attachment
    expect(attachedMesh).toBeDefined()
    expect(attachedMesh?.type).toBe('Mesh')
    // attaching is *instead of* being a regular child
    expect(scene.children[0].children.length).toBe(0)
  })

  it('can attach a Scene', async () => {
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = createRoot(canvas)
        .render(
          <hasObject3dMember>
            <scene attach="attachment" />
          </hasObject3dMember>,
        )
        .getState().scene
    })

    const attachedScene = (scene.children[0] as HasObject3dMember).attachment
    expect(attachedScene).toBeDefined()
    expect(attachedScene?.type).toBe('Scene')
    // attaching is *instead of* being a regular child
    expect(scene.children[0].children.length).toBe(0)
  })

  describe('attaches Object3D children that use attachFns', () => {
    it('attachFns with cleanup', async () => {
      let scene: THREE.Scene = null!
      await act(async () => {
        scene = createRoot(canvas)
          .render(
            <hasObject3dMethods>
              <mesh attach={(parent, self) => (parent.customAttach(self), () => parent.detach(self))} />
            </hasObject3dMethods>,
          )
          .getState().scene
      })

      const attachedMesh = (scene.children[0] as HasObject3dMethods).attachedObj3d
      expect(attachedMesh).toBeDefined()
      expect(attachedMesh?.type).toBe('Mesh')
      // attaching is *instead of* being a regular child
      expect(scene.children[0].children.length).toBe(0)

      // and now detach ..
      expect((scene.children[0] as HasObject3dMethods).detachedObj3d).toBeUndefined()

      await act(async () => {
        createRoot(canvas).render(<hasObject3dMethods />)
      })

      const detachedMesh = (scene.children[0] as HasObject3dMethods).detachedObj3d
      expect(detachedMesh).toBe(attachedMesh)
    })

    it('attachFns as functions', async () => {
      let scene: THREE.Scene = null!
      let attachedMesh: Instance = null!
      let detachedMesh: Instance = null!

      await act(async () => {
        scene = createRoot(canvas)
          .render(
            <hasObject3dMethods>
              <mesh attach={(parent) => ((attachedMesh = parent), () => (detachedMesh = parent))} />
            </hasObject3dMethods>,
          )
          .getState().scene
      })

      expect(attachedMesh).toBeDefined()
      expect(attachedMesh?.type).toBe('Object3D')
      // attaching is *instead of* being a regular child
      expect(scene.children[0].children.length).toBe(0)

      await act(async () => {
        createRoot(canvas).render(<hasObject3dMethods />)
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
      createRoot(canvas).render(<Log key="foo" name="Foo" />)
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
      state = createRoot(canvas)
        .render(<EventfulComponent />)
        .getState()
    })
    expect(state.internal.interaction.length).toBe(0)

    // Test initial mount with events
    attachEvents = true
    await act(async () => {
      state = createRoot(canvas)
        .render(<EventfulComponent />)
        .getState()
    })
    expect(state.internal.interaction.length).not.toBe(0)

    // Test events update
    attachEvents = false
    await act(async () => {
      state = createRoot(canvas)
        .render(<EventfulComponent />)
        .getState()
    })
    expect(state.internal.interaction.length).toBe(0)

    attachEvents = true
    await act(async () => {
      state = createRoot(canvas)
        .render(<EventfulComponent />)
        .getState()
    })
    expect(state.internal.interaction.length).not.toBe(0)

    // Test unmount with events
    mounted = false
    await act(async () => {
      state = createRoot(canvas)
        .render(<EventfulComponent />)
        .getState()
    })
    expect(state.internal.interaction.length).toBe(0)
  })

  it('will create an identical instance when reconstructing', async () => {
    let state: RootState = null!
    const instances: { uuid: string; parentUUID?: string; childUUID?: string }[] = []

    const Test = ({ n }: { n: number }) => (
      // @ts-ignore args isn't a valid prop but changing it will swap
      <group args={[n]} onPointerOver={() => null}>
        <group />
      </group>
    )

    await act(async () => {
      state = createRoot(canvas)
        .render(<Test n={1} />)
        .getState()
    })

    instances.push({
      uuid: state.scene.children[0].uuid,
      parentUUID: state.scene.children[0].parent?.uuid,
      childUUID: state.scene.children[0].children[0]?.uuid,
    })

    await act(async () => {
      state = createRoot(canvas)
        .render(<Test n={2} />)
        .getState()
    })

    instances.push({
      uuid: state.scene.children[0].uuid,
      parentUUID: state.scene.children[0].parent?.uuid,
      childUUID: state.scene.children[0].children[0]?.uuid,
    })

    const [oldInstance, newInstance] = instances

    // Created a new instance
    expect(oldInstance.uuid).not.toBe(newInstance.uuid)

    // Preserves scene hierarchy
    expect(oldInstance.parentUUID).toBe(newInstance.parentUUID)
    expect(oldInstance.childUUID).toBe(newInstance.childUUID)

    // Rebinds events
    expect(state.internal.interaction.length).not.toBe(0)
  })

  it('will make an Orthographic Camera & set the position', async () => {
    let camera: THREE.Camera = null!

    await act(async () => {
      camera = createRoot(canvas)
        .configure({ orthographic: true, camera: { position: [0, 0, 5] } })
        .render(<group />)
        .getState().camera
    })

    expect(camera.type).toEqual('OrthographicCamera')
    expect(camera.position.z).toEqual(5)
  })

  it('should handle an performance changing functions', async () => {
    let state: UseBoundStore<RootState> = null!
    await act(async () => {
      state = createRoot(canvas)
        .configure({ dpr: [1, 2], performance: { min: 0.2 } })
        .render(<group />)
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
    let state: UseBoundStore<RootState> = null!
    await act(async () => {
      state = createRoot(canvas)
        .configure({ shadows: true })
        .render(<group />)
    })

    expect(state.getState().gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputEncoding to sRGBEncoding if linear is false', async () => {
    let state: UseBoundStore<RootState> = null!
    await act(async () => {
      state = createRoot(canvas)
        .configure({ linear: false })
        .render(<group />)
    })

    expect(state.getState().gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(state.getState().gl.outputEncoding).toBe(THREE.sRGBEncoding)
  })

  it('should toggle render mode in xr', async () => {
    let state: RootState = null!

    await act(async () => {
      state = createRoot(canvas)
        .render(<group />)
        .getState()
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
      const state = createRoot(canvas)
        .configure({ frameloop: 'never' })
        .render(<TestGroup />)
        .getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('will render components that are extended', async () => {
    class MyColor extends THREE.Color {
      constructor(col: number) {
        super(col)
      }
    }

    const testExtend = async () => {
      await act(async () => {
        extend({ MyColor })

        // @ts-ignore we're testing the extend feature, i'm not adding it to the namespace
        createRoot(canvas).render(<myColor args={[0x0000ff]} />)
      })
    }

    expect(() => testExtend()).not.toThrow()
  })

  it('should set renderer props via gl prop', async () => {
    let gl: THREE.WebGLRenderer = null!
    await act(async () => {
      gl = createRoot(canvas)
        .configure({ gl: { physicallyCorrectLights: true } })
        .render(<group />)
        .getState().gl
    })

    expect(gl.physicallyCorrectLights).toBe(true)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends THREE.WebGLRenderer {}

    let gl: Renderer = null!
    await act(async () => {
      gl = createRoot(canvas)
        .configure({ gl: (canvas) => new Renderer({ canvas }) })
        .render(<group />)
        .getState().gl
    })

    expect(gl instanceof Renderer).toBe(true)
  })

  it('should respect color management preferences via gl', async () => {
    let gl: THREE.WebGLRenderer = null!
    await act(async () => {
      gl = createRoot(canvas)
        .configure({ gl: { outputEncoding: THREE.LinearEncoding, toneMapping: THREE.NoToneMapping } })
        .render(<group />)
        .getState().gl
    })

    expect(gl.outputEncoding).toBe(THREE.LinearEncoding)
    expect(gl.toneMapping).toBe(THREE.NoToneMapping)

    await act(async () => {
      gl = createRoot(canvas)
        .configure({ flat: true, linear: true })
        .render(<group />)
        .getState().gl
    })
    expect(gl.outputEncoding).toBe(THREE.LinearEncoding)
    expect(gl.toneMapping).toBe(THREE.NoToneMapping)
  })

  it('should respect legacy prop', async () => {
    let gl: THREE.WebGLRenderer = null!
    await act(async () => {
      gl = createRoot(canvas)
        .configure({ legacy: true })
        .render(<group />)
        .getState().gl
    })

    expect((THREE as any).ColorManagement.legacyMode).toBe(true)

    await act(async () => {
      gl = createRoot(canvas)
        .configure({ legacy: false })
        .render(<group />)
        .getState().gl
    })
    expect((THREE as any).ColorManagement.legacyMode).toBe(false)
  })
})
