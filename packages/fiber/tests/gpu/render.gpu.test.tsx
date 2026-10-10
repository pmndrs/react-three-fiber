/**
 * Basic rendering on the root entry, against a real WebGPU device (Tier 3).
 *
 * The jsdom suite proves R3F builds the right renderer; it cannot prove that renderer draws. These
 * tests read the pixels back.
 */
import * as React from 'react'
import type * as THREE from 'three/webgpu'
import { extendMatchers } from 'vitest-screenshot'

import { BLUE, RED, centrePixel, cleanup, expectColor, mount, pixelAt } from './harness'

extendMatchers()

afterEach(cleanup)

const Quad = ({ color }: { color: string }) => (
  <mesh>
    <planeGeometry args={[2, 2]} />
    <meshBasicNodeMaterial color={color} />
  </mesh>
)

describe('rendering on the root entry', () => {
  it('builds a WebGPURenderer on the WebGPU backend and exposes it as gl', async () => {
    const { state } = await mount(<Quad color="red" />)
    const renderer = state().renderer as THREE.WebGPURenderer

    expect(renderer.isWebGPURenderer).toBe(true)
    expect((renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend).toBe(true)
    expect(state().webGPUSupported).toBe(true)
    expect(state().gl).toBe(renderer)
  })

  it('draws the first frame without a manual init()', async () => {
    const { canvas, frame } = await mount(<Quad color="red" />)

    frame()

    const image = await canvas.readPixels()
    expect([image.width, image.height]).toEqual([32, 32])
    // Corners and centre: the quad fills the frustum
    const points = [
      [0, 0],
      [31, 0],
      [0, 31],
      [31, 31],
      [16, 16],
    ]
    for (const [x, y] of points) {
      expectColor(pixelAt(image, x, y), RED)
    }
  })

  it('compiles a node material resolved from the root namespace and redraws after a prop change', async () => {
    const { canvas, frame, root } = await mount(<Quad color="red" />)
    frame()
    expectColor(await centrePixel(canvas), RED)

    await React.act(async () => root.render(<Quad color="blue" />))
    frame()
    expectColor(await centrePixel(canvas), BLUE)
  })

  it('matches the screenshot baseline', async () => {
    const { canvas, frame } = await mount(
      <mesh rotation={[0.6, 0.8, 0]}>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshNormalNodeMaterial />
      </mesh>,
      { size: { width: 64, height: 64, top: 0, left: 0 } },
    )
    frame()

    // Rasterizers disagree on edge pixels; the faces must match
    await expect(canvas).toMatchScreenshot('rotated-box.png', {
      comparatorOptions: { allowedMismatchedPixelRatio: 0.02 },
    })
  })
})
