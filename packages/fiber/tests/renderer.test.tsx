import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import * as ReactDOMClient from 'react-dom/client'
import {
  ReconcilerRoot,
  createRoot,
  extend,
  ThreeElement,
  ThreeElements,
  flushSync,
  useThree,
  unmountComponentAtNode,
  type GLProps,
} from '../src/index'
import { suspend } from 'suspend-react'

extend(THREE as any)

// CI also covers React 19.0, which has neither Activity nor its types.
const Activity = (
  React as unknown as {
    Activity: React.ComponentType<React.PropsWithChildren<{ mode: 'visible' | 'hidden' }>>
  }
).Activity
const testActivity = Activity ? it : it.skip

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
  let canvas: HTMLCanvasElement
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    canvas = document.createElement('canvas')
    root = createRoot(canvas)
    Mock.instances = []
  })
  afterEach(async () => act(async () => root.unmount()))

  describe('configure', () => {
    it('mounts the scene synchronously', async () => {
      await act(async () => {
        root.configure()
        expect(root.render(<group />).getState().scene.children).toHaveLength(1)
      })
    })

    it('configures itself when rendered without one', async () => {
      await act(async () => {
        expect(root.render(<group />).getState().scene.children).toHaveLength(1)
      })
    })

    it('waits for an async renderer before mounting', async () => {
      let ready!: () => void
      const gl = async (props: any) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      }

      root.configure({ gl })
      const store = root.render(<group />)
      expect(store.getState().internal.active).toBe(false)

      await act(async () => ready())
      expect(store.getState().scene.children).toHaveLength(1)
    })

    it('applies props configured while an async renderer is pending', async () => {
      let ready!: () => void
      const gl = async (props: any) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      }

      root.configure({ gl, frameloop: 'never' })
      root.configure({ frameloop: 'demand' })

      const store = await act(async () => {
        ready()
        return root.render(null)
      })
      expect(store.getState().frameloop).toBe('demand')
    })

    it('disposes an async renderer that lands after unmount', async () => {
      const forceContextLoss = jest.fn()
      let ready!: () => void
      const gl = async (props: any) => {
        await new Promise<void>((resolve) => (ready = resolve))
        const gl = new THREE.WebGLRenderer(props)
        jest.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
        return gl
      }

      root.configure({ gl })
      const store = root.render(<group />)
      await act(async () => root.unmount())
      await act(async () => ready())

      expect(store.getState().internal.active).toBe(false)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })

    it('refuses to render when the renderer fails', async () => {
      const error = new Error('no renderer')
      await expect(
        root.configure({
          gl: () => {
            throw error
          },
        }),
      ).rejects.toBe(error)

      expect(() => root.render(<group />)).toThrow(error)
    })

    it('recovers when a failed configure is retried', async () => {
      await expect(
        root.configure({
          gl: () => {
            throw new Error('no renderer')
          },
        }),
      ).rejects.toThrow('no renderer')

      await act(async () => {
        root.configure()
        expect(root.render(<group />).getState().scene.children).toHaveLength(1)
      })
    })
  })

  describe('ownership', () => {
    // Stands in for three's WebGPURenderer, which v9 apps build in an async `gl` factory
    class MockWebGPURenderer {
      initialized = false
      xr = { addEventListener: jest.fn(), removeEventListener: jest.fn() }
      outputColorSpace = ''
      toneMapping = 0
      render = jest.fn()
      setSize = jest.fn()
      setPixelRatio = jest.fn()
      hasInitialized = () => this.initialized
      init = jest.fn(async () => {
        this.initialized = true
      })
      dispose = jest.fn(async () => {})
    }

    async function mount(gl?: GLProps) {
      let store!: ReturnType<typeof root.render>
      await act(async () => {
        store = (await root.configure({ gl, frameloop: 'never' })).render(null)
      })
      return { root, state: store.getState() }
    }

    afterEach(() => jest.restoreAllMocks())

    it('disposes a renderer it created, then releases its context', async () => {
      const { root, state } = await mount()
      const dispose = jest.spyOn(state.gl, 'dispose')
      const forceContextLoss = jest.spyOn(state.gl, 'forceContextLoss')

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
      expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(forceContextLoss.mock.invocationCallOrder[0])
    })

    it('disposes a renderer returned by a factory', async () => {
      let gl!: THREE.WebGLRenderer
      const { root } = await mount((props) => (gl = new THREE.WebGLRenderer(props)))
      const dispose = jest.spyOn(gl, 'dispose')

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it('keeps the 9.x teardown for a renderer instance: context lost, not disposed', async () => {
      const gl = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') })
      const dispose = jest.spyOn(gl, 'dispose')
      const forceContextLoss = jest.spyOn(gl, 'forceContextLoss')
      const { root } = await mount(gl)

      await act(async () => root.unmount())
      expect(dispose).not.toHaveBeenCalled()
      expect(forceContextLoss).toHaveBeenCalledTimes(1)
    })

    it('disposes a WebGPU renderer built by an async factory', async () => {
      const gl = new MockWebGPURenderer()
      const { root } = await mount(async () => {
        await gl.init()
        return gl
      })

      await act(async () => root.unmount())
      expect(gl.dispose).toHaveBeenCalledTimes(1)
    })

    it('does not dispose a WebGPU renderer that never initialized', async () => {
      // three's dispose() would start its init, or reject unhandled after a failed one
      const gl = new MockWebGPURenderer()
      const { root } = await mount(() => gl)

      await act(async () => root.unmount())
      expect(gl.dispose).not.toHaveBeenCalled()
    })

    it('still releases the renderer when an earlier teardown step throws', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const { root, state } = await mount()
      const dispose = jest.spyOn(state.gl, 'dispose')
      const failure = new Error('disconnect failed')
      state.events.disconnect = () => {
        throw failure
      }

      await act(async () => root.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
    })

    it('still releases the context when renderer disposal throws', async () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
      const { root, state } = await mount()
      const failure = new Error('disposal failed')
      jest.spyOn(state.gl, 'dispose').mockImplementation(() => {
        throw failure
      })
      const lose = jest.spyOn(state.gl, 'forceContextLoss')

      await act(async () => root.unmount())
      expect(lose).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
    })

    it('releases custom renderer resources when no dispose method is provided', async () => {
      const gl = {
        render: jest.fn(),
        setSize: jest.fn(),
        setPixelRatio: jest.fn(),
        renderLists: { dispose: jest.fn() },
        forceContextLoss: jest.fn(),
      }
      const { root } = await mount(() => gl)

      await act(async () => root.unmount())
      expect(gl.renderLists.dispose).toHaveBeenCalledTimes(1)
      expect(gl.forceContextLoss).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmounting', () => {
    function deferred<T = void>() {
      let resolve!: (_value: T) => void
      let reject!: (_error: Error) => void
      const promise = new Promise<T>((yes, no) => {
        resolve = yes
        reject = no
      })
      return { promise, resolve, reject }
    }

    afterEach(() => jest.restoreAllMocks())

    it('lets components clean up before disposing their renderer', async () => {
      const gl = new THREE.WebGLRenderer({ canvas })
      const dispose = jest.spyOn(gl, 'dispose')
      const cleanup = jest.fn()
      function Child() {
        React.useEffect(() => cleanup, [])
        return null
      }
      await root.configure({ gl: () => gl, frameloop: 'never' })
      await act(async () => root.render(<Child />))
      await act(async () => root.unmount())

      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(cleanup.mock.invocationCallOrder[0]).toBeLessThan(dispose.mock.invocationCallOrder[0])
    })

    it('prevents an unmounted handle from being reused or affecting a replacement root', async () => {
      const oldRoot = root
      const oldStore = await act(async () => oldRoot.render(null))
      await act(async () => oldRoot.unmount())
      const setSize = jest.spyOn(oldStore.getState().gl, 'setSize')
      const replacement = createRoot(canvas)
      const object = new THREE.Group()
      const store = await act(async () => replacement.render(<primitive object={object} />))
      const dispose = jest.spyOn(store.getState().gl, 'dispose')

      await expect(oldRoot.configure({ size: { width: 321, height: 123, top: 0, left: 0 } })).rejects.toThrow(
        'Cannot configure',
      )
      await act(async () => {
        oldRoot.render(<primitive object={new THREE.Group()} />)
        oldRoot.unmount()
      })

      expect(setSize).not.toHaveBeenCalled()
      expect(oldStore.getState().scene.children).toHaveLength(0)
      expect(store.getState().scene.children).toEqual([object])
      expect(dispose).not.toHaveBeenCalled()
      await act(async () => replacement.unmount())
      expect(dispose).toHaveBeenCalledTimes(1)
    })

    it.each(['configure', 'render'] as const)(
      'can resume a pending renderer with %s after requesting unmount',
      async (use) => {
        const pending = deferred<THREE.WebGLRenderer>()
        const gl = new THREE.WebGLRenderer({ canvas })
        const dispose = jest.spyOn(gl, 'dispose')
        const object = new THREE.Group()
        root.configure({ gl: () => pending.promise, frameloop: 'never' })
        const store = root.render(<primitive object={object} />)
        await act(async () => root.unmount())

        if (use === 'configure') root.configure({ frameloop: 'never' })
        else root.render(<primitive object={object} />)
        await act(async () => pending.resolve(gl))

        expect(dispose).not.toHaveBeenCalled()
        expect(store.getState().scene.children).toEqual([object])
        await act(async () => root.unmount())
        expect(dispose).toHaveBeenCalledTimes(1)
      },
    )

    it('finishes accepted configuration before disposing a late renderer', async () => {
      const pending = deferred<THREE.WebGLRenderer>()
      const gl = new THREE.WebGLRenderer({ canvas })
      const release = gl.dispose.bind(gl)
      let sizeAtDisposal: THREE.Vector2 | undefined
      const dispose = jest.spyOn(gl, 'dispose').mockImplementation(() => {
        sizeAtDisposal = gl.getSize(new THREE.Vector2())
        release()
      })
      root.configure({ gl: () => pending.promise, frameloop: 'never' })
      const configured = root.configure({ size: { width: 321, height: 123, top: 0, left: 0 } })
      const callback = jest.fn()
      await act(async () => unmountComponentAtNode(canvas, callback))
      expect(dispose).not.toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()

      await act(async () => pending.resolve(gl))

      await expect(configured).resolves.toBe(root)
      expect(sizeAtDisposal).toEqual(new THREE.Vector2(321, 123))
      expect(dispose).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it.each(['resolve', 'reject'] as const)(
      'completes unmount after asynchronous disposal settles (%s)',
      async (settle) => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
        const store = await act(async () => root.render(null))
        const gl = store.getState().gl
        const pending = deferred()
        const release = gl.dispose.bind(gl)
        const dispose = jest.spyOn(gl, 'dispose').mockImplementation(() => {
          release()
          return pending.promise
        })
        const lose = jest.spyOn(gl, 'forceContextLoss')
        const callback = jest.fn()
        const failure = new Error('disposal failed')

        await act(async () => unmountComponentAtNode(canvas, callback))
        expect(callback).not.toHaveBeenCalled()
        expect(lose).not.toHaveBeenCalled()
        await expect(root.configure()).rejects.toThrow('Cannot configure')
        await act(async () => {
          root.render(<primitive object={new THREE.Group()} />)
          root.unmount()
        })
        expect(store.getState().scene.children).toHaveLength(0)
        expect(dispose).toHaveBeenCalledTimes(1)

        await act(async () => {
          if (settle === 'resolve') pending.resolve()
          else pending.reject(failure)
        })

        expect(lose).toHaveBeenCalledTimes(1)
        expect(callback).toHaveBeenCalledTimes(1)
        if (settle === 'reject') expect(warn).toHaveBeenCalledWith(expect.any(String), failure)
      },
    )
  })

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

  it('should keep attach fixed until the instance is remounted', async () => {
    const ref = React.createRef<THREE.Group>()

    function Test({ attach, childKey }: { attach?: string; childKey: string }) {
      return (
        <group>
          <group key={childKey} ref={ref} attach={attach} />
        </group>
      )
    }

    const store = await act(async () => root.render(<Test childKey="one" attach="userData-one" />))
    const parent = store.getState().scene.children[0]
    const child = ref.current
    expect(parent.userData.one).toBe(child)

    await act(async () => root.render(<Test childKey="one" attach="userData-two" />))
    expect(parent.userData.one).toBe(child)
    expect(parent.userData.two).toBeUndefined()

    await act(async () => root.render(<Test childKey="one" />))
    expect(parent.userData.one).toBe(child)

    await act(async () => root.render(<Test childKey="two" attach="userData-two" />))
    expect(parent.userData.one).toBeUndefined()
    expect(parent.userData.two).toBe(ref.current)
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

  testActivity.each([true, false])('restores a primitive with visible=%s after Activity hide/show', async (visible) => {
    const object = new THREE.Group()
    object.visible = visible
    const scene = (mode: 'visible' | 'hidden') => (
      <Activity mode={mode}>
        <primitive object={object} />
      </Activity>
    )

    await act(async () => root.render(scene('visible')))
    expect(object.visible).toBe(visible)
    await act(async () => root.render(scene('hidden')))
    expect(object.visible).toBe(false)
    await act(async () => root.render(scene('visible')))
    expect(object.visible).toBe(visible)
  })

  testActivity.each([
    [false, true],
    [true, false],
    [false, undefined],
  ])('applies a visibility change from %s to %s when Activity is shown', async (initial, next) => {
    const object = new THREE.Group()
    const scene = (mode: 'visible' | 'hidden', visible: boolean | undefined) => (
      <Activity mode={mode}>
        <primitive object={object} {...(visible === undefined ? {} : { visible })} />
      </Activity>
    )

    await act(async () => root.render(scene('visible', initial)))
    await act(async () => root.render(scene('hidden', initial)))
    await act(async () => root.render(scene('hidden', next)))
    expect(object.visible).toBe(false)
    await act(async () => root.render(scene('visible', next)))
    expect(object.visible).toBe(next ?? true)
  })

  it('should toggle visibility during Suspense non-destructively', async () => {
    const a = Promise.resolve(new THREE.Object3D())
    const b = Promise.resolve(new THREE.Object3D())

    function AsyncPrimitive({ object }: { object: Promise<THREE.Object3D> }) {
      return <primitive object={React.use(object)} />
    }

    for (let i = 0; i < 3; i++) {
      await act(async () =>
        (
          await root.configure()
        ).render(
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
      (
        await root.configure()
      ).render(
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
      (
        await root.configure()
      ).render(
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
      (
        await root.configure()
      ).render(
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
      (
        await root.configure()
      ).render(
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
      (
        await root.configure()
      ).render(
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

    const store = await act(async () => root.render(<line />))
    expect(store.getState().scene.children[0]).toBeInstanceOf(THREE.Line)

    await act(async () => root.render(null))
    expect(store.getState().scene.children.length).toBe(0)

    await act(async () => root.render(<threeLine />))
    expect(store.getState().scene.children[0]).toBeInstanceOf(THREE.Line)

    await act(async () => root.render(null))
    expect(store.getState().scene.children.length).toBe(0)

    await act(async () => root.render(<threeRandom />))
    expect(store.getState().scene.children[0]).toBeInstanceOf(THREE.Group)
  })

  it('should properly handle array of components with changing keys and order', async () => {
    // Component that renders a mesh with a specific ID
    const MeshComponent = ({ id }: { id: number }) => {
      return <mesh name={`mesh-${id}`} />
    }

    // Component that maps over an array of values to render MeshComponents
    const Test = ({ values }: { values: number[] }) => (
      <>
        {values.map((value) => (
          <MeshComponent key={value} id={value} />
        ))}
      </>
    )

    // Initial render with 4 values
    const initialValues = [1, 2, 3, 4]
    const store = await act(async () => root.render(<Test values={initialValues} />))
    const { scene } = store.getState()

    // Check initial state
    expect(scene.children.length).toBe(4)
    const initialNames = scene.children.map((child) => child.name).sort()
    expect(initialNames).toEqual(['mesh-1', 'mesh-2', 'mesh-3', 'mesh-4'])

    // Update with one less value and different order
    const updatedValues = [3, 1, 4]
    await act(async () => root.render(<Test values={updatedValues} />))

    // Check that the scene has exactly the meshes we expect
    expect(scene.children.length).toBe(3)
    const updatedNames = scene.children.map((child) => child.name).sort()
    expect(updatedNames).toEqual(['mesh-1', 'mesh-3', 'mesh-4'])

    // Verify mesh-2 was removed
    expect(scene.children.find((child) => child.name === 'mesh-2')).toBeUndefined()

    // Verify no duplicates by checking unique names
    const uniqueNames = new Set(scene.children.map((child) => child.name))
    expect(uniqueNames.size).toBe(scene.children.length)

    // Update with different order again
    const reorderedValues = [4, 1]
    await act(async () => root.render(<Test values={reorderedValues} />))

    // Check final state
    expect(scene.children.length).toBe(2)
    const finalNames = scene.children.map((child) => child.name).sort()
    expect(finalNames).toEqual(['mesh-1', 'mesh-4'])

    // Verify mesh-3 was removed
    expect(scene.children.find((child) => child.name === 'mesh-3')).toBeUndefined()

    // Verify no duplicates in final state
    const finalUniqueNames = new Set(scene.children.map((child) => child.name))
    expect(finalUniqueNames.size).toBe(scene.children.length)
  })

  it('should keep instance children synchronized after a keyed reorder', async () => {
    const children = (order: string[]) => order.map((name) => <group key={name} name={name} />)

    const store = await act(async () => root.render(children(['a', 'b'])))
    const { scene } = store.getState()

    await act(async () => root.render(children(['b', 'a'])))

    const objectOrder = scene.children.map((child) => child.name)
    const instanceOrder = (scene as any).__r3f.children.map((child: any) => child.object.name)

    expect(objectOrder).toEqual(['b', 'a'])
    expect(instanceOrder).toEqual(objectOrder)
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

          expect(scene.children.length).toBe(1)
          expect(scene.children[0].position.x).toBe(value)
        },
        [scene, setPositionX],
      )

      return <mesh position-x={positionX} />
    }

    await act(async () => root.render(<TestComponent />))
    await act(async () => updateSynchronously(1))
  })

  // Transitions minted by the vendored reconciler must stay shape compatible with react-dom
  it('should update DOM state from a transition started inside the canvas', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    let setCount: React.Dispatch<React.SetStateAction<number>> = null!
    function DomApp() {
      const [count, setter] = React.useState(0)
      setCount = setter
      return <span>{count}</span>
    }
    const domRoot = ReactDOMClient.createRoot(host)
    await act(async () => domRoot.render(<DomApp />))

    let startFromCanvas: React.TransitionStartFunction = null!
    function CanvasChild() {
      const [, startTransition] = React.useTransition()
      startFromCanvas = startTransition
      return null
    }
    await act(async () => root.render(<CanvasChild />))

    // react-dom only checks the shape while another transition is pending
    await act(async () => {
      React.startTransition(() => setCount((value) => value + 1))
      startFromCanvas(() => setCount((value) => value + 1))
    })
    expect(host.textContent).toBe('2')

    await act(async () => domRoot.unmount())
    host.remove()
  })

  // ViewTransition commits synchronously since three.js has nothing to animate.
  // React 19.3 added it, so older React versions skip these tests
  const { ViewTransition, addTransitionType } = React as any
  const describeViewTransition = ViewTransition ? describe : describe.skip

  describeViewTransition('ViewTransition', () => {
    it('should mount a subtree through a transition', async () => {
      const effects: string[] = []
      let setShown: React.Dispatch<React.SetStateAction<boolean>> = null!

      function Test() {
        const [shown, setter] = React.useState(false)
        setShown = setter
        React.useLayoutEffect(() => void effects.push(`layout:${shown}`), [shown])
        React.useEffect(() => void effects.push(`passive:${shown}`), [shown])
        return shown ? (
          <ViewTransition enter="fade">
            <group name="shown" />
          </ViewTransition>
        ) : null
      }

      const store = await act(async () => root.render(<Test />))
      const { scene } = store.getState()

      await act(async () => React.startTransition(() => setShown(true)))
      expect(scene.children.map((child) => child.name)).toEqual(['shown'])
      expect(effects).toEqual(['layout:false', 'passive:false', 'layout:true', 'passive:true'])

      // Regular updates still commit afterwards
      await act(async () => setShown(false))
      expect(scene.children).toHaveLength(0)
    })

    it('should update and unmount a subtree through transitions', async () => {
      let setStep: React.Dispatch<React.SetStateAction<number>> = null!

      function Test() {
        const [step, setter] = React.useState(0)
        setStep = setter
        if (step > 1) return null
        return (
          <ViewTransition name="box" update="slide">
            <mesh position-x={step} />
          </ViewTransition>
        )
      }

      const store = await act(async () => root.render(<Test />))
      const { scene } = store.getState()
      const mesh = scene.children[0] as THREE.Mesh

      await act(async () =>
        React.startTransition(() => {
          addTransitionType('slide')
          setStep(1)
        }),
      )
      expect(scene.children[0]).toBe(mesh)
      expect(mesh.position.x).toBe(1)

      await act(async () => React.startTransition(() => setStep(2)))
      expect(scene.children).toHaveLength(0)
    })
  })

  it('should reset removed pierced props on the pierced target', async () => {
    const ref = React.createRef<THREE.Mesh>()

    function Test(props: any) {
      return (
        <mesh ref={ref} {...props}>
          <boxGeometry />
          <meshBasicMaterial />
        </mesh>
      )
    }

    await act(async () => root.render(<Test position-x={5} />))
    expect(ref.current!.position.x).toBe(5)

    await act(async () => root.render(<Test />))
    expect(ref.current!.position.x).toBe(0)
    // The reset must not leak a stray leaf-key property onto the object root
    expect((ref.current as any).x).toBeUndefined()

    // Imperative updates should not get overwritten by unrelated updates now
    ref.current!.position.x = 3

    await act(async () => root.render(<Test name="updated" />))
    expect(ref.current!.position.x).toBe(3)
  })

  it('should respect dispose={null} added after mount', async () => {
    const dispose = jest.fn()

    const Test = (props: any) => (
      <mesh
        {...props}
        ref={(self: any) => {
          if (self) self.dispose = dispose
        }}
      />
    )

    await act(async () => root.render(<Test />))
    await act(async () => root.render(<Test dispose={null} />))
    await act(async () => root.render(null))

    expect(dispose).not.toHaveBeenCalled()
  })

  it('should apply args changes when followed by an unchanged memoized sibling', async () => {
    const ref = React.createRef<THREE.Mesh>()
    const Sibling = React.memo(() => <group name="static" />)

    function Test({ size }: { size: number }) {
      const material = React.useMemo(() => <meshBasicMaterial />, [])
      return (
        <>
          <mesh ref={ref}>
            <boxGeometry args={[size, size, size]} />
            {material}
          </mesh>
          <Sibling />
        </>
      )
    }

    await act(async () => root.render(<Test size={1} />))
    expect((ref.current!.geometry as THREE.BoxGeometry).parameters.width).toBe(1)

    await act(async () => root.render(<Test size={2} />))
    expect((ref.current!.geometry as THREE.BoxGeometry).parameters.width).toBe(2)
  })
})
