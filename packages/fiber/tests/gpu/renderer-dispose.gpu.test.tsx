/**
 * Renderer disposal against a real device (Tier 3).
 *
 * `renderer-dispose.test.tsx` checks which renderer R3F calls dispose() on, against a mock. This
 * checks what that does to the GPU: the device behind a renderer R3F built is destroyed with it,
 * and a renderer the caller passed in keeps its device and still draws after the root is gone.
 */
import * as React from 'react'
import * as THREE from 'three/webgpu'
import { createCanvas } from 'vitest-environment-webgpu-node'

import { RED, centrePixel, cleanup, deviceOf, expectColor, mount, quadCamera } from './harness'

afterEach(cleanup)

const Quad = () => (
  <mesh>
    <planeGeometry args={[2, 2]} />
    <meshBasicNodeMaterial color="red" />
  </mesh>
)

/** Resolves with the reason the device was lost, or 'alive' if it was not lost within `ms` */
function lossWithin(device: GPUDevice, ms = 500): Promise<GPUDeviceLostReason | 'alive'> {
  return Promise.race([
    device.lost.then((info) => info.reason),
    new Promise<'alive'>((resolve) => setTimeout(() => resolve('alive'), ms)),
  ])
}

describe('renderer disposal on unmount', () => {
  it('destroys the device of a renderer R3F built', async () => {
    const root = await mount(<Quad />)
    root.frame()
    const device = deviceOf(root.state())

    await root.unmount()

    expect(await lossWithin(device)).toBe('destroyed')
  })

  it('destroys a shared renderer only when its last canvas unmounts', async () => {
    const primary = await mount(<Quad />, { primary: true })
    const secondary = await mount(<Quad />)
    const device = deviceOf(primary.state())

    // The secondary still draws through it, so the primary's unmount must not dispose it
    await primary.unmount()
    expect(await lossWithin(device, 100)).toBe('alive')

    await secondary.unmount()
    expect(await lossWithin(device)).toBe('destroyed')
  })

  it('leaves a renderer the caller passed in alive and usable', async () => {
    const canvas = createCanvas(32, 32)
    const renderer = new THREE.WebGPURenderer({ canvas: canvas.asElement<HTMLCanvasElement>() })
    await renderer.init()
    renderer.toneMapping = THREE.NoToneMapping

    const root = await mount(<Quad />, { canvas, renderer })
    expect(root.state().renderer).toBe(renderer)
    const device = deviceOf(root.state())

    await root.unmount()
    expect(await lossWithin(device, 100)).toBe('alive')

    // Still the caller's to draw with ...
    const scene = new THREE.Scene()
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicNodeMaterial({ color: 'red' })))
    renderer.render(scene, quadCamera())
    expectColor(await centrePixel(canvas), RED)

    // ... and to dispose
    await renderer.dispose()
    expect(await lossWithin(device)).toBe('destroyed')
  })
})
