/**
 * @fileoverview Core R3F tests (renderer-agnostic)
 *
 * These tests use the default @react-three/fiber import which supports
 * both WebGL and WebGPU renderers. WebGL-specific tests are in ../legacy/
 */
import * as React from 'react'
import * as THREE from 'three'
import ts from 'typescript'
import * as path from 'path'
import { createCanvas } from '../../../test-renderer/src/createTestCanvas'
import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  act,
  useThree,
  createPortal,
  RootState,
  RootStore,
  extend,
} from '../../src/index'

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

    // Note: instanceof check may fail with multiple THREE instances
    // Just check if it's an orthographic camera by duck-typing
    expect((camera as THREE.OrthographicCamera).isOrthographicCamera).toBe(true)
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
    const webExports = getExports(path.resolve(__dirname, '../../src/index.tsx'))
    expect(webExports).toMatchSnapshot()
  })

  // Note: native.tsx no longer exists in the same form, skip this test
  // it('are consistent between targets', () => {
  //   const webExports = getExports(path.resolve(__dirname, '../../src/index.tsx'))
  //   const nativeExports = getExports(path.resolve(__dirname, '../../src/native.tsx'))
  //   expect(webExports).toStrictEqual(nativeExports)
  // })
})
