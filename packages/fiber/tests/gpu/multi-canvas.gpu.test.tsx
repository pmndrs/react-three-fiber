/**
 * Multi-canvas: secondaries draw through the primary's renderer with a CanvasTarget each (Tier 3).
 *
 * `multi-canvas-primary.test.tsx` covers the sharing rules and frame order in jsdom. This checks the
 * pixels: one device, every canvas showing its own scene, canvases of different sizes drawing with
 * attachments that match, and a secondary that resizes while it is not the active target (#3847).
 */
import * as React from 'react'
import { advance } from '@react-three/fiber'

import {
  BLUE,
  GREEN,
  RED,
  captureValidationError,
  centrePixel,
  cleanup,
  deviceOf,
  expectColor,
  mount,
  type GPURoot,
} from './harness'

afterEach(cleanup)

const Quad = ({ color }: { color: string }) => (
  <mesh>
    <planeGeometry args={[2, 2]} />
    <meshBasicNodeMaterial color={color} />
  </mesh>
)

/** One frame for every root, as the shared frameloop draws them */
const frameAll = () => advance(performance.now())

/** Draw every root and assert the device accepted the frame */
async function expectCleanFrame(root: GPURoot) {
  const error = await captureValidationError(deviceOf(root.state()), frameAll)
  expect(error?.message).toBeUndefined()
}

describe('a primary shared by other canvases', () => {
  it('draws each canvas with its own scene through one renderer', async () => {
    const primary = await mount(<Quad color="red" />, {
      id: 'main',
      primary: true,
      size: { width: 64, height: 64, top: 0, left: 0 },
    })
    const named = await mount(<Quad color="blue" />, {
      share: 'main',
      size: { width: 32, height: 16, top: 0, left: 0 },
    })
    // No share prop: a lone live primary is adopted automatically
    const automatic = await mount(<Quad color="lime" />, { size: { width: 48, height: 24, top: 0, left: 0 } })

    expect(named.state().renderer).toBe(primary.state().renderer)
    expect(automatic.state().renderer).toBe(primary.state().renderer)
    expect(named.state().internal.isSecondary).toBe(true)
    expect(automatic.state().internal.isSecondary).toBe(true)

    await expectCleanFrame(primary)

    expectColor(await centrePixel(primary.canvas), RED)
    expectColor(await centrePixel(named.canvas), BLUE)
    expectColor(await centrePixel(automatic.canvas), GREEN)
    expect([named.canvas.width, named.canvas.height]).toEqual([32, 16])
    expect([automatic.canvas.width, automatic.canvas.height]).toEqual([48, 24])
  })

  it('keeps drawing a secondary that resized while another canvas was active', async () => {
    const primary = await mount(<Quad color="red" />, { primary: true })
    const secondary = await mount(<Quad color="blue" />)
    await expectCleanFrame(primary)

    // The secondary is configured after a frame left some target active, then both draw again
    await React.act(async () => {
      await secondary.root.configure({ size: { width: 40, height: 20, top: 0, left: 0 } })
    })
    await expectCleanFrame(primary)

    expect([secondary.canvas.width, secondary.canvas.height]).toEqual([40, 20])
    expectColor(await centrePixel(secondary.canvas), BLUE)
    expectColor(await centrePixel(primary.canvas), RED)
  })

  it('keeps the primary drawing after a secondary unmounts', async () => {
    const primary = await mount(<Quad color="red" />, { primary: true })
    const secondary = await mount(<Quad color="blue" />)
    await expectCleanFrame(primary)

    await secondary.unmount()
    await React.act(async () => primary.root.render(<Quad color="lime" />))
    await expectCleanFrame(primary)

    expectColor(await centrePixel(primary.canvas), GREEN)
  })
})
