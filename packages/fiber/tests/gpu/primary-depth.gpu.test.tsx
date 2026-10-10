/**
 * A lone primary's depth attachment matches its drawing buffer (Tier 3).
 *
 * Regression for #3847 / #3905. three sizes the depth buffer from the renderer's own canvas target,
 * which reads the element's size once, at construction. A primary that drew through a second
 * CanvasTarget wrapped around the same element moved the swap chain to the configured size while
 * the depth buffer stayed at the element's construction size, and every frame raised a
 * GPUValidationError about mismatched attachments. The jsdom suite checks the target wiring
 * against a mock (`primary-canvas-target.test.tsx`); this checks a real device accepts the frame.
 */
import * as React from 'react'
import * as THREE from 'three/webgpu'

import { GREEN, captureValidationError, centrePixel, cleanup, deviceOf, expectColor, mount } from './harness'

afterEach(cleanup)

/** A green quad in front of a red one. The red one draws last, so only depth testing hides it. */
const Overlap = () => (
  <>
    <mesh position-z={0.5}>
      <planeGeometry args={[2, 2]} />
      <meshBasicNodeMaterial color="lime" />
    </mesh>
    <mesh position-z={-0.5} renderOrder={1}>
      <planeGeometry args={[2, 2]} />
      <meshBasicNodeMaterial color="red" />
    </mesh>
  </>
)

describe('a lone <Canvas primary>', () => {
  it('draws with a depth attachment the size of its drawing buffer', async () => {
    // The element starts at the browser default (300x150) and is configured to something else
    const { canvas, frame, state } = await mount(<Overlap />, {
      primary: true,
      canvasSize: { width: 300, height: 150 },
      size: { width: 64, height: 48, top: 0, left: 0 },
      dpr: 2,
    })

    const renderer = state().renderer as THREE.WebGPURenderer
    const drawingBuffer = renderer.getDrawingBufferSize(new THREE.Vector2())
    expect([canvas.width, canvas.height]).toEqual([128, 96])
    expect([drawingBuffer.x, drawingBuffer.y]).toEqual([128, 96])

    const error = await captureValidationError(deviceOf(state()), frame)
    expect(error?.message).toBeUndefined()

    const depth = renderer.getCanvasTarget().depthTexture.image as { width: number; height: number }
    expect([depth.width, depth.height]).toEqual([128, 96])
    expectColor(await centrePixel(canvas), GREEN)
  })

  it('keeps the depth attachment in step after a resize', async () => {
    const { canvas, frame, root, state } = await mount(<Overlap />, {
      primary: true,
      size: { width: 32, height: 32, top: 0, left: 0 },
    })
    frame()

    await React.act(async () => {
      await root.configure({ primary: true, size: { width: 80, height: 40, top: 0, left: 0 } })
    })

    const error = await captureValidationError(deviceOf(state()), frame)
    expect(error?.message).toBeUndefined()
    expect([canvas.width, canvas.height]).toEqual([80, 40])
    expectColor(await centrePixel(canvas), GREEN)
  })
})
