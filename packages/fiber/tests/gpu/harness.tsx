/**
 * Shared helpers for the Tier-3 suite (`pnpm test:gpu`, `vitest.gpu.config.ts`).
 *
 * These tests run in `vitest-environment-webgpu-node`: Dawn in Node backs `navigator.gpu`, and
 * `createCanvas()` returns a headless canvas whose `webgpu` context renders into a real texture.
 * There is no DOM layout, `ResizeObserver` or pointer events, so roots come from `createRoot` with
 * an explicit size, never `<Canvas>`. Event and `<Canvas>` behaviour stays in the jsdom suite.
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three/webgpu'
import { createCanvas, type HeadlessCanvas, type RgbaImage } from 'vitest-environment-webgpu-node'
import { Scheduler } from '@pmndrs/scheduler'
import {
  advance,
  createRoot,
  unmountComponentAtNode,
  type ReconcilerRoot,
  type RenderProps,
  type RootState,
  type RootStore,
} from '@react-three/fiber'

// The jsdom suite sets this in setupTests.ts, which this project does not load
globalThis.IS_REACT_ACT_ENVIRONMENT = true

export type RGBA = [number, number, number, number]

/** An orthographic camera whose frustum is exactly a 2x2 plane at the origin. */
export function quadCamera(): THREE.OrthographicCamera {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1
  // Keep R3F from refitting the frustum to the canvas size
  ;(camera as THREE.OrthographicCamera & { manual: boolean }).manual = true
  return camera
}

export interface GPURoot {
  canvas: HeadlessCanvas
  root: ReconcilerRoot<HTMLCanvasElement>
  store: RootStore
  state(): RootState
  /** Draw one frame through R3F's own loop (the scheduler job a real frame runs). */
  frame(): void
  /** Resolves once teardown has finished, including an async renderer dispose(). */
  unmount(): Promise<void>
}

export interface MountOptions extends Partial<RenderProps<HTMLCanvasElement>> {
  /** Mount on this canvas instead of a fresh one (e.g. the one a caller's renderer was built on). */
  canvas?: HeadlessCanvas
  /** Size of a fresh canvas element before R3F sizes it. Defaults to `size`. */
  canvasSize?: { width: number; height: number }
}

const live = new Set<GPURoot>()

/**
 * Configure and render a root on a headless canvas. The frameloop is `never`, so nothing
 * draws until the test calls `frame()`. Tone mapping is switched off after configure so read-back
 * colours equal the material colours.
 */
export async function mount(children: React.ReactNode, options: MountOptions = {}): Promise<GPURoot> {
  const { canvas: given, canvasSize, size = { width: 32, height: 32, top: 0, left: 0 }, ...props } = options
  const canvas = given ?? createCanvas(canvasSize?.width ?? size.width, canvasSize?.height ?? size.height)
  const element = canvas.asElement<HTMLCanvasElement>()
  const root = createRoot(element)

  let store!: RootStore
  await act(async () => {
    await root.configure({ size, dpr: 1, frameloop: 'never', camera: quadCamera(), ...props })
    store = root.render(children)
  })
  store.getState().renderer.toneMapping = THREE.NoToneMapping

  const handle: GPURoot = {
    canvas,
    root,
    store,
    state: () => store.getState(),
    frame: () => advance(performance.now(), true, store.getState()),
    unmount: () =>
      new Promise<void>((resolve) => {
        live.delete(handle)
        act(() => unmountComponentAtNode(element, () => resolve()))
      }),
  }
  live.add(handle)
  return handle
}

/** Unmount whatever a test left mounted, then reset the global scheduler. Call from afterEach. */
export async function cleanup(): Promise<void> {
  await Promise.all([...live].map((handle) => handle.unmount()))
  Scheduler.reset()
}

/** The GPU device behind a WebGPURenderer. */
export function deviceOf(state: RootState): GPUDevice {
  return (state.renderer as unknown as { backend: { device: GPUDevice } }).backend.device
}

/** Run `fn` and resolve with the first validation error the device raised meanwhile, or null. */
export async function captureValidationError(device: GPUDevice, fn: () => void): Promise<GPUError | null> {
  device.pushErrorScope('validation')
  fn()
  return device.popErrorScope()
}

/** One RGBA8 pixel of a read-back image; (0, 0) is the top-left corner. */
export function pixelAt(image: RgbaImage, x: number, y: number): RGBA {
  const i = (y * image.width + x) * 4
  return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]]
}

/** The centre pixel of the canvas's current texture. */
export async function centrePixel(canvas: HeadlessCanvas): Promise<RGBA> {
  const image = await canvas.readPixels()
  return pixelAt(image, image.width >> 1, image.height >> 1)
}

/**
 * Assert a pixel within `tolerance` per channel. Rasterizers (lavapipe, Metal, a real GPU) round
 * slightly differently, so exact equality would tie the suite to one driver.
 */
export function expectColor(actual: RGBA, expected: RGBA, tolerance = 2): void {
  const close = actual.every((value, i) => Math.abs(value - expected[i]) <= tolerance)
  if (!close) expect(actual).toEqual(expected)
}

export const RED: RGBA = [255, 0, 0, 255]
export const GREEN: RGBA = [0, 255, 0, 255]
export const BLUE: RGBA = [0, 0, 255, 255]
