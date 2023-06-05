import * as React from 'react'
import * as THREE from 'three'
import * as ts from 'typescript'
import * as path from 'path'
import { ReconcilerRoot, createRoot, act, useFrame, useThree, createPortal, RootState, RootStore } from '../src/index'
import { privateKeys } from '../src/core/store'

let root: ReconcilerRoot<HTMLCanvasElement> = null!

beforeEach(() => (root = createRoot(document.createElement('canvas'))))
afterEach(async () => act(async () => root.unmount()))

describe('createRoot', () => {
  it('should return a Zustand store', async () => {
    const store = await act(async () => root.render(null))
    expect(() => store.getState()).not.toThrow()
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
    let store: RootStore = null!
    await act(async () => {
      store = root.configure({ dpr: [1, 2], performance: { min: 0.2 } }).render(<group />)
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

    // Preserves internal keys
    const overwrittenKeys = ['get', 'set', 'events', 'size', 'viewport']
    const respectedKeys = privateKeys.filter((key) => overwrittenKeys.includes(key) || state[key] === portalState[key])
    expect(respectedKeys).toStrictEqual(privateKeys)
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
