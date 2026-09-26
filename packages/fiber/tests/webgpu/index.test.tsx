/**
 * @fileoverview The @react-three/fiber/webgpu entry: build flags and core features on real roots.
 * The TSL resource hook tests live in packages/tsl/tests.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three/webgpu'
import { mix } from 'three/tsl'
import { createCanvas } from '../../../test-renderer/src/createTestCanvas'
import {
  ReconcilerRoot,
  createRoot as createRootImpl,
  useThree,
  extend,
  R3F_BUILD_LEGACY,
  R3F_BUILD_WEBGPU,
} from '../../src/webgpu'

// Note: WebGPU entry auto-extends THREE with node materials
// No need to call extend() manually

//* Test Setup ==============================

let root: ReconcilerRoot<HTMLCanvasElement> = null!
const roots: ReconcilerRoot<HTMLCanvasElement>[] = []

// Suppress WebGL deprecation warning in WebGPU tests
// (Jest resolves #three to default entry with both flags true, but built bundles are correct)
const originalWarn = console.warn
const originalLog = console.log

beforeAll(() => {
  console.log = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    // Skip WebGL deprecation logs (heading and empty line before it)
    if (message.includes('WebGlRenderer Usage')) return
    if (args.length === 0) return
    if (args.length === 1 && message === 'undefined') return
    originalLog.apply(console, args)
  }

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    if (message.includes('WebGlRenderer usage is deprecated')) return
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.warn = originalWarn
  console.log = originalLog
})

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
describe('WebGPU Build Flags', () => {
  // NOTE: In Jest, babel resolves #three to the default (three/index.ts)
  // So both flags are true. In the BUILT bundle, webgpu/index.mjs will have:
  // R3F_BUILD_LEGACY=false, R3F_BUILD_WEBGPU=true
  // Verify with: yarn build && yarn verify-bundles

  it('should export R3F_BUILD_WEBGPU as true', () => {
    expect(R3F_BUILD_WEBGPU).toBe(true)
  })

  it('should export R3F_BUILD_LEGACY as false (no legacy in webgpu)', () => {
    // WebGPU entry uses explicit path to three/webgpu.ts which has LEGACY=false
    expect(R3F_BUILD_LEGACY).toBe(false)
  })
})

//* Hook Exports ==============================

describe('Core R3F Features', () => {
  it('leaves the TSL fields to @react-three/tsl', async () => {
    let state: any = null

    function Test() {
      state = useThree()
      return null
    }

    await act(async () => root.render(<Test />))

    // Core creates none of them; the tsl package's root extension adds them (packages/tsl/tests).
    for (const key of ['uniforms', 'nodes', 'buffers', 'gpuStorage', '_hmrVersion', 'renderPipeline', 'passes']) {
      expect(state[key]).toBeUndefined()
    }
    expect(state.textures).toBeInstanceOf(Map)
  })

  it('should render three.js elements', async () => {
    const store = await act(async () => root.render(<mesh />))
    const { scene } = store.getState()

    // Camera is at [0], rendered content starts at [1]
    expect(scene.children.length).toBe(2)
    expect(scene.children[1]).toBeInstanceOf(THREE.Mesh)
  })
})
