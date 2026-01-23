import * as React from 'react'
import * as THREE from 'three'
import {
  ReconcilerRoot,
  createRoot,
  act,
  extend,
  ThreeElement,
  ThreeElements,
  flushSync,
  useThree,
  createPortal,
  useFrame,
} from '../src/index'
import { suspend } from 'suspend-react'

extend(THREE as any)

class Mock extends THREE.Group {
  static instances: string[]
  constructor(name: string = '') {
    super()
    this.name = name
    Mock.instances.push(name)
  }
}

declare module '@react-three/fiber' {
  interface ThreeElements {
    mock: ThreeElement<typeof Mock>
    threeRandom: ThreeElement<typeof THREE.Group>
  }
}

extend({ Mock })

type ComponentMesh = THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>

const expectToThrow = async (callback: () => any, message: string) => {
  let error: Error | undefined
  try {
    await callback()
  } catch (e) {
    error = e as Error
  }
  expect(error?.message).toBe(message)
}

describe('renderer', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
    Mock.instances = []
  })
  afterEach(async () => act(async () => root.unmount()))

  it('should render empty JSX', async () => {
    const store = await act(async () => root.render(null))
    const { scene } = store.getState()

    // Camera is automatically added to scene
    expect(scene.children.length).toBe(1)
  })

  it('should render native elements', async () => {
    const store = await act(async () => root.render(<group name="native" />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Group)
    expect(scene.children[1].name).toBe('native')
  })

  it('should render extended elements', async () => {
    const store = await act(async () => root.render(<mock name="mock" />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(Mock)
    expect(scene.children[1].name).toBe('mock')

    const Component = extend(THREE.Mesh)
    await act(async () => root.render(<Component />))

    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Mesh)
  })

  it('should render primitives', async () => {
    const object = new THREE.Object3D()

    const store = await act(async () => root.render(<primitive name="primitive" object={object} />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBe(object)
    expect(object.name).toBe('primitive')
  })

  it('should remove children from primitive when unmounted', async () => {
    const object = new THREE.Group()

    function Parent({ children, show }: { children: React.ReactNode; show: boolean }) {
      return show ? <primitive object={object}>{children}</primitive> : null
    }

    function Component({ show }: { show: boolean }) {
      return (
        <Parent show={show}>
          <group name="A" />
          <group name="B" />
        </Parent>
      )
    }

    const store = await act(async () => root.render(<Component show={true} />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBe(object)
    expect(object.children.length).toBe(2)

    await act(async () => root.render(<Component show={false} />))

    // Only camera remains
    expect(scene.children.length).toBe(1)
    expect(object.children.length).toBe(0)
  })

  it('should remove then add children from primitive when key changes', async () => {
    const object = new THREE.Group()

    function Parent({ children, primitiveKey }: { children: React.ReactNode; primitiveKey: string }) {
      return (
        <primitive key={primitiveKey} object={object}>
          {children}
        </primitive>
      )
    }

    function Component({ primitiveKey }: { primitiveKey: string }) {
      return (
        <Parent primitiveKey={primitiveKey}>
          <group name="A" />
          <group name="B" />
        </Parent>
      )
    }

    const store = await act(async () => root.render(<Component primitiveKey="A" />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBe(object)
    expect(object.children.length).toBe(2)

    await act(async () => root.render(<Component primitiveKey="B" />))

    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBe(object)
    expect(object.children.length).toBe(2)
  })

  it('should go through lifecycle', async () => {
    const lifecycle: string[] = []

    function Test() {
      React.useInsertionEffect(() => void lifecycle.push('useInsertionEffect'), [])
      React.useImperativeHandle(React.useRef(null), () => {
        lifecycle.push('refCallback')
        return null
      })
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
    let immutableRef!: React.RefObject<THREE.Mesh | null>
    let mutableRef!: React.RefObject<THREE.Mesh | null>
    let mutableRefSpecific!: React.RefObject<THREE.Mesh | null>

    const RefTest = () => {
      immutableRef = React.createRef()
      mutableRef = React.useRef(null)
      mutableRefSpecific = React.useRef(null)

      return (
        <>
          <mesh ref={immutableRef} />
          <mesh ref={mutableRef} />
          <mesh
            ref={(r) => {
              mutableRefSpecific.current = r
            }}
          />
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

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Group)
    expect(scene.children[1].children.length).toBe(1)
    expect(scene.children[1].children[0]).toBeInstanceOf(THREE.Mesh)
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

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Mesh)
    // Handles geometry & material attach
    expect((scene.children[1] as ComponentMesh).geometry).toBeInstanceOf(THREE.BoxGeometry)
    expect((scene.children[1] as ComponentMesh).material).toBeInstanceOf(THREE.MeshStandardMaterial)
    // Handles nested attach
    expect(scene.children[1].userData.group).toBeInstanceOf(THREE.Group)
    // attach bypasses scene-graph
    expect(scene.children[1].children.length).toBe(0)
    // attaches before presenting
    expect(lifecycle).toStrictEqual(['attach', 'mount'])
  })

  it('should update props reactively', async () => {
    const store = await act(async () => root.render(<group />))
    const { scene } = store.getState()
    // Camera is at [0], rendered content starts at [1]
    const group = scene.children[1] as THREE.Group

    // Initial
    expect(group.name).toBe(new THREE.Group().name)

    // Set
    await act(async () => root.render(<group name="one" />))
    expect(group.name).toBe('one')

    // Update
    await act(async () => root.render(<group name="two" />))
    expect(group.name).toBe('two')

    // Unset
    await act(async () => root.render(<group />))
    expect(group.name).toBe(new THREE.Group().name)
  })

  it('should handle event props reactively', async () => {
    const store = await act(async () => root.render(<mesh />))
    const { scene, internal } = store.getState()
    // Camera is at [0], rendered content starts at [1]
    const mesh = scene.children[1] as ComponentMesh
    mesh.name = 'current'

    // Initial
    expect(internal.interaction.length).toBe(0)

    // Set
    await act(async () => root.render(<mesh onClick={() => void 0} />))
    expect(internal.interaction.length).toBe(1)
    expect(internal.interaction).toStrictEqual([mesh])

    // Update
    await act(async () => root.render(<mesh onPointerOver={() => void 0} />))
    expect(internal.interaction.length).toBe(1)
    expect(internal.interaction).toStrictEqual([mesh])

    // Unset
    await act(async () => root.render(<mesh />))
    expect(internal.interaction.length).toBe(0)
  })

  it('should handle the args prop reactively', async () => {
    const ref = React.createRef<ComponentMesh>()
    const child = React.createRef<THREE.Object3D>()
    const attachedChild = React.createRef<THREE.Object3D>()

    const Test = (props: ThreeElements['mesh']) => (
      <mesh {...props} ref={ref}>
        <object3D ref={child} />
        <object3D ref={attachedChild} attach="userData-attach" />
      </mesh>
    )

    // Initial
    await act(async () => root.render(<Test />))
    expect(ref.current!.geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(ref.current!.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
    expect(ref.current!.material).toBeInstanceOf(THREE.Material)
    expect(ref.current!.material).not.toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(ref.current!.children[0]).toBe(child.current)
    expect(ref.current!.userData.attach).toBe(attachedChild.current)

    // Throw on non-array value
    await expectToThrow(
      async () => await act(async () => root.render(<Test args={{} as any} />)),
      'R3F: The args prop must be an array!',
    )

    // Set
    const geometry1 = new THREE.BoxGeometry()
    const material1 = new THREE.MeshStandardMaterial()
    await act(async () => root.render(<Test args={[geometry1, material1]} />))
    expect(ref.current!.geometry).toBe(geometry1)
    expect(ref.current!.material).toBe(material1)
    expect(ref.current!.children[0]).toBe(child.current)
    expect(ref.current!.userData.attach).toBe(attachedChild.current)

    // Update
    const geometry2 = new THREE.BoxGeometry()
    const material2 = new THREE.MeshStandardMaterial()
    await act(async () => root.render(<Test args={[geometry2, material2]} />))
    expect(ref.current!.geometry).toBe(geometry2)
    expect(ref.current!.material).toBe(material2)
    expect(ref.current!.children[0]).toBe(child.current)
    expect(ref.current!.userData.attach).toBe(attachedChild.current)

    // Unset
    await act(async () => root.render(<Test />))
    expect(ref.current!.geometry).toBeInstanceOf(THREE.BufferGeometry)
    expect(ref.current!.geometry).not.toBeInstanceOf(THREE.BoxGeometry)
    expect(ref.current!.material).toBeInstanceOf(THREE.Material)
    expect(ref.current!.material).not.toBeInstanceOf(THREE.MeshStandardMaterial)
    expect(ref.current!.children[0]).toBe(child.current)
    expect(ref.current!.userData.attach).toBe(attachedChild.current)
  })

  it('should handle the object prop reactively', async () => {
    const ref = React.createRef<THREE.Object3D>()
    const child = React.createRef<THREE.Object3D>()
    const attachedChild = React.createRef<THREE.Object3D>()

    const Test = (props: ThreeElements['primitive']) => (
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

    // Throw on undefined
    await expectToThrow(
      async () => await act(async () => root.render(<Test object={undefined as any} />)),
      "R3F: Primitives without 'object' are invalid!",
    )

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

  it('should handle unmount', async () => {
    const dispose = vi.fn()
    const childDispose = vi.fn()
    const attachDispose = vi.fn()
    const flagDispose = vi.fn()

    const attach = vi.fn()
    const detach = vi.fn()

    const object = Object.assign(new THREE.Object3D(), { dispose: vi.fn() })
    const objectExternal = Object.assign(new THREE.Object3D(), { dispose: vi.fn() })
    object.add(objectExternal)

    const disposeDeclarativePrimitive = vi.fn()

    const Test = (props: ThreeElements['mesh']) => (
      <mesh
        {...props}
        ref={(self: any) => {
          if (!self) return
          self.dispose = dispose
        }}
        onClick={() => void 0}>
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
        <primitive object={object}>
          <object3D
            ref={(self: any) => {
              if (!self) return
              self.dispose = disposeDeclarativePrimitive
            }}
          />
        </primitive>
      </mesh>
    )

    const store = await act(async () => root.render(<Test />))
    await act(async () => root.render(null))

    const { scene, internal } = store.getState()

    // Cleans up scene-graph (only camera remains)
    expect(scene.children.length).toBe(1)
    // Removes events
    expect(internal.interaction.length).toBe(0)
    // Calls dispose on top-level instance
    expect(dispose).toHaveBeenCalled()
    // Also disposes of children
    expect(childDispose).toHaveBeenCalled()
    // Disposes of attached children
    expect(attachDispose).toHaveBeenCalled()
    // Properly detaches attached children
    expect(attach).toHaveBeenCalledTimes(1)
    expect(detach).toHaveBeenCalledTimes(1)
    // Respects dispose={null}
    expect(flagDispose).not.toHaveBeenCalled()
    // Does not dispose of primitives
    expect(object.dispose).not.toHaveBeenCalled()
    // Only disposes of declarative primitive children
    expect(objectExternal.dispose).not.toHaveBeenCalled()
    expect(disposeDeclarativePrimitive).toHaveBeenCalled()
  })

  it('can swap 4 array primitives', async () => {
    const a = new THREE.Group()
    a.name = 'a'
    const b = new THREE.Group()
    b.name = 'b'
    const c = new THREE.Group()
    c.name = 'c'
    const d = new THREE.Group()
    d.name = 'd'

    const Test = ({ array }: { array: THREE.Group[] }) => (
      <>
        {array.map((group, i) => (
          <primitive key={i} object={group} />
        ))}
      </>
    )

    const array = [a, b, c, d]
    const store = await act(async () => root.render(<Test array={array} />))
    const { scene } = store.getState()

    // Filter out camera to compare only rendered content
    const contentChildren = () => scene.children.filter((c) => !(c as any).isCamera)
    expect(contentChildren().map((o) => o.name)).toStrictEqual(array.map((o) => o.name))

    const reversedArray = [d, c, b, a]
    await act(async () => root.render(<Test array={reversedArray} />))
    expect(contentChildren().map((o) => o.name)).toStrictEqual(reversedArray.map((o) => o.name))

    const mixedArray = [b, a, d, c]
    await act(async () => root.render(<Test array={mixedArray} />))
    expect(contentChildren().map((o) => o.name)).toStrictEqual(mixedArray.map((o) => o.name))
  })

  // https://github.com/pmndrs/react-three-fiber/issues/3125
  // https://github.com/pmndrs/react-three-fiber/issues/3143
  it('can swap 4 array primitives via attach', async () => {
    const a = new THREE.Group()
    a.name = 'a'
    const b = new THREE.Group()
    b.name = 'b'
    const c = new THREE.Group()
    c.name = 'c'
    const d = new THREE.Group()
    d.name = 'd'
    const array = [a, b, c, d]

    const Test = ({ array }: { array: THREE.Group[] }) => (
      <>
        {array.map((group, i) => (
          <primitive key={i} attach={`userData-objects-${i}`} object={group} />
        ))}
      </>
    )

    const store = await act(async () => root.render(<Test array={array} />))
    const { scene } = store.getState()

    // Only camera in scene (primitives are attached, not added as children)
    expect(scene.children.length).toBe(1)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(array.map((o) => o.name))

    const reversedArray = [d, c, b, a]
    await act(async () => root.render(<Test array={reversedArray} />))
    expect(scene.children.length).toBe(1)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(reversedArray.map((o) => o.name))

    const mixedArray = [b, a, d, c]
    await act(async () => root.render(<Test array={mixedArray} />))
    expect(scene.children.length).toBe(1)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(mixedArray.map((o) => o.name))
  })

  it('should gracefully handle text', async () => {
    // Mount
    await act(async () => root.render(<>one</>))
    // Update
    await act(async () => root.render(<>two</>))
    // Unmount
    await act(async () => root.render(<></>))
    // Suspense
    const Test = () => suspend(async () => <>four</>, [])
    await act(async () => root.render(<Test />))
  })

  it('should gracefully interrupt when building up the tree', async () => {
    const calls: string[] = []
    let lastAttached!: string | undefined
    let lastMounted!: string | undefined

    function SuspenseComponent({ reconstruct = false }: { reconstruct?: boolean }) {
      suspend(async (reconstruct) => reconstruct, [reconstruct])

      return (
        <mock key={reconstruct ? 0 : 1} args={['parent']}>
          <mock
            args={['child']}
            ref={(self) => void (lastMounted = self?.uuid)}
            attach={(_, self) => {
              calls.push('attach')
              lastAttached = self.uuid
              return () => calls.push('detach')
            }}
          />
        </mock>
      )
    }

    function Test(props: { reconstruct?: boolean }) {
      React.useLayoutEffect(() => void calls.push('useLayoutEffect'), [])

      return (
        <mock args={['suspense']}>
          <SuspenseComponent {...props} />
        </mock>
      )
    }

    await act(async () => root.render(<Test />))

    // Should complete tree before layout-effects fire
    expect(calls).toStrictEqual(['attach', 'useLayoutEffect'])
    expect(lastAttached).toBe(lastMounted)
    expect(Mock.instances).toStrictEqual(['suspense', 'parent', 'child'])

    await act(async () => root.render(<Test reconstruct />))

    expect(calls).toStrictEqual(['attach', 'useLayoutEffect', 'detach', 'attach'])
    expect(lastAttached).toBe(lastMounted)
    expect(Mock.instances).toStrictEqual(['suspense', 'parent', 'child', 'parent', 'child'])
  })

  it('should toggle visibility during Suspense non-destructively', async () => {
    const a = Promise.resolve(new THREE.Object3D())
    const b = Promise.resolve(new THREE.Object3D())

    function AsyncPrimitive({ object }: { object: Promise<THREE.Object3D> }) {
      return <primitive object={React.use(object)} />
    }

    for (let i = 0; i < 3; i++) {
      await act(async () =>
        (await root.configure()).render(
          <React.Suspense fallback={null}>
            <AsyncPrimitive object={i % 2 === 0 ? a : b} />
          </React.Suspense>,
        ),
      )
    }

    expect((await a).visible).toBe(true)
    expect((await b).visible).toBe(true)
  })

  it('should hide suspended objects when displaying fallback', async () => {
    const a = new THREE.Object3D()
    const b = new THREE.Object3D()
    const fallback = new THREE.Object3D()

    let resolveA: () => void
    const aPromise = new Promise<THREE.Object3D>((res) => {
      resolveA = () => res(a)
    })

    let resolveB: () => void
    const bPromise = new Promise<THREE.Object3D>((res) => {
      resolveB = () => res(b)
    })

    function Fallback() {
      return <primitive object={fallback} />
    }

    function AsyncPrimitive({ object }: { object: Promise<THREE.Object3D> }) {
      return <primitive object={React.use(object)} />
    }

    // Mount unresolved A promise.
    // Fallback should be mounted and nothing else.
    const store = await act(async () =>
      (await root.configure()).render(
        <React.Suspense fallback={<Fallback />}>
          <AsyncPrimitive object={aPromise} />
        </React.Suspense>,
      ),
    )

    const scene = store.getState().scene as THREE.Scene

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(fallback)).toBe(true)
    expect(scene.children.includes(a)).toBe(false)

    // Resolve A promise.
    // A should be mounted and visible and fallback should be unmounted.
    await act(async () => resolveA())
    await act(async () =>
      (await root.configure()).render(
        <React.Suspense fallback={<Fallback />}>
          <AsyncPrimitive object={aPromise} />
        </React.Suspense>,
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(fallback)).toBe(false)
    expect(scene.children.includes(a)).toBe(true)

    // Mount unresolved B promise.
    // A should remain mounted but be invisible, Fallback is mounted, B is unmounted.
    await act(async () =>
      (await root.configure()).render(
        <React.Suspense fallback={<Fallback />}>
          <AsyncPrimitive object={bPromise} />
        </React.Suspense>,
      ),
    )

    expect(a.visible).toBe(false)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(fallback)).toBe(true)
    expect(scene.children.includes(a)).toBe(true)
    expect(scene.children.includes(b)).toBe(false)

    // Resolve B promise.
    // B should be mounted and visible, fallback should be unmounted, A also unmounted and unhidden.
    await act(async () => resolveB())
    await act(async () =>
      (await root.configure()).render(
        <React.Suspense fallback={<Fallback />}>
          <AsyncPrimitive object={bPromise} />
        </React.Suspense>,
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(fallback)).toBe(false)
    expect(scene.children.includes(a)).toBe(false)
    expect(scene.children.includes(b)).toBe(true)

    // Remount resolved A promise.
    // A should be mounted and visible, B should be unmounted and visible (not hidden), fallback should be unmounted.
    await act(async () =>
      (await root.configure()).render(
        <React.Suspense fallback={<Fallback />}>
          <AsyncPrimitive object={aPromise} />
        </React.Suspense>,
      ),
    )

    expect(a.visible).toBe(true)
    expect(b.visible).toBe(true)
    expect(scene.children.includes(fallback)).toBe(false)
    expect(scene.children.includes(a)).toBe(true)
    expect(scene.children.includes(b)).toBe(false)
  })

  it('preserves camera frustum props for perspective', async () => {
    const store = await act(async () => (await root.configure({ camera: { aspect: 0 } })).render(null))
    const camera = store.getState().camera as THREE.PerspectiveCamera
    expect(camera.aspect).toBe(0)
  })

  it('preserves camera frustum props for orthographic', async () => {
    const store = await act(async () =>
      (await root.configure({ orthographic: true, camera: { left: 0, right: 0, top: 0, bottom: 0 } })).render(null),
    )
    const camera = store.getState().camera as THREE.OrthographicCamera
    expect(camera.left).toBe(0)
    expect(camera.right).toBe(0)
    expect(camera.top).toBe(0)
    expect(camera.bottom).toBe(0)
  })

  it('resolves conflicting and prefixed elements', async () => {
    extend({ ThreeRandom: THREE.Group })

    // Camera is at [0], rendered content starts at [1]
    const store = await act(async () => root.render(<line />))
    expect(store.getState().scene.children[1]).toBeInstanceOf(THREE.Line)

    await act(async () => root.render(null))
    // Only camera remains
    expect(store.getState().scene.children.length).toBe(1)

    await act(async () => root.render(<threeLine />))
    expect(store.getState().scene.children[1]).toBeInstanceOf(THREE.Line)

    await act(async () => root.render(null))
    expect(store.getState().scene.children.length).toBe(1)

    await act(async () => root.render(<threeRandom />))
    expect(store.getState().scene.children[1]).toBeInstanceOf(THREE.Group)
  })

  // https://github.com/pmndrs/react-three-fiber/pull/3490
  // Tests that instance.children stays in sync with object.children during reorders
  it('should properly handle array of components with changing keys and order', async () => {
    const MeshComponent = ({ id }: { id: number }) => {
      return <mesh name={`mesh-${id}`} />
    }

    const Test = ({ values }: { values: number[] }) => (
      <>
        {values.map((value) => (
          <MeshComponent key={value} id={value} />
        ))}
      </>
    )

    // Initial render with 4 values in ascending order
    const initialValues = [1, 2, 3, 4]
    const store = await act(async () => root.render(<Test values={initialValues} />))
    const { scene } = store.getState()

    // Filter out camera to compare only rendered content
    const contentChildren = () => scene.children.filter((c) => !(c as any).isCamera)

    // Check initial state - verify both Three.js and R3F instance arrays
    // +1 for camera
    expect(scene.children.length).toBe(5)
    expect(contentChildren().map((child) => child.name)).toEqual(['mesh-1', 'mesh-2', 'mesh-3', 'mesh-4'])
    expect((scene as any).__r3f.children.length).toBe(4)

    // Update with one less value and different order
    const updatedValues = [3, 1, 4]
    await act(async () => root.render(<Test values={updatedValues} />))

    // Check that scene has exactly the meshes we expect in correct order
    // +1 for camera
    expect(scene.children.length).toBe(4)
    expect(contentChildren().map((child) => child.name)).toEqual(['mesh-3', 'mesh-1', 'mesh-4'])
    // Verify R3F instance children array stays in sync (this is what the PR fixes)
    expect((scene as any).__r3f.children.length).toBe(3)

    // Verify mesh-2 was removed
    expect(contentChildren().find((child) => child.name === 'mesh-2')).toBeUndefined()

    // Verify no duplicates by checking unique names
    const uniqueNames = new Set(contentChildren().map((child) => child.name))
    expect(uniqueNames.size).toBe(contentChildren().length)

    // Update with different order again
    const reorderedValues = [4, 1]
    await act(async () => root.render(<Test values={reorderedValues} />))

    // Check final state (+1 for camera)
    expect(scene.children.length).toBe(3)
    expect(contentChildren().map((child) => child.name)).toEqual(['mesh-4', 'mesh-1'])
    // Verify R3F instance children array stays in sync
    expect((scene as any).__r3f.children.length).toBe(2)

    // Verify mesh-3 was removed
    expect(contentChildren().find((child) => child.name === 'mesh-3')).toBeUndefined()

    // Verify no duplicates in final state
    const finalUniqueNames = new Set(contentChildren().map((child) => child.name))
    expect(finalUniqueNames.size).toBe(contentChildren().length)
  })

  it('should update scene synchronously with flushSync', async () => {
    let updateSynchronously: (value: number) => void

    function TestComponent() {
      const [positionX, setPositionX] = React.useState(0)
      const scene = useThree((state) => state.scene)

      updateSynchronously = React.useCallback(
        (value: number) => {
          flushSync(() => {
            setPositionX(value)
          })

          // +1 for camera, rendered content at [1]
          expect(scene.children.length).toBe(2)
          expect(scene.children[1].position.x).toBe(value)
        },
        [scene, setPositionX],
      )

      return <mesh position-x={positionX} />
    }

    await act(async () => root.render(<TestComponent />))
    await act(async () => updateSynchronously(1))
  })

  //* Props vs Setters Conflict Resolution Tests ==============================
  // These tests verify that imperative setter changes (setDpr, setFrameloop, etc.)
  // are preserved when Canvas re-configures (e.g., on resize)

  it('should preserve setFrameloop changes across re-configure (no prop passed)', async () => {
    // Test scenario: Canvas has no frameloop prop (defaults to 'always')
    // User calls setFrameloop('demand'), then Canvas re-configures (resize)
    // Frameloop should stay 'demand', not reset to default

    // Initial configure with default frameloop (no prop passed explicitly uses 'always')
    const store = await act(async () =>
      (await root.configure({ size: { width: 100, height: 100, top: 0, left: 0 } })).render(<group />),
    )
    const state = store.getState()

    // Verify initial state - frameloop should be 'always' (the default)
    expect(state.frameloop).toBe('always')

    // User imperatively changes frameloop to 'demand'
    await act(async () => state.setFrameloop('demand'))
    expect(store.getState().frameloop).toBe('demand')

    // Simulate resize by re-configuring with new size (but same frameloop prop)
    // This is what happens when the Canvas container resizes
    await act(async () => root.configure({ size: { width: 200, height: 200, top: 0, left: 0 } }))

    // Size should have updated
    expect(store.getState().size.width).toBe(200)
    expect(store.getState().size.height).toBe(200)

    // Frameloop should STILL be 'demand' - not reset to 'always'
    expect(store.getState().frameloop).toBe('demand')
  })

  it('should preserve setDpr changes from child component across re-configure', async () => {
    // Test scenario: Canvas has dpr={[1, 2]} prop
    // A child component calls setDpr(1) after mount
    // Canvas re-configures (resize) - dpr should stay at 1, not reset to [1, 2]

    let setDprFromComponent: (dpr: number) => void = () => {}

    function DprSetter() {
      const state = useThree()
      React.useEffect(() => {
        // Expose setDpr for test to call
        setDprFromComponent = (dpr: number) => state.setDpr(dpr)
      }, [state])
      return null
    }

    // Initial configure with dpr={[1, 2]}
    const store = await act(async () =>
      (
        await root.configure({
          dpr: [1, 2],
          size: { width: 100, height: 100, top: 0, left: 0 },
        })
      ).render(<DprSetter />),
    )

    // Verify initial dpr was applied (calculateDpr picks based on device pixel ratio)
    const initialDpr = store.getState().viewport.dpr
    expect(typeof initialDpr).toBe('number')

    // Child component imperatively changes dpr to 1
    await act(async () => setDprFromComponent(1))
    expect(store.getState().viewport.dpr).toBe(1)

    // Simulate resize by re-configuring with new size (but same dpr prop)
    await act(async () =>
      root.configure({
        dpr: [1, 2],
        size: { width: 200, height: 200, top: 0, left: 0 },
      }),
    )

    // Size should have updated
    expect(store.getState().size.width).toBe(200)
    expect(store.getState().size.height).toBe(200)

    // DPR should STILL be 1 - not reset based on [1, 2] range
    expect(store.getState().viewport.dpr).toBe(1)
  })

  it('should update dpr when the PROP changes (controlled mode)', async () => {
    // Test scenario: Canvas dpr prop actually changes from [1, 2] to 1
    // In this case, the new prop value should be applied

    const store = await act(async () =>
      (
        await root.configure({
          dpr: [1, 2],
          size: { width: 100, height: 100, top: 0, left: 0 },
        })
      ).render(<group />),
    )

    const initialDpr = store.getState().viewport.dpr

    // Re-configure with a DIFFERENT dpr prop value
    await act(async () =>
      root.configure({
        dpr: 0.5, // Changed from [1, 2] to 0.5
        size: { width: 100, height: 100, top: 0, left: 0 },
      }),
    )

    // DPR should now be 0.5 (the new prop value was applied)
    expect(store.getState().viewport.dpr).toBe(0.5)
  })

  it('should preserve multiple setter changes across re-configure', async () => {
    // Test scenario: Both dpr and frameloop are changed imperatively
    // Both should be preserved after re-configure

    const store = await act(async () =>
      (
        await root.configure({
          dpr: [1, 2],
          frameloop: 'always',
          size: { width: 100, height: 100, top: 0, left: 0 },
        })
      ).render(<group />),
    )

    const state = store.getState()

    // User imperatively changes both dpr and frameloop
    await act(async () => {
      state.setDpr(1)
      state.setFrameloop('demand')
    })

    expect(store.getState().viewport.dpr).toBe(1)
    expect(store.getState().frameloop).toBe('demand')

    // Simulate resize by re-configuring with same props
    await act(async () =>
      root.configure({
        dpr: [1, 2],
        frameloop: 'always',
        size: { width: 200, height: 200, top: 0, left: 0 },
      }),
    )

    // Both values should be preserved
    expect(store.getState().viewport.dpr).toBe(1)
    expect(store.getState().frameloop).toBe('demand')
    // Size should have updated
    expect(store.getState().size.width).toBe(200)
  })

  describe('createPortal', () => {
    it('should render portal with direct Object3D', async () => {
      const container = new THREE.Group()
      container.name = 'portal-container'

      const store = await act(async () =>
        root.render(
          <>
            <primitive object={container} />
            {createPortal(<mesh name="portaled-mesh" />, container)}
          </>,
        ),
      )

      const { scene } = store.getState()

      // Container should be in scene (camera at [0], container at [1])
      expect(scene.children.length).toBe(2)
      expect(scene.children[1]).toBe(container)

      // Portal injects a Scene as child of container
      expect(container.children.length).toBe(1)
      expect(container.children[0].type).toBe('Scene')

      // Mesh should be in the injected scene
      const portalScene = container.children[0] as THREE.Scene
      expect(portalScene.children.length).toBe(1)
      expect(portalScene.children[0].name).toBe('portaled-mesh')
    })

    it('should render portal with ref object', async () => {
      const TestComponent = () => {
        const containerRef = React.useRef<THREE.Group>(null)

        return (
          <>
            <group ref={containerRef} name="ref-container" />
            {createPortal(<mesh name="ref-portaled-mesh" />, containerRef)}
          </>
        )
      }

      const store = await act(async () => root.render(<TestComponent />))
      const { scene } = store.getState()

      // Wait for ref to resolve (portal renders after microtask)
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

      const container = scene.children.find((c) => c.name === 'ref-container') as THREE.Group
      expect(container).toBeDefined()

      // Portal injects a Scene as child of container
      expect(container.children.length).toBe(1)
      expect(container.children[0].type).toBe('Scene')

      // Mesh should be in the injected scene
      const portalScene = container.children[0] as THREE.Scene
      expect(portalScene.children.length).toBe(1)
      expect(portalScene.children[0].name).toBe('ref-portaled-mesh')
    })

    it('should remount portal when container changes', async () => {
      const TestComponent = ({ useSecondContainer }: { useSecondContainer: boolean }) => {
        const container1 = React.useRef<THREE.Group>(null)
        const container2 = React.useRef<THREE.Group>(null)

        return (
          <>
            <group ref={container1} name="container-1" />
            <group ref={container2} name="container-2" />
            {createPortal(<mesh name="switching-mesh" />, useSecondContainer ? container2 : container1)}
          </>
        )
      }

      const store = await act(async () => root.render(<TestComponent useSecondContainer={false} />))
      const { scene } = store.getState()

      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

      const container1 = scene.children.find((c) => c.name === 'container-1') as THREE.Group
      const container2 = scene.children.find((c) => c.name === 'container-2') as THREE.Group

      // Mesh should be in container1
      expect(container1.children.length).toBeGreaterThan(0)
      expect((container1.children[0] as THREE.Scene).children.length).toBe(1)
      expect((container1.children[0] as THREE.Scene).children[0].name).toBe('switching-mesh')
      expect(container2.children.length).toBe(0)

      // Switch to container2
      await act(async () => root.render(<TestComponent useSecondContainer={true} />))
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

      // Mesh should now be in container2
      // Old portal scene should be cleaned up from container1
      expect(container1.children.length).toBe(0)
      expect(container2.children.length).toBeGreaterThan(0)
      expect((container2.children[0] as THREE.Scene).children.length).toBe(1)
      expect((container2.children[0] as THREE.Scene).children[0].name).toBe('switching-mesh')
    })

    it('should handle camera changes in portal container', async () => {
      const TestComponent = ({ useCustomCamera }: { useCustomCamera: boolean }) => {
        const { camera: defaultCamera } = useThree()
        const customCamera = React.useMemo(() => new THREE.PerspectiveCamera(), [])
        const targetCamera = useCustomCamera ? customCamera : defaultCamera

        return (
          <>
            <primitive object={customCamera} />
            {createPortal(<mesh name="camera-bound-mesh" />, targetCamera)}
          </>
        )
      }

      const store = await act(async () => root.render(<TestComponent useCustomCamera={false} />))
      const { scene, camera: defaultCamera } = store.getState()

      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

      // Mesh should be in default camera
      expect(defaultCamera.children.length).toBe(1)
      expect((defaultCamera.children[0] as THREE.Scene).children[0].name).toBe('camera-bound-mesh')

      // Switch to custom camera
      await act(async () => root.render(<TestComponent useCustomCamera={true} />))
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

      // Find the custom camera among non-camera scene children (it's a PerspectiveCamera but not the default camera)
      const customCamera = scene.children.find(
        (c) => c instanceof THREE.PerspectiveCamera && c !== defaultCamera,
      ) as THREE.PerspectiveCamera
      expect(customCamera).toBeDefined()

      // Mesh should now be in custom camera
      // Old portal scene should be cleaned up from default camera
      expect(defaultCamera.children.length).toBe(0)
      expect(customCamera.children.length).toBeGreaterThan(0)
      expect((customCamera.children[0] as THREE.Scene).children[0].name).toBe('camera-bound-mesh')
    })

    it('should not render portal until ref is resolved', async () => {
      let renderCount = 0

      const TestComponent = () => {
        const containerRef = React.useRef<THREE.Group>(null)
        renderCount++

        return (
          <>
            <group ref={containerRef} name="delayed-container" />
            {createPortal(
              <mesh name="delayed-mesh">
                <boxGeometry />
              </mesh>,
              containerRef,
            )}
          </>
        )
      }

      const store = await act(async () => root.render(<TestComponent />))
      const { scene } = store.getState()

      // Initial render - container exists but portal may not be attached yet
      const container = scene.children.find((c) => c.name === 'delayed-container') as THREE.Group
      expect(container).toBeDefined()

      // Wait for microtask to resolve ref
      await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))

      // Now portal should be attached
      expect(container.children.length).toBe(1)
      expect((container.children[0] as THREE.Scene).children[0].name).toBe('delayed-mesh')
    })

    it('should provide correct portal scene to useFrame callbacks', async () => {
      // This test verifies that useFrame inside a portal receives the portal's scene,
      // not the root scene. This was a bug where the scheduler's tickRoot would
      // use the root entry's getState() instead of the portal's store.
      const container = new THREE.Group()
      container.name = 'portal-container'

      let rootSceneUuid: string | undefined
      let portalSceneInUseFrame: THREE.Scene | undefined
      let portalSceneActual: THREE.Scene | undefined

      // Component inside the portal that captures scene from useFrame
      const PortalContent = () => {
        useFrame((state) => {
          portalSceneInUseFrame = state.scene
        })
        return <mesh name="portal-child" />
      }

      const TestComponent = () => {
        const { scene: rootScene } = useThree()
        rootSceneUuid = rootScene.uuid

        return (
          <>
            <primitive object={container} />
            {createPortal(<PortalContent />, container)}
          </>
        )
      }

      await act(async () => root.configure({ frameloop: 'always' }).then((r) => r.render(<TestComponent />)))

      // Wait for portal to mount and microtask to resolve
      await act(async () => new Promise((resolve) => setTimeout(resolve, 50)))

      // Get the actual portal scene (injected scene child of container)
      portalSceneActual = container.children.find((c) => c.type === 'Scene') as THREE.Scene

      // The scene from useFrame should be the portal scene, NOT the root scene
      expect(portalSceneInUseFrame).toBeDefined()
      expect(portalSceneActual).toBeDefined()
      expect(portalSceneInUseFrame!.uuid).toBe(portalSceneActual!.uuid)
      expect(portalSceneInUseFrame!.uuid).not.toBe(rootSceneUuid)
    })
  })
})
