import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import ts from 'typescript'
import * as path from 'path'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  useFrame,
  useStore,
  useThree,
  createPortal,
  RootState,
  RootStore,
  extend,
} from '../src/index'

extend(THREE as any)

// Activity is unavailable in React 19.0, which is also covered by CI.
const Activity = (
  React as unknown as {
    Activity: React.ComponentType<React.PropsWithChildren<{ mode: 'visible' | 'hidden' }>>
  }
).Activity
const testActivity = Activity ? it : it.skip

let root: ReconcilerRoot<HTMLCanvasElement> = null!
const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

function createRoot() {
  const canvas = createCanvas()
  const root = createRootImpl(canvas)
  roots.push(root)
  return root
}

beforeEach(() => (root = createRoot()))

afterEach(async () => {
  for (const root of roots) {
    await act(async () => root.unmount())
  }
  roots.length = 0
})

describe('createRoot', () => {
  it('should return a Zustand store', async () => {
    const store = await act(async () => root.render(null))
    expect(() => store.getState()).not.toThrow()
  })

  it('will make an Orthographic Camera & set the position', async () => {
    const store = await act(async () =>
      (await root.configure({ orthographic: true, camera: { position: [0, 0, 5] } })).render(<group />),
    )
    const { camera } = store.getState()

    expect(camera).toBeInstanceOf(THREE.OrthographicCamera)
    expect(camera.position.z).toEqual(5)
  })

  // TODO: deprecate
  it('should handle an performance changing functions', async () => {
    let store: RootStore = null!
    await act(async () => {
      store = (await root.configure({ dpr: [1, 2], performance: { min: 0.2 } })).render(<group />)
    })

    expect(store.getState().viewport.initialDpr).toEqual(window.devicePixelRatio)
    expect(store.getState().performance.min).toEqual(0.2)
    expect(store.getState().performance.current).toEqual(1)

    await act(async () => {
      store.getState().setDpr(0.1)
    })

    expect(store.getState().viewport.dpr).toEqual(0.1)

    jest.useFakeTimers()

    await act(async () => {
      store.getState().performance.regress()
      jest.advanceTimersByTime(100)
    })

    expect(store.getState().performance.current).toEqual(0.2)

    await act(async () => {
      jest.advanceTimersByTime(200)
    })

    expect(store.getState().performance.current).toEqual(1)

    jest.useRealTimers()
  })

  it('should handle the DPR prop reactively', async () => {
    // Initial clamp
    const store = await act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    expect(store.getState().viewport.dpr).toEqual(window.devicePixelRatio)

    // Reactive update
    await act(async () => store.getState().setDpr(0.1))
    expect(store.getState().viewport.dpr).toEqual(0.1)

    // Reactive clamp
    await act(async () => store.getState().setDpr([1, 2]))
    expect(store.getState().viewport.dpr).toEqual(window.devicePixelRatio)
  })

  it('should set PCFSoftShadowMap as the default shadow map', async () => {
    const store = await act(async () => (await root.configure({ shadows: true })).render(<group />))
    const { gl } = store.getState()

    expect(gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputColorSpace to SRGBColorSpace if linear is false', async () => {
    const store = await act(async () => (await root.configure({ linear: false })).render(<group />))
    const { gl } = store.getState()

    expect(gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
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
      const state = (await root.configure({ frameloop: 'never' })).render(<Test />).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('should set renderer props via gl prop', async () => {
    const store = await act(async () =>
      (await root.configure({ gl: { logarithmicDepthBuffer: true } })).render(<group />),
    )
    const { gl } = store.getState()

    expect(gl.capabilities.logarithmicDepthBuffer).toBe(true)
  })

  it('should update scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    await act(async () => {
      scene = (await root.configure({ scene: { name: 'test' } })).render(<group />).getState().scene
    })

    expect(scene.name).toBe('test')
  })

  it('should set a custom scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    const prop = new THREE.Scene()

    await act(async () => {
      scene = (await root.configure({ scene: prop })).render(<group />).getState().scene
    })

    expect(prop).toBe(scene)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends THREE.WebGLRenderer {}

    let gl: Renderer = null!
    await act(async () => {
      gl = (await root.configure({ gl: (props) => new Renderer(props) })).render(<group />).getState().gl
    })

    expect(gl instanceof Renderer).toBe(true)
  })

  it('should respect color management preferences via gl', async () => {
    let gl: THREE.WebGLRenderer & { outputColorSpace?: string } = null!
    let texture: THREE.Texture & { colorSpace?: string } = null!

    let key = 0
    function Test() {
      gl = useThree((state) => state.gl)
      texture = new THREE.Texture()
      return <meshBasicMaterial key={key++} map={texture} />
    }

    await act(async () => (await createRoot().configure({ linear: true })).render(<Test />))
    expect(gl.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)

    await act(async () => (await createRoot().configure({ linear: false })).render(<Test />))
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('should respect legacy prop', async () => {
    THREE.ColorManagement.enabled = true

    await act(async () => {
      ;(await root.configure({ legacy: true })).render(<group />)
    })
    expect(THREE.ColorManagement.enabled).toBe(false)

    await act(async () => {
      ;(await root.configure({ legacy: false })).render(<group />)
    })
    expect(THREE.ColorManagement.enabled).toBe(true)
  })

  it('should tear down the root on unmount', async () => {
    let state!: RootState
    await act(async () => root.configure({ onCreated: (created) => (state = created) }))
    await act(async () => root.render(<group />))

    const forceContextLoss = jest.spyOn(state.gl, 'forceContextLoss')
    await act(async () => root.unmount())

    expect(forceContextLoss).toHaveBeenCalledTimes(1)
  })

  it('should tear down after the tree has cleaned up', async () => {
    const order: string[] = []
    function Test() {
      const gl = useThree((state) => state.gl)
      React.useEffect(() => () => void order.push(`cleanup:${gl.getContext() ? 'live' : 'lost'}`), [gl])
      return null
    }

    let state!: RootState
    await act(async () => root.configure({ onCreated: (created) => (state = created) }))
    await act(async () => root.render(<Test />))

    jest.spyOn(state.gl, 'forceContextLoss').mockImplementation(() => void order.push('teardown'))
    await act(async () => root.unmount())

    expect(order).toStrictEqual(['cleanup:live', 'teardown'])
  })

  it('should keep a root that is rendered again before its teardown', async () => {
    let state!: RootState
    await act(async () => root.configure({ onCreated: (created) => (state = created) }))
    await act(async () => root.render(<group />))

    const forceContextLoss = jest.spyOn(state.gl, 'forceContextLoss')
    await act(async () => {
      root.unmount()
      root.render(<group />)
    })

    expect(forceContextLoss).not.toHaveBeenCalled()
    expect(state.scene.children).toHaveLength(1)

    await act(async () => root.unmount())
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
  })
})

describe('createPortal', () => {
  it('should create a state enclave', async () => {
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
  })

  it('should handle unmounted containers', async () => {
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

  it('preserves parent events when updating portal events after parent resizes', async () => {
    const container = new THREE.Group()
    let portalState: RootState = null!

    function PortalProbe() {
      portalState = useThree()
      return null
    }

    const parentStore: RootStore = await act(async () =>
      root.render(
        <>
          <primitive object={container} />
          {createPortal(<PortalProbe />, container)}
        </>,
      ),
    )

    const setPortalEvents = portalState.setEvents

    await act(async () => {
      setPortalEvents({ priority: 2 })
    })

    // Parent resizes update the portal's size and preserve its event setter.
    for (const width of [640, 1280]) {
      await act(async () => {
        parentStore.getState().setSize(width, 480)
      })

      expect(portalState.size.width).toBe(width)
      // Setter stays the same.
      expect(portalState.setEvents).toBe(setPortalEvents)
    }

    // Using the portal setter should maintain the parent state.
    await act(async () => {
      setPortalEvents({ enabled: false })
    })

    expect(portalState.events).toMatchObject({ enabled: false, priority: 2 })
    expect(parentStore.getState().events).toMatchObject({ enabled: true, priority: 1 })
  })

  it('updates a portal camera, size and events when its options change', async () => {
    const container = new THREE.Group()
    const camera = new THREE.PerspectiveCamera()
    camera.position.z = 5
    let portalState: RootState = null!

    function PortalProbe() {
      portalState = useThree()
      return null
    }

    const size = { width: 400, height: 200, top: 10, left: 20 }
    const parentStore: RootStore = await act(async () =>
      root.render(createPortal(<PortalProbe />, container, { camera, size, events: { priority: 2 } })),
    )
    expect(camera.aspect).toBe(2)

    const nextSize = { width: 300, height: 600, top: 30, left: 40 }
    await act(async () =>
      root.render(
        createPortal(<PortalProbe />, container, {
          camera,
          size: nextSize,
          events: { priority: 3 },
        }),
      ),
    )
    await act(async () => parentStore.getState().setSize(800, 600))

    expect(portalState.camera).toBe(camera)
    expect(portalState.size).toEqual(nextSize)
    expect(portalState.viewport.aspect).toBe(0.5)
    expect(portalState.events.priority).toBe(3)
    expect(camera.aspect).toBe(0.5)
    expect(parentStore.getState().events).toMatchObject({ enabled: true, priority: 1 })
  })

  it('stops following parent resizes after the portal unmounts (#3676)', async () => {
    const container = new THREE.Group()
    let portalStore: RootStore = null!

    function PortalProbe() {
      portalStore = useStore()
      return <mesh />
    }

    const parentStore: RootStore = await act(async () => root.render(createPortal(<PortalProbe />, container)))
    await act(async () => parentStore.getState().setSize(640, 480))
    expect(portalStore.getState().size.width).toBe(640)

    await act(async () => root.render(null))
    await act(async () => parentStore.getState().setSize(1280, 720))
    expect(container.children).toHaveLength(0)
    expect(portalStore.getState().size.width).toBe(640)
  })

  it('picks up parent state changes made before the portal subscribes', async () => {
    const container = new THREE.Group()
    let portalState: RootState = null!
    let widthAtCommit: number | undefined

    function Resize() {
      const set = useThree((state) => state.set)
      React.useLayoutEffect(() => set((state) => ({ size: { ...state.size, width: 123 } })), [set])
      return null
    }

    function PortalProbe() {
      portalState = useThree()
      return null
    }

    // Observe portal state after its layout effect and before later updates.
    function AfterPortal() {
      React.useLayoutEffect(() => void (widthAtCommit = portalState.get().size.width), [])
      return null
    }

    await act(async () =>
      root.render(
        <>
          <Resize />
          {createPortal(<PortalProbe />, container)}
          <AfterPortal />
        </>,
      ),
    )

    expect(widthAtCommit).toBe(123)
  })

  testActivity('preserves portal state and catches up after Activity hide/show', async () => {
    const container = new THREE.Group()
    let portalState: RootState = null!

    function PortalProbe() {
      portalState = useThree()
      const [object] = React.useState(() => new THREE.Mesh())
      return <primitive object={object} />
    }

    const parentStore: RootStore = await act(async () => root.render(null))
    const initialParentState = parentStore.getState()
    const App = ({ mode }: { mode: 'visible' | 'hidden' }) => (
      <React.StrictMode>
        <Activity mode={mode}>{createPortal(<PortalProbe />, container)}</Activity>
      </React.StrictMode>
    )

    await act(async () => root.render(<App mode="visible" />))
    const object = container.children[0]
    await act(async () => portalState.setEvents({ enabled: false }))
    await act(async () => parentStore.getState().setSize(640, 480))
    expect(portalState.size.width).toBe(640)

    await act(async () => root.render(<App mode="hidden" />))
    expect(object.visible).toBe(false)
    // Restoring a saved parent snapshot must still reach the portal on reveal.
    await act(async () => parentStore.setState(initialParentState, true))
    expect(portalState.get().size.width).toBe(640)

    await act(async () => root.render(<App mode="visible" />))
    expect(container.children[0]).toBe(object)
    expect(object.visible).toBe(true)
    expect(portalState.size).toEqual(initialParentState.size)
    expect(portalState.events.enabled).toBe(false)
  })

  it('moves children when the portal target changes', async () => {
    const firstContainer = new THREE.Group()
    const secondContainer = new THREE.Group()

    await act(async () => root.render(createPortal(<mesh />, firstContainer)))
    expect(firstContainer.children).toHaveLength(1)

    await act(async () => root.render(createPortal(<mesh />, secondContainer)))
    expect(firstContainer.children).toHaveLength(0)
    expect(secondContainer.children).toHaveLength(1)
  })
})

function getExports(source: string): string[] {
  const program = ts.createProgram([source], { jsx: ts.JsxEmit.React })
  const checker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(source)!

  const sourceFileSymbol = checker.getSymbolAtLocation(sourceFile)!
  const moduleExports = checker.getExportsOfModule(sourceFileSymbol)

  return moduleExports.map(({ escapedName }) => escapedName).sort() as unknown as string[]
}

describe('exports', () => {
  it('matches public API', () => {
    const webExports = getExports(path.resolve(__dirname, '../src/index.tsx'))
    expect(webExports).toMatchSnapshot()
  })

  it('are consistent between targets', () => {
    const webExports = getExports(path.resolve(__dirname, '../src/index.tsx'))
    const nativeExports = getExports(path.resolve(__dirname, '../src/native.tsx'))

    expect(webExports).toStrictEqual(nativeExports)
  })
})
