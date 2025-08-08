import * as React from 'react'
import * as THREE from 'three'
import * as Stdlib from 'three-stdlib'
import { TextEncoder } from 'util'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'

import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  act,
  useFrame,
  extend,
  ReactThreeFiber,
  useThree,
  createPortal,
  useLoader,
} from '../../src/index'
import { UseBoundStore } from 'zustand'
import { privateKeys, RootState } from '../../src/core/store'
import { Instance } from '../../src/core/renderer'

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

const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

function createRoot() {
  const canvas = createCanvas()
  const root = createRootImpl(canvas)
  roots.push(root)
  return root
}

describe('renderer', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot()
  })

  afterEach(() => {
    while (roots.length) {
      roots.shift()!.unmount()
    }
  })

  it('renders a simple component', async () => {
    const Mesh = () => {
      return (
        <mesh>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = root.render(<Mesh />).getState().scene
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
      scene = root.render(<Empty />).getState().scene
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
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    let scene: THREE.Scene = null!
    await act(async () => {
      scene = root.render(<Parent />).getState().scene
    })

    expect(scene.children[0].type).toEqual('Group')
    expect((scene.children[0] as ObjectWithBackground).background.getStyle()).toEqual('rgb(0,0,0)')
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
      scene = root.render(<Component />).getState().scene
    })

    expect(scene.children[0].position.x).toEqual(7)
    expect(renders).toBe(6)
  })

  it('updates types & names', async () => {
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = root
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
      scene = root
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

    await act(async () => {
      root.render(<RefTest />)
    })

    expect(immutableRef.current).toBeTruthy()
    expect(mutableRef.current).toBeTruthy()
    expect(mutableRefSpecific.current).toBeTruthy()
  })

  it('attaches Object3D children that use attach', async () => {
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = root
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
      scene = root
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
        scene = root
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
        root.render(<hasObject3dMethods />)
      })

      const detachedMesh = (scene.children[0] as HasObject3dMethods).detachedObj3d
      expect(detachedMesh).toBe(attachedMesh)
    })

    it('attachFns as functions', async () => {
      let scene: THREE.Scene = null!
      let attachedMesh: Instance = null!
      let detachedMesh: Instance = null!

      await act(async () => {
        scene = root
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
        root.render(<hasObject3dMethods />)
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
      root.render(<Log key="foo" name="Foo" />)
    })

    await act(async () => {
      root.unmount()
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
    let state: RootState = null!
    const instances: { uuid: string; parentUUID?: string; childUUID?: string }[] = []

    const object1 = new THREE.Group()
    const object2 = new THREE.Group()

    const Test = ({ first }: { first?: boolean }) => (
      <primitive object={first ? object1 : object2} onPointerOver={() => null}>
        <group />
      </primitive>
    )

    await act(async () => {
      state = root.render(<Test first />).getState()
    })

    instances.push({
      uuid: state.scene.children[0].uuid,
      parentUUID: state.scene.children[0].parent?.uuid,
      childUUID: state.scene.children[0].children[0]?.uuid,
    })
    expect(state.scene.children[0]).toBe(object1)

    await act(async () => {
      state = root.render(<Test />).getState()
    })

    instances.push({
      uuid: state.scene.children[0].uuid,
      parentUUID: state.scene.children[0].parent?.uuid,
      childUUID: state.scene.children[0].children[0]?.uuid,
    })

    const [oldInstance, newInstance] = instances

    // Swapped to new instance
    expect(state.scene.children[0]).toBe(object2)

    // Preserves scene hierarchy
    expect(oldInstance.parentUUID).toBe(newInstance.parentUUID)
    expect(oldInstance.childUUID).toBe(newInstance.childUUID)

    // Rebinds events
    expect(state.internal.interaction.length).not.toBe(0)
  })

  it('can swap primitives', async () => {
    let state: RootState = null!

    const o1 = new THREE.Group()
    o1.add(new THREE.Group())
    const o2 = new THREE.Group()

    const Test = ({ n }: { n: number }) => (
      <primitive object={n === 1 ? o1 : o2}>
        <group attach="test" />
      </primitive>
    )

    await act(async () => {
      state = root.render(<Test n={1} />).getState()
    })

    // Initial object is added with children and attachments
    expect(state.scene.children[0]).toBe(o1)
    expect(state.scene.children[0].children.length).toBe(1)
    expect((state.scene.children[0] as any).test).toBeInstanceOf(THREE.Group)

    await act(async () => {
      state = root.render(<Test n={2} />).getState()
    })

    // Swapped to object 2, does not copy old children, copies attachments
    expect(state.scene.children[0]).toBe(o2)
    expect(state.scene.children[0].children.length).toBe(0)
    expect((state.scene.children[0] as any).test).toBeInstanceOf(THREE.Group)
  })

  it('can swap 4 array primitives', async () => {
    let state: RootState = null!
    const a = new THREE.Group()
    const b = new THREE.Group()
    const c = new THREE.Group()
    const d = new THREE.Group()
    const array = [a, b, c, d]

    const Test = ({ array }: { array: THREE.Group[] }) => (
      <>
        {array.map((group, i) => (
          <primitive key={i} object={group} />
        ))}
      </>
    )

    await act(async () => {
      state = root.render(<Test array={array} />).getState()
    })

    expect(state.scene.children[0]).toBe(a)
    expect(state.scene.children[1]).toBe(b)
    expect(state.scene.children[2]).toBe(c)
    expect(state.scene.children[3]).toBe(d)

    const reversedArray = [...array.reverse()]

    await act(async () => {
      state = root.render(<Test array={reversedArray} />).getState()
    })

    expect(state.scene.children[0]).toBe(d)
    expect(state.scene.children[1]).toBe(c)
    expect(state.scene.children[2]).toBe(b)
    expect(state.scene.children[3]).toBe(a)

    const mixedArray = [b, a, d, c]

    await act(async () => {
      state = root.render(<Test array={mixedArray} />).getState()
    })

    expect(state.scene.children[0]).toBe(b)
    expect(state.scene.children[1]).toBe(a)
    expect(state.scene.children[2]).toBe(d)
    expect(state.scene.children[3]).toBe(c)
  })

  it('will make an Orthographic Camera & set the position', async () => {
    let camera: THREE.Camera = null!

    await act(async () => {
      camera = root
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
    let state: UseBoundStore<RootState> = null!
    await act(async () => {
      state = root.configure({ shadows: true }).render(<group />)
    })

    expect(state.getState().gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputEncoding to sRGBEncoding if linear is false', async () => {
    let state: UseBoundStore<RootState> = null!
    await act(async () => {
      state = root.configure({ linear: false }).render(<group />)
    })

    expect(state.getState().gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(state.getState().gl.outputEncoding).toBe(THREE.sRGBEncoding)
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

    await act(async () => {
      const TestGroup = () => {
        useFrame(() => (respected = false))
        return <group />
      }
      const state = root
        .configure({ frameloop: 'never' })
        .render(<TestGroup />)
        .getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('will render components that are extended', async () => {
    const testExtend = async () => {
      await act(async () => {
        extend({ MyColor })

        root.render(<myColor args={[0x0000ff]} />)
      })
    }

    expect(() => testExtend()).not.toThrow()
  })

  it('should set renderer props via gl prop', async () => {
    let gl: THREE.WebGLRenderer = null!
    await act(async () => {
      gl = root
        .configure({ gl: { physicallyCorrectLights: true } })
        .render(<group />)
        .getState().gl
    })

    expect(gl.physicallyCorrectLights).toBe(true)
  })

  it('should update scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    await act(async () => {
      scene = root
        .configure({ scene: { name: 'test' } })
        .render(<group />)
        .getState().scene
    })

    expect(scene.name).toBe('test')
  })

  it('should set a custom scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    const prop = new THREE.Scene()

    await act(async () => {
      scene = root
        .configure({ scene: prop })
        .render(<group />)
        .getState().scene
    })

    expect(prop).toBe(scene)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends THREE.WebGLRenderer {}

    let gl: Renderer = null!
    await act(async () => {
      gl = root
        .configure({ gl: (canvas) => new Renderer({ canvas }) })
        .render(<group />)
        .getState().gl
    })

    expect(gl instanceof Renderer).toBe(true)
  })

  it('should respect color management preferences via gl', async () => {
    let gl: THREE.WebGLRenderer & { outputColorSpace?: string } = null!
    let texture: THREE.Texture & { colorSpace?: string } = null!

    let key = 0
    function Test({ colorSpace = false }) {
      gl = useThree((state) => state.gl)
      texture = new THREE.Texture()
      return <meshBasicMaterial key={key++} map={texture} />
    }

    const LinearEncoding = 3000
    const sRGBEncoding = 3001

    await act(async () => createRoot().render(<Test />))
    expect(gl.outputEncoding).toBe(sRGBEncoding)
    expect(gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(texture.encoding).toBe(sRGBEncoding)

    // @ts-ignore
    THREE.WebGLRenderer.prototype.outputColorSpace ??= ''
    // @ts-ignore
    THREE.Texture.prototype.colorSpace ??= ''

    await act(async () =>
      createRoot()
        .configure({ linear: true, flat: true })
        .render(<Test />),
    )
    expect(gl.outputEncoding).toBe(LinearEncoding)
    expect(gl.toneMapping).toBe(THREE.NoToneMapping)
    expect(texture.encoding).toBe(LinearEncoding)

    // Sets outputColorSpace since r152
    const SRGBColorSpace = 'srgb'
    const LinearSRGBColorSpace = 'srgb-linear'

    await act(async () =>
      createRoot()
        .configure({ linear: true })
        .render(<Test colorSpace />),
    )
    expect(gl.outputColorSpace).toBe(LinearSRGBColorSpace)
    expect(texture.colorSpace).toBe(LinearSRGBColorSpace)

    await act(async () =>
      createRoot()
        .configure({ linear: false })
        .render(<Test colorSpace />),
    )
    expect(gl.outputColorSpace).toBe(SRGBColorSpace)
    expect(texture.colorSpace).toBe(SRGBColorSpace)

    // @ts-ignore
    delete THREE.WebGLRenderer.prototype.outputColorSpace
    // @ts-ignore
    delete THREE.Texture.prototype.colorSpace
  })

  it('should respect legacy prop', async () => {
    // <= r138 internal fallback
    const material = React.createRef<THREE.MeshBasicMaterial>()
    extend({ ColorManagement: null })
    await act(async () => root.render(<meshBasicMaterial ref={material} color="#111111" />))
    expect((THREE as any).ColorManagement.legacyMode).toBe(false)
    expect(material.current!.color.toArray()).toStrictEqual(new THREE.Color('#111111').convertSRGBToLinear().toArray())
    extend({ ColorManagement: (THREE as any).ColorManagement })

    // r139 legacyMode
    await act(async () => {
      root.configure({ legacy: true }).render(<group />)
    })
    expect((THREE as any).ColorManagement.legacyMode).toBe(true)

    await act(async () => {
      root.configure({ legacy: false }).render(<group />)
    })
    expect((THREE as any).ColorManagement.legacyMode).toBe(false)

    // r150 !enabled
    ;(THREE as any).ColorManagement.enabled = true

    await act(async () => {
      root.configure({ legacy: true }).render(<group />)
    })
    expect((THREE as any).ColorManagement.enabled).toBe(false)

    await act(async () => {
      root.configure({ legacy: false }).render(<group />)
    })
    expect((THREE as any).ColorManagement.enabled).toBe(true)
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

  it('invalidates pierced props when root is changed', async () => {
    const material = React.createRef<THREE.MeshBasicMaterial>()
    const texture1 = { needsUpdate: false, name: '' } as THREE.Texture
    const texture2 = { needsUpdate: false, name: '' } as THREE.Texture

    await act(async () =>
      root.render(<meshBasicMaterial ref={material} map={texture1} map-needsUpdate={true} map-name="test" />),
    )

    expect(material.current!.map).toBe(texture1)
    expect(texture1.needsUpdate).toBe(true)
    expect(texture1.name).toBe('test')

    await act(async () =>
      root.render(<meshBasicMaterial ref={material} map={texture2} map-needsUpdate={true} map-name="test" />),
    )

    expect(material.current!.map).toBe(texture2)
    expect(texture2.needsUpdate).toBe(true)
    expect(texture2.name).toBe('test')
  })

  // https://github.com/mrdoob/three.js/issues/21209
  it("can handle HMR default where three.js isn't reliable", async () => {
    const ref = React.createRef<THREE.Mesh>()

    function Test() {
      const [scale, setScale] = React.useState(true)
      const props: any = {}
      if (scale) props.scale = 0.5
      React.useEffect(() => void setScale(false), [])
      return <mesh ref={ref} {...props} />
    }

    await act(async () => root.render(<Test />))

    expect(ref.current!.scale.toArray()).toStrictEqual(new THREE.Object3D().scale.toArray())
  })

  it("onUpdate shouldn't update itself", async () => {
    const one = jest.fn()
    const two = jest.fn()

    const Test = (props: Partial<JSX.IntrinsicElements['mesh']>) => <mesh {...props} />
    await act(async () => root.render(<Test onUpdate={one} />))
    await act(async () => root.render(<Test onUpdate={two} />))

    expect(one).toBeCalledTimes(1)
    expect(two).toBeCalledTimes(0)
  })

  it("camera props shouldn't overwrite state", async () => {
    const camera = new THREE.OrthographicCamera()

    function Test() {
      const set = useThree((state) => state.set)
      React.useMemo(() => set({ camera }), [set])
      return null
    }

    const store = await act(async () => root.render(<Test />))
    expect(store.getState().camera).toBe(camera)

    root.configure({ camera: { name: 'test' } })

    await act(async () => root.render(<Test />))
    expect(store.getState().camera).toBe(camera)
    expect(camera.name).not.toBe('test')
  })

  it('should safely handle updates to the object prop', async () => {
    const ref = React.createRef<THREE.Object3D>()
    const child = React.createRef<THREE.Object3D>()
    const attachedChild = React.createRef<THREE.Object3D>()

    const Test = (props: JSX.IntrinsicElements['primitive']) => (
      <primitive {...props} ref={ref}>
        <object3D ref={child} />
        <object3D ref={attachedChild} attach="userData-attach" />
      </primitive>
    )

    const object1 = new THREE.Object3D()
    const child1 = new THREE.Object3D()
    object1.add(child1)

    const object2 = new THREE.Object3D()
    const child2 = new THREE.Object3D()
    object2.add(child2)

    // Initial
    await act(async () => root.render(<Test object={object1} />))
    expect(ref.current).toBe(object1)
    expect(ref.current!.children).toStrictEqual([child1, child.current])
    expect(ref.current!.userData.attach).toBe(attachedChild.current)

    // Update
    await act(async () => root.render(<Test object={object2} />))
    expect(ref.current).toBe(object2)
    expect(ref.current!.children).toStrictEqual([child2, child.current])
    expect(ref.current!.userData.attach).toBe(attachedChild.current)

    // Revert
    await act(async () => root.render(<Test object={object1} />))
    expect(ref.current).toBe(object1)
    expect(ref.current!.children).toStrictEqual([child1, child.current])
    expect(ref.current!.userData.attach).toBe(attachedChild.current)
  })

  it('should recursively dispose of declarative children', async () => {
    const parentDispose = jest.fn()
    const childDispose = jest.fn()

    await act(async () =>
      root.render(
        <mesh dispose={parentDispose}>
          <mesh dispose={childDispose} />
        </mesh>,
      ),
    )
    await act(async () => root.render(null))

    expect(parentDispose).toBeCalledTimes(1)
    expect(childDispose).toBeCalledTimes(1)
  })

  it('should not recursively dispose of flagged parent', async () => {
    const parentDispose = jest.fn()
    const childDispose = jest.fn()

    await act(async () =>
      root.render(
        <group dispose={null}>
          <mesh dispose={parentDispose}>
            <mesh dispose={childDispose} />
          </mesh>
        </group>,
      ),
    )
    await act(async () => root.render(null))

    expect(parentDispose).not.toBeCalled()
    expect(childDispose).not.toBeCalled()
  })

  it('should not recursively dispose of attached primitives', async () => {
    const meshDispose = jest.fn()
    const primitiveDispose = jest.fn()

    await act(async () =>
      root.render(
        <mesh dispose={meshDispose}>
          <primitive dispose={primitiveDispose} object={new THREE.BufferGeometry()} attach="geometry" />
        </mesh>,
      ),
    )
    await act(async () => root.render(null))

    expect(meshDispose).toBeCalledTimes(1)
    expect(primitiveDispose).not.toBeCalled()
  })

  it('preserves camera frustum props for perspective', async () => {
    const store = await act(async () => root.configure({ camera: { aspect: 0 } }).render(null))
    expect(store.getState().camera.aspect).toBe(0)
  })

  it('preserves camera frustum props for orthographic', async () => {
    const store = await act(async () =>
      root.configure({ orthographic: true, camera: { left: 0, right: 0, top: 0, bottom: 0 } }).render(null),
    )
    expect(store.getState().camera.left).toBe(0)
    expect(store.getState().camera.right).toBe(0)
    expect(store.getState().camera.top).toBe(0)
    expect(store.getState().camera.bottom).toBe(0)
  })

  it('should load a model with GLTFLoader', async () => {
    // 1. Create minimal GLB buffer
    const jsonString = '{"asset":{"version":"2.0"},"scenes":[{"nodes":[0]}],"nodes":[{}]}'
    const jsonBuffer = new TextEncoder().encode(jsonString)
    const jsonChunkLength = jsonBuffer.length
    const totalLength = 12 + 8 + jsonChunkLength
    const glbBuffer = new ArrayBuffer(totalLength)
    const dataView = new DataView(glbBuffer)
    dataView.setUint32(0, 0x46546c67, true) // 'glTF'
    dataView.setUint32(4, 2, true) // version
    dataView.setUint32(8, totalLength, true) // total length
    dataView.setUint32(12, jsonChunkLength, true) // chunk length
    dataView.setUint32(16, 0x4e4f534a, true) // 'JSON'
    new Uint8Array(glbBuffer).set(jsonBuffer, 20)

    // 2. Mock fetch
    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(async () => {
      return new Response(glbBuffer)
    })

    // 3. The component that uses the loader
    const Component = () => {
      const gltf = useLoader(Stdlib.GLTFLoader, '/model.glb')
      return <primitive object={gltf.scene} />
    }

    // 4. Render and assert
    let scene: THREE.Scene = null!
    await act(async () => {
      scene = root
        .render(
          <React.Suspense fallback={null}>
            <Component />
          </React.Suspense>,
        )
        .getState().scene
    })

    expect(scene.children[0]).toBeInstanceOf(THREE.Group)
    expect(scene.children[0].name).toBe('')

    // 5. Restore fetch
    mockFetch.mockRestore()
  })
})
