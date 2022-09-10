import * as React from 'react'
import * as THREE from 'three'
import {
  ReconcilerRoot,
  createRoot,
  act,
  useFrame,
  extend,
  ThreeElement,
  useThree,
  createPortal,
  RootState,
} from '../src/index'
import { UseBoundStore } from 'zustand'
import { privateKeys } from '../src/core/store'
import { suspend } from 'suspend-react'

class CustomElement extends THREE.Object3D {}

declare module '@react-three/fiber' {
  interface ThreeElements {
    customElement: ThreeElement<typeof CustomElement>
  }
}

extend({ CustomElement })

type ComponentMesh = THREE.Mesh<THREE.BoxBufferGeometry, THREE.MeshBasicMaterial>

describe('renderer', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => (root = createRoot(document.createElement('canvas'))))
  afterEach(async () => act(async () => root.unmount()))

  it('should render empty JSX', async () => {
    const store = await act(async () => root.render(null))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(0)
  })

  it('should render native elements', async () => {
    const store = await act(async () => root.render(<group />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Group)
  })

  it('should render extended elements', async () => {
    const store = await act(async () => root.render(<customElement />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(CustomElement)
  })

  it('should render primitives', async () => {
    const object = new THREE.Object3D()

    const store = await act(async () => root.render(<primitive object={object} />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
  })

  it('should go through lifecycle', async () => {
    const lifecycle: string[] = []

    function Test() {
      React.useInsertionEffect(() => void lifecycle.push('useInsertionEffect'), [])
      React.useImperativeHandle(React.useRef(), () => void lifecycle.push('refCallback'))
      React.useLayoutEffect(() => void lifecycle.push('useLayoutEffect'), [])
      React.useEffect(() => void lifecycle.push('useEffect'), [])
      lifecycle.push('render')
      return <group ref={() => void lifecycle.push('ref')} />
    }
    await act(async () => root.render(<Test />))

    expect(lifecycle).toStrictEqual([
      'render',
      'useInsertionEffect',
      'ref',
      'refCallback',
      'useLayoutEffect',
      'useEffect',
    ])
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

  it('should handle children', async () => {
    const Test = () => (
      <group>
        <mesh />
      </group>
    )
    const store = await act(async () => root.render(<Test />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Group)
    expect(scene.children[0].children.length).toBe(1)
    expect(scene.children[0].children[0]).toBeInstanceOf(THREE.Mesh)
  })

  it('should handle attach', async () => {
    const lifecycle: string[] = []

    const Test = () => {
      return (
        <mesh>
          <boxGeometry />
          <meshStandardMaterial />
          <group attach="userData-group" />
          <group
            ref={() => void lifecycle.push('mount')}
            attach={() => (lifecycle.push('attach'), () => lifecycle.push('detach'))}
          />
        </mesh>
      )
    }
    const store = await act(async () => root.render(<Test />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Mesh)
    // Handles geometry & material attach
    expect((scene.children[0] as ComponentMesh).geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect((scene.children[0] as ComponentMesh).material).toBeInstanceOf(THREE.MeshStandardMaterial)
    // Handles nested attach
    expect(scene.children[0].userData.group).toBeInstanceOf(THREE.Group)
    // attach bypasses scene-graph
    expect(scene.children[0].children.length).toBe(0)
    // attaches before presenting
    expect(lifecycle).toStrictEqual(['attach', 'mount'])
  })

  it('should handle unmount', async () => {
    const dispose = jest.fn()
    const childDispose = jest.fn()
    const attachDispose = jest.fn()
    const flagDispose = jest.fn()

    const attach = jest.fn()
    const detach = jest.fn()

    const object = Object.assign(new THREE.Object3D(), { dispose: jest.fn() })

    const Test = (props: JSX.IntrinsicElements['mesh']) => (
      <mesh
        {...props}
        ref={(self: any) => {
          if (!self) return
          self.dispose = dispose
        }}>
        <object3D
          ref={(self: any) => {
            if (!self) return
            self.dispose = childDispose
          }}
        />
        <object3D
          ref={(self: any) => {
            if (!self) return
            self.dispose = attachDispose
          }}
          attach={() => (attach(), detach)}
        />
        <object3D
          dispose={null}
          ref={(self: any) => {
            if (!self) return
            self.dispose = flagDispose
          }}
        />
        <primitive object={object} />
      </mesh>
    )

    const store = await act(async () => root.render(<Test />))
    await act(async () => root.render(null))

    const { scene } = store.getState()

    // TODO: Scheduler isn't being flushed and Jest's mocks are clashing here.
    // We need a way to check usage of dispose after unmount that works with Jest
    dispose()
    childDispose()
    attachDispose()
    detach()

    // Cleans up scene-graph
    expect(scene.children.length).toBe(0)
    // Calls dispose on top-level instance
    expect(dispose).toBeCalled()
    // Also disposes of children
    expect(childDispose).toBeCalled()
    // Disposes of attached children
    expect(attachDispose).toBeCalled()
    // Properly detaches attached children
    expect(attach).toBeCalledTimes(1)
    expect(detach).toBeCalledTimes(1)
    // Respects dispose={null}
    expect(flagDispose).not.toBeCalled()
    // Does not dispose of primitives
    expect(object.dispose).not.toBeCalled()
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

    expect(state.getState().viewport.initialDpr).toEqual(window.devicePixelRatio)
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

  it('should gracefully handle text', async () => {
    const warn = console.warn
    console.warn = jest.fn()

    // Mount
    await act(async () => root.render(<>one</>))
    // Update
    await act(async () => root.render(<>two</>))
    // Unmount
    await act(async () => root.render(<></>))
    // Suspense
    const Test = () => suspend(async () => <>four</>, [])
    await act(async () => root.render(<Test />))

    expect(console.warn).toHaveBeenCalled()
    console.warn = warn
  })

  it('should gracefully interrupt when building up the tree', async () => {
    const calls: string[] = []
    let lastAttached!: string | undefined
    let lastMounted!: string | undefined

    function SuspenseComponent({ reconstruct = false }: { reconstruct?: boolean }) {
      suspend(async (reconstruct) => reconstruct, [reconstruct])

      return (
        <group key={reconstruct ? 0 : 1} name="parent">
          <group
            name="child"
            ref={(self) => void (lastMounted = self?.uuid)}
            attach={(parent, self) => {
              calls.push('attach')
              lastAttached = self.uuid
              return () => calls.push('detach')
            }}
          />
        </group>
      )
    }

    function Test(props: { reconstruct?: boolean }) {
      React.useLayoutEffect(() => void calls.push('useLayoutEffect'), [])

      return (
        <group name="suspense">
          <SuspenseComponent {...props} />
        </group>
      )
    }

    await act(async () => root.render(<Test />))

    // Should complete tree before layout-effects fire
    expect(calls).toStrictEqual(['attach', 'useLayoutEffect'])
    expect(lastAttached).toBe(lastMounted)

    await act(async () => root.render(<Test reconstruct />))

    expect(calls).toStrictEqual(['attach', 'useLayoutEffect', 'detach', 'attach'])
    expect(lastAttached).toBe(lastMounted)
  })
})
