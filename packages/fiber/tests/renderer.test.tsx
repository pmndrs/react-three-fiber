import * as React from 'react'
import * as THREE from 'three'
import { ReconcilerRoot, createRoot, act, extend, ThreeElement, ThreeElements } from '../src/index'
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
  }
}

extend({ Mock })

type ComponentMesh = THREE.Mesh<THREE.BoxBufferGeometry, THREE.MeshBasicMaterial>

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

    expect(scene.children.length).toBe(0)
  })

  it('should render native elements', async () => {
    const store = await act(async () => root.render(<group name="native" />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Group)
    expect(scene.children[0].name).toBe('native')
  })

  it('should render extended elements', async () => {
    const store = await act(async () => root.render(<mock name="mock" />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(Mock)
    expect(scene.children[0].name).toBe('mock')

    const Component = extend(THREE.Mesh)
    await act(async () => root.render(<Component />))

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBeInstanceOf(THREE.Mesh)
  })

  it('should render primitives', async () => {
    const object = new THREE.Object3D()

    const store = await act(async () => root.render(<primitive name="primitive" object={object} />))
    const { scene } = store.getState()

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
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

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
    expect(object.children.length).toBe(2)

    await act(async () => root.render(<Component show={false} />))

    expect(scene.children.length).toBe(0)
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

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
    expect(object.children.length).toBe(2)

    await act(async () => root.render(<Component primitiveKey="B" />))

    expect(scene.children.length).toBe(1)
    expect(scene.children[0]).toBe(object)
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

  it('should update props reactively', async () => {
    const store = await act(async () => root.render(<group />))
    const { scene } = store.getState()
    const group = scene.children[0] as THREE.Group

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
    const mesh = scene.children[0] as ComponentMesh
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
    const dispose = jest.fn()
    const childDispose = jest.fn()
    const attachDispose = jest.fn()
    const flagDispose = jest.fn()

    const attach = jest.fn()
    const detach = jest.fn()

    const object = Object.assign(new THREE.Object3D(), { dispose: jest.fn() })
    const objectExternal = Object.assign(new THREE.Object3D(), { dispose: jest.fn() })
    object.add(objectExternal)

    const disposeDeclarativePrimitive = jest.fn()

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

    // Cleans up scene-graph
    expect(scene.children.length).toBe(0)
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

    expect(scene.children.map((o) => o.name)).toStrictEqual(array.map((o) => o.name))

    const reversedArray = [d, c, b, a]
    await act(async () => root.render(<Test array={reversedArray} />))
    expect(scene.children.map((o) => o.name)).toStrictEqual(reversedArray.map((o) => o.name))

    const mixedArray = [b, a, d, c]
    await act(async () => root.render(<Test array={mixedArray} />))
    expect(scene.children.map((o) => o.name)).toStrictEqual(mixedArray.map((o) => o.name))
  })

  // TODO: fix this case, also see:
  // https://github.com/pmndrs/react-three-fiber/issues/1892
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
    d.name = 'c'
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

    expect(scene.children.length).toBe(0)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(array.map((o) => o.name))

    const reversedArray = [d, c, b, a]
    await act(async () => root.render(<Test array={reversedArray} />))
    expect(scene.children.length).toBe(0)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(reversedArray.map((o) => o.name))

    const mixedArray = [b, a, d, c]
    await act(async () => root.render(<Test array={mixedArray} />))
    expect(scene.children.length).toBe(0)
    expect(scene.userData.objects.map((o: THREE.Object3D) => o.name)).toStrictEqual(mixedArray.map((o) => o.name))
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
        root.render(
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
      root.render(
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
      root.render(
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
      root.render(
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
      root.render(
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
      root.render(
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
    const store = await act(async () => root.configure({ camera: { aspect: 0 } }).render(null))
    const camera = store.getState().camera as THREE.PerspectiveCamera
    expect(camera.aspect).toBe(0)
  })

  it('preserves camera frustum props for orthographic', async () => {
    const store = await act(async () =>
      root.configure({ orthographic: true, camera: { left: 0, right: 0, top: 0, bottom: 0 } }).render(null),
    )
    const camera = store.getState().camera as THREE.OrthographicCamera
    expect(camera.left).toBe(0)
    expect(camera.right).toBe(0)
    expect(camera.top).toBe(0)
    expect(camera.bottom).toBe(0)
  })
})
