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
  useThree,
  createPortal,
  RootState,
  RootStore,
  extend,
} from '../src/index'

extend(THREE as any)
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

  // Regression for #3751: Portal's setEvents closure must capture only the stable
  // store setter, not the whole previous portal state, or every replaced state stays
  // anchored in memory through a setEvents → injectState chain (unbounded leak).
  it('does not retain stale portal state in setEvents (#3751)', async () => {
    const container = new THREE.Group()
    let portalState: RootState = null!

    function PortalProbe() {
      portalState = useThree()
      return null
    }

    const rootStore: RootStore = await act(async () =>
      root.render(
        <>
          <primitive object={container} />
          {createPortal(<PortalProbe />, container)}
        </>,
      ),
    )

    const stalePortalState = portalState
    const staleSet = stalePortalState.set

    // Mutating the parent root store rebuilds the portal state via the inject callback,
    // replacing portalState with a fresh object.
    await act(async () => {
      rootStore.getState().set((state) => ({ size: { ...state.size } }))
    })
    expect(portalState).not.toBe(stalePortalState)

    // Poison the *property* on the stale state. The fixed setEvents captured the setter
    // by value, so it is unaffected; the buggy version looked it up off the retained
    // injectState at call time and would route through (and throw on) this.
    stalePortalState.set = (() => {
      throw new Error('stale portal state setter was retained')
    }) as RootState['set']

    try {
      await act(async () => {
        portalState.setEvents({ enabled: false })
      })
      expect(portalState.get().events.enabled).toBe(false)
    } finally {
      stalePortalState.set = staleSet
    }
  })

  // Regression for #3676: the subscription to the
  // parent (previous) root store must be torn down when the portal unmounts. It lives in
  // a layout effect that returns its unsubscribe; if that subscription is ever moved back
  // into the useMemo (where the unsubscribe is discarded), every portal mount would pin
  // its THREE.Scene in the parent store's listener set for good.
  it('unsubscribes from the parent root store when the portal unmounts', async () => {
    const container = new THREE.Group()

    // Render the parent tree once (no portal) to obtain the real root store.
    const rootStore: RootStore = await act(async () => root.render(<primitive object={container} />))

    // Track subscriptions added through the store from here on, and drop them as their
    // unsubscribe fires, so `live` reflects the currently-attached listeners.
    const live = new Set<() => void>()
    const realSubscribe = rootStore.subscribe.bind(rootStore)
    const subscribeSpy = jest.spyOn(rootStore, 'subscribe').mockImplementation((listener: any) => {
      const unsub = realSubscribe(listener)
      live.add(unsub)
      return () => {
        live.delete(unsub)
        unsub()
      }
    })

    try {
      const baseline = live.size

      // Mount the portal — Portal subscribes to the parent store.
      await act(async () =>
        root.render(
          <>
            <primitive object={container} />
            {createPortal(<mesh />, container)}
          </>,
        ),
      )
      expect(live.size).toBeGreaterThan(baseline)

      // Unmount the portal — the subscription must be cleaned up, not leaked.
      await act(async () => root.render(<primitive object={container} />))
      expect(live.size).toBe(baseline)
    } finally {
      subscribeSpy.mockRestore()
    }
  })

  // The portal copies the parent state during render but only subscribes in a layout
  // effect. Parent changes made in between, here by an earlier sibling's layout effect,
  // must still reach the portal.
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

    // Runs after the portal's layout effect, before anything else can resync it
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
