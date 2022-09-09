import * as React from 'react'
import * as THREE from 'three'
import {
  ReconcilerRoot,
  createRoot,
  act,
  useFrame,
  extend,
  ReactThreeFiber,
  useThree,
  createPortal,
} from '../src/index'
import { UseBoundStore } from 'zustand'
import { privateKeys, RootState } from '../src/core/store'

type ComponentMesh = THREE.Mesh<THREE.BoxBufferGeometry, THREE.MeshBasicMaterial>

interface ObjectWithBackground extends THREE.Object3D {
  background: THREE.Color
}

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

class MyColor extends THREE.Color {
  constructor(col: number) {
    super(col)
  }
}

extend({ HasObject3dMember, HasObject3dMethods })

declare module '@react-three/fiber' {
  interface ThreeElements {
    hasObject3dMember: ReactThreeFiber.Node<HasObject3dMember, typeof HasObject3dMember>
    hasObject3dMethods: ReactThreeFiber.Node<HasObject3dMethods, typeof HasObject3dMethods>
    myColor: ReactThreeFiber.Node<MyColor, typeof MyColor>
  }
}

beforeAll(() => {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: 2,
  })
})

describe('renderer', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => (root = createRoot(document.createElement('canvas'))))
  afterEach(async () => act(async () => root.unmount()))

  it('renders a simple component', async () => {
    const Mesh = () => (
      <mesh>
        <boxGeometry args={[2, 2]} />
        <meshBasicMaterial />
      </mesh>
    )
    const store = await act(async () => root.render(<Mesh />))
    const { scene } = store.getState()

    expect(scene.children[0].type).toEqual('Mesh')
    expect((scene.children[0] as ComponentMesh).geometry.type).toEqual('BoxGeometry')
    expect((scene.children[0] as ComponentMesh).material.type).toEqual('MeshBasicMaterial')
    expect((scene.children[0] as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>).material.type).toEqual(
      'MeshBasicMaterial',
    )
  })

  it('renders an empty scene', async () => {
    const Empty = () => null

    const store = await act(async () => root.render(<Empty />))
    const { scene } = store.getState()

    expect(scene.type).toEqual('Scene')
    expect(scene.children).toEqual([])
  })

  it('can render a composite component', async () => {
    const Child = () => (
      <mesh>
        <boxGeometry args={[2, 2]} />
        <meshBasicMaterial />
      </mesh>
    )

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

    const store = await act(async () => root.render(<Parent />))
    const { scene } = store.getState()

    const parent = scene.children[0] as ObjectWithBackground
    expect(parent).toBeInstanceOf(THREE.Group)
    expect(parent.background.getStyle()).toEqual('rgb(0,0,0)')

    const child = parent.children[0] as ComponentMesh
    expect(child).toBeInstanceOf(THREE.Mesh)
    expect(child.geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect(child.material).toBeInstanceOf(THREE.MeshBasicMaterial)
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

    const store = await act(async () => root.render(<Component />))
    const { scene } = store.getState()

    expect(scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  it('updates types & names', async () => {
    const store = await act(async () =>
      root.render(
        <mesh>
          <meshBasicMaterial name="basicMat">
            <color attach="color" args={[0, 0, 0]} />
          </meshBasicMaterial>
        </mesh>,
      ),
    )
    const { scene } = store.getState()

    const basic = scene.children[0] as ComponentMesh
    expect(basic.material).toBeInstanceOf(THREE.MeshBasicMaterial)
    expect(basic.material.name).toBe('basicMat')
    expect(basic.material.color.toArray()).toStrictEqual([0, 0, 0])

    await act(async () =>
      root.render(
        <mesh>
          <meshStandardMaterial name="standardMat">
            <color attach="color" args={[255, 255, 255]} />
          </meshStandardMaterial>
        </mesh>,
      ),
    )

    const standard = scene.children[0] as ComponentMesh
    expect(standard.material).toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(standard.material.name).toBe('standardMat')
    expect(standard.material.color.toArray()).toStrictEqual([255, 255, 255])
  })

  it('should forward ref three object', async () => {
    // Note: Passing directly should be less strict, and assigning current should be more strict
    let immutableRef!: React.RefObject<THREE.Mesh>
    let mutableRef!: React.MutableRefObject<THREE.Mesh | null>
    let mutableRefSpecific!: React.MutableRefObject<THREE.Mesh | null>

    const RefTest = () => {
      immutableRef = React.createRef()
      mutableRef = React.useRef(null)
      mutableRefSpecific = React.useRef(null)

      return (
        <>
          <mesh ref={immutableRef} />
          <mesh ref={mutableRef} />
          <mesh ref={(r) => (mutableRefSpecific.current = r)} />
        </>
      )
    }

    await act(async () => root.render(<RefTest />))

    expect(immutableRef.current).toBeInstanceOf(THREE.Mesh)
    expect(mutableRef.current).toBeInstanceOf(THREE.Mesh)
    expect(mutableRefSpecific.current).toBeInstanceOf(THREE.Mesh)
  })

  it('attaches children that use attach', async () => {
    const store = await act(async () =>
      root.render(
        <hasObject3dMember>
          <mesh attach="attachment" />
        </hasObject3dMember>,
      ),
    )
    const { scene } = store.getState()

    const object = scene.children[0] as HasObject3dMember
    expect(object.attachment).toBeInstanceOf(THREE.Mesh)
    expect(object.children.length).toBe(0)
  })

  describe('attaches children that use attachFns', () => {
    it('attachFns with cleanup', async () => {
      const store = await act(async () =>
        root.render(
          <hasObject3dMethods>
            <mesh attach={(parent, self) => (parent.customAttach(self), () => parent.detach(self))} />
          </hasObject3dMethods>,
        ),
      )
      const { scene } = store.getState()

      // Attach
      const object = scene.children[0] as HasObject3dMethods
      expect(object.attachedObj3d).toBeInstanceOf(THREE.Mesh)
      expect(object.children.length).toBe(0)

      // Detach
      expect(object.detachedObj3d).toBeUndefined()
      await act(async () => root.render(<hasObject3dMethods />))
      expect(object.detachedObj3d).toBeInstanceOf(THREE.Mesh)
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

    await act(async () => root.render(<Log key="foo" name="Foo" />))
    await act(async () => root.unmount())

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
      state = root.render(<EventfulComponent />).getState()
    })
    expect(state.internal.interaction.length).toBe(0)

    // Test initial mount with events
    attachEvents = true
    await act(async () => {
      state = root.render(<EventfulComponent />).getState()
    })
    expect(state.internal.interaction.length).not.toBe(0)

    // Test events update
    attachEvents = false
    await act(async () => {
      state = root.render(<EventfulComponent />).getState()
    })
    expect(state.internal.interaction.length).toBe(0)

    attachEvents = true
    await act(async () => {
      state = root.render(<EventfulComponent />).getState()
    })
    expect(state.internal.interaction.length).not.toBe(0)

    // Test unmount with events
    mounted = false
    await act(async () => {
      state = root.render(<EventfulComponent />).getState()
    })
    expect(state.internal.interaction.length).toBe(0)
  })

  it('will create an identical instance when reconstructing', async () => {
    const instances: { uuid: string; parentUUID?: string; childUUID?: string }[] = []

    const object1 = new THREE.Group()
    const object2 = new THREE.Group()

    const Test = ({ first }: { first?: boolean }) => (
      <primitive object={first ? object1 : object2} onPointerOver={() => null}>
        <group />
      </primitive>
    )

    const store = await act(async () => root.render(<Test first />))
    const { scene, internal } = store.getState()

    instances.push({
      uuid: scene.children[0].uuid,
      parentUUID: scene.children[0].parent?.uuid,
      childUUID: scene.children[0].children[0]?.uuid,
    })
    expect(scene.children[0]).toBe(object1)

    await act(async () => root.render(<Test />))

    instances.push({
      uuid: scene.children[0].uuid,
      parentUUID: scene.children[0].parent?.uuid,
      childUUID: scene.children[0].children[0]?.uuid,
    })

    const [oldInstance, newInstance] = instances

    // Swapped to new instance
    expect(scene.children[0]).toBe(object2)

    // Preserves scene hierarchy
    expect(oldInstance.parentUUID).toBe(newInstance.parentUUID)
    expect(oldInstance.childUUID).toBe(newInstance.childUUID)

    // Rebinds events
    expect(internal.interaction.length).not.toBe(0)
  })

  it('can swap primitives', async () => {
    const o1 = new THREE.Group()
    o1.add(new THREE.Group())
    const o2 = new THREE.Group()

    const Test = ({ n }: { n: number }) => (
      <primitive object={n === 1 ? o1 : o2}>
        <group attach="test" />
      </primitive>
    )

    const store = await act(async () => root.render(<Test n={1} />))
    const { scene } = store.getState()

    // Initial object is added with children and attachments
    expect(scene.children[0]).toBe(o1)
    expect(scene.children[0].children.length).toBe(1)
    expect((scene.children[0] as any).test).toBeInstanceOf(THREE.Group)

    await act(async () => root.render(<Test n={2} />))

    // Swapped to object 2, does not copy old children, copies attachments
    expect(scene.children[0]).toBe(o2)
    expect(scene.children[0].children.length).toBe(0)
    expect((scene.children[0] as any).test).toBeInstanceOf(THREE.Group)
  })

  it('will make an Orthographic Camera & set the position', async () => {
    const store = await act(async () =>
      root.configure({ orthographic: true, camera: { position: [0, 0, 5] } }).render(<group />),
    )
    const { camera } = store.getState()

    expect(camera).toBeInstanceOf(THREE.OrthographicCamera)
    expect(camera.position.z).toEqual(5)
  })

  it('should handle an performance changing functions', async () => {
    let state: UseBoundStore<RootState> = null!
    await act(async () => {
      state = root.configure({ dpr: [1, 2], performance: { min: 0.2 } }).render(<group />)
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
    const store = await act(async () => root.configure({ shadows: true }).render(<group />))
    const { gl } = store.getState()

    expect(gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputEncoding to sRGBEncoding if linear is false', async () => {
    const store = await act(async () => root.configure({ linear: false }).render(<group />))
    const { gl } = store.getState()

    expect(gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(gl.outputEncoding).toBe(THREE.sRGBEncoding)
  })

  it('should toggle render mode in xr', async () => {
    let state: RootState = null!

    await act(async () => {
      state = root.render(<group />).getState()
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

    const Test = () => useFrame(() => (respected = false))

    await act(async () => {
      const state = root
        .configure({ frameloop: 'never' })
        .render(<Test />)
        .getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('will render components that are extended', async () => {
    extend({ MyColor })

    const store = await act(async () => root.render(<myColor attach="myColor" args={[0x0000ff]} />))
    const { scene } = store.getState()

    const { myColor } = scene as THREE.Scene & { myColor: MyColor }
    expect(myColor).toBeInstanceOf(MyColor)
    expect(myColor.toArray()).toStrictEqual([0, 0, 1])
  })

  it('should set renderer props via gl prop', async () => {
    const store = await act(async () => root.configure({ gl: { physicallyCorrectLights: true } }).render(<group />))
    const { gl } = store.getState()

    expect(gl.physicallyCorrectLights).toBe(true)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends THREE.WebGLRenderer {}

    const store = await act(async () => root.configure({ gl: (canvas) => new Renderer({ canvas }) }).render(<group />))
    const { gl } = store.getState()

    expect(gl instanceof Renderer).toBe(true)
  })

  it('should respect color management preferences via gl', async () => {
    const store = await act(async () =>
      root
        .configure({ gl: { outputEncoding: THREE.LinearEncoding, toneMapping: THREE.NoToneMapping } })
        .render(<group />),
    )
    const { gl } = store.getState()

    expect(gl.outputEncoding).toBe(THREE.LinearEncoding)
    expect(gl.toneMapping).toBe(THREE.NoToneMapping)

    await act(async () => root.configure({ flat: true, linear: true }).render(<group />))
    expect(gl.outputEncoding).toBe(THREE.LinearEncoding)
    expect(gl.toneMapping).toBe(THREE.NoToneMapping)
  })

  it('should respect legacy prop', async () => {
    await act(async () => root.configure({ legacy: true }).render(<group />))
    expect((THREE as any).ColorManagement.legacyMode).toBe(true)

    await act(async () => root.configure({ legacy: false }).render(<group />))
    expect((THREE as any).ColorManagement.legacyMode).toBe(false)
  })

  it('can handle createPortal', async () => {
    const scene = new THREE.Scene()

    let state: RootState = null!
    let portalState: RootState = null!

    const Normal = () => {
      const three = useThree()
      state = three

      return <group />
    }

    const Portal = () => {
      const three = useThree()
      portalState = three

      return <group />
    }

    await act(async () => {
      root.render(
        <>
          <Normal />
          {createPortal(<Portal />, scene, { scene })}
        </>,
      )
    })

    // Renders into portal target
    expect(scene.children.length).not.toBe(0)

    // Creates an isolated state enclave
    expect(state.scene).not.toBe(scene)
    expect(portalState.scene).toBe(scene)

    // Preserves internal keys
    const overwrittenKeys = ['get', 'set', 'events', 'size', 'viewport']
    const respectedKeys = privateKeys.filter((key) => overwrittenKeys.includes(key) || state[key] === portalState[key])
    expect(respectedKeys).toStrictEqual(privateKeys)
  })

  it('can handle createPortal on unmounted container', async () => {
    let groupHandle!: THREE.Group | null
    function Test(props: any) {
      const [group, setGroup] = React.useState(null)
      groupHandle = group

      return (
        <group {...props} ref={setGroup}>
          {group && createPortal(<mesh />, group)}
        </group>
      )
    }

    await act(async () => root.render(<Test key={0} />))

    expect(groupHandle).toBeDefined()
    const prevUUID = groupHandle!.uuid

    await act(async () => root.render(<Test key={1} />))

    expect(groupHandle).toBeDefined()
    expect(prevUUID).not.toBe(groupHandle!.uuid)
  })
})
