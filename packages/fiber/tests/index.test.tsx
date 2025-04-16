import * as React from 'react'
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
    await React.act(async () => root.unmount())
  }
  roots.length = 0
})

describe('createRoot', () => {
  it('should return a Zustand store', async () => {
    const store = await React.act(async () => root.render(null))
    expect(() => store.getState()).not.toThrow()
  })

  it('will make an Orthographic Camera & set the position', async () => {
    const store = await React.act(async () =>
      (await root.configure({ orthographic: true, camera: { position: [0, 0, 5] } })).render(<group />),
    )
    const { camera } = store.getState()

    expect(camera).toBeInstanceOf(THREE.OrthographicCamera)
    expect(camera.position.z).toEqual(5)
  })

  // TODO: deprecate
  it('should handle an performance changing functions', async () => {
    let store: RootStore = null!
    await React.act(async () => {
      store = (await root.configure({ dpr: [1, 2], performance: { min: 0.2 } })).render(<group />)
    })

    expect(store.getState().viewport.initialDpr).toEqual(window.devicePixelRatio)
    expect(store.getState().performance.min).toEqual(0.2)
    expect(store.getState().performance.current).toEqual(1)

    await React.act(async () => {
      store.getState().setDpr(0.1)
    })

    expect(store.getState().viewport.dpr).toEqual(0.1)

    jest.useFakeTimers()

    await React.act(async () => {
      store.getState().performance.regress()
      jest.advanceTimersByTime(100)
    })

    expect(store.getState().performance.current).toEqual(0.2)

    await React.act(async () => {
      jest.advanceTimersByTime(200)
    })

    expect(store.getState().performance.current).toEqual(1)

    jest.useRealTimers()
  })

  it('should handle the DPR prop reactively', async () => {
    // Initial clamp
    const store = await React.act(async () => (await root.configure({ dpr: [1, 2] })).render(<group />))
    expect(store.getState().viewport.dpr).toEqual(window.devicePixelRatio)

    // Reactive update
    await React.act(async () => store.getState().setDpr(0.1))
    expect(store.getState().viewport.dpr).toEqual(0.1)

    // Reactive clamp
    await React.act(async () => store.getState().setDpr([1, 2]))
    expect(store.getState().viewport.dpr).toEqual(window.devicePixelRatio)
  })

  it('should set PCFSoftShadowMap as the default shadow map', async () => {
    const store = await React.act(async () => (await root.configure({ shadows: true })).render(<group />))
    const { gl } = store.getState()

    expect(gl.shadowMap.type).toBe(THREE.PCFSoftShadowMap)
  })

  it('should set tonemapping to ACESFilmicToneMapping and outputColorSpace to SRGBColorSpace if linear is false', async () => {
    const store = await React.act(async () => (await root.configure({ linear: false })).render(<group />))
    const { gl } = store.getState()

    expect(gl.toneMapping).toBe(THREE.ACESFilmicToneMapping)
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('should toggle render mode in xr', async () => {
    let state: RootState = null!

    await React.act(async () => {
      state = root.render(<group />).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(state.gl.xr.enabled).toEqual(true)

    await React.act(async () => {
      state.gl.xr.isPresenting = false
      state.gl.xr.dispatchEvent({ type: 'sessionend' })
    })

    expect(state.gl.xr.enabled).toEqual(false)
  })

  it('should respect frameloop="never" in xr', async () => {
    let respected = true

    const Test = () => useFrame(() => (respected = false))

    await React.act(async () => {
      const state = (await root.configure({ frameloop: 'never' })).render(<Test />).getState()
      state.gl.xr.isPresenting = true
      state.gl.xr.dispatchEvent({ type: 'sessionstart' })
    })

    expect(respected).toEqual(true)
  })

  it('should set renderer props via gl prop', async () => {
    const store = await React.act(async () =>
      (await root.configure({ gl: { logarithmicDepthBuffer: true } })).render(<group />),
    )
    const { gl } = store.getState()

    expect(gl.capabilities.logarithmicDepthBuffer).toBe(true)
  })

  it('should update scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    await React.act(async () => {
      scene = (await root.configure({ scene: { name: 'test' } })).render(<group />).getState().scene
    })

    expect(scene.name).toBe('test')
  })

  it('should set a custom scene via scene prop', async () => {
    let scene: THREE.Scene = null!

    const prop = new THREE.Scene()

    await React.act(async () => {
      scene = (await root.configure({ scene: prop })).render(<group />).getState().scene
    })

    expect(prop).toBe(scene)
  })

  it('should set a renderer via gl callback', async () => {
    class Renderer extends THREE.WebGLRenderer {}

    let gl: Renderer = null!
    await React.act(async () => {
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

    await React.act(async () => (await createRoot().configure({ linear: true })).render(<Test />))
    expect(gl.outputColorSpace).toBe(THREE.LinearSRGBColorSpace)
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)

    await React.act(async () => (await createRoot().configure({ linear: false })).render(<Test />))
    expect(gl.outputColorSpace).toBe(THREE.SRGBColorSpace)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('should respect legacy prop', async () => {
    THREE.ColorManagement.enabled = true

    await React.act(async () => {
      ;(await root.configure({ legacy: true })).render(<group />)
    })
    expect(THREE.ColorManagement.enabled).toBe(false)

    await React.act(async () => {
      ;(await root.configure({ legacy: false })).render(<group />)
    })
    expect(THREE.ColorManagement.enabled).toBe(true)
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

    await React.act(async () => {
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

    await React.act(async () => root.render(<Test key={0} />))

    expect(groupHandle).toBeDefined()
    const prevUUID = groupHandle!.uuid

    await React.act(async () => root.render(<Test key={1} />))

    expect(groupHandle).toBeDefined()
    expect(prevUUID).not.toBe(groupHandle!.uuid)
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
