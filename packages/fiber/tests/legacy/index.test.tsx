/**
 * @fileoverview Legacy (WebGL) specific tests
 *
 * Tests WebGL-specific functionality via @react-three/fiber/legacy.
 * Imports THREE from #three to use the same instance as R3F core.
 */
import * as React from 'react'
import * as THREE from '#three'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'
import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  act,
  useFrame,
  useThree,
  RootState,
  extend,
} from '../../src/legacy'

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

describe('Legacy WebGL Renderer', () => {
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

  // NOTE: XR manager requires browser APIs not available in JSDOM
  // WebGLRenderer.xr needs navigator.xr which JSDOM doesn't provide
  it.todo('should toggle render mode in xr')

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
})
