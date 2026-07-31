import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { ReconcilerRoot, createRoot } from '../src/index'

/**
 * textureColorSpace — Tier 1 (jsdom, WebGL).
 *
 * The R3F-level `textureColorSpace` config auto-assigns a color space to 8-bit
 * color-map textures (map / emissiveMap / sheenColorMap / specularColorMap / envMap)
 * when the renderer output is sRGB. The value is extracted from the `gl` or `renderer`
 * config bag in `src/core/renderer.tsx` and applied in `src/core/utils/props.ts`.
 *
 * These tests drive the WebGL (`gl={{...}}`) path end-to-end, which runs under the
 * jsdom WebGL mock. The `renderer={{...}}` config bag selects WebGPU, which cannot
 * init without a device — see the Tier-2 todo at the bottom.
 */

// 1x1 RGBA8 texture — DataTexture defaults to RGBAFormat + UnsignedByteType,
// which is exactly the 8-bit color-map shape the auto-assignment targets.
const makeColorTexture = () => new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1)

const size = { width: 100, height: 100, top: 0, left: 0 }

describe('textureColorSpace', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('defaults to SRGBColorSpace on color maps', async () => {
    const texture = makeColorTexture()
    // DataTexture starts with NoColorSpace, so a change to sRGB is observable
    expect(texture.colorSpace).toBe(THREE.NoColorSpace)

    await act(async () =>
      (await root.configure({ size })).render(
        <mesh>
          <meshBasicMaterial map={texture} />
        </mesh>,
      ),
    )

    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('falls back to the sRGB default when the config value is falsy (NoColorSpace)', async () => {
    // NoColorSpace is the empty string, which is falsy — the `|| SRGBColorSpace`
    // fallback in renderer.tsx's extraction swallows it, so color maps stay sRGB.
    const texture = makeColorTexture()

    await act(async () =>
      (await root.configure({ size, gl: { textureColorSpace: THREE.NoColorSpace } })).render(
        <mesh>
          <meshBasicMaterial map={texture} />
        </mesh>,
      ),
    )

    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('applies textureColorSpace from a gl={{ ... }} config bag (LinearSRGBColorSpace)', async () => {
    const texture = makeColorTexture()

    await act(async () =>
      (await root.configure({ size, gl: { textureColorSpace: THREE.LinearSRGBColorSpace } })).render(
        <mesh>
          <meshBasicMaterial map={texture} />
        </mesh>,
      ),
    )

    expect(texture.colorSpace).toBe(THREE.LinearSRGBColorSpace)
  })

  it('only touches color maps, not other texture slots', async () => {
    const colorMap = makeColorTexture()
    const alphaMap = makeColorTexture()

    await act(async () =>
      (await root.configure({ size, gl: { textureColorSpace: THREE.LinearSRGBColorSpace } })).render(
        <mesh>
          <meshBasicMaterial map={colorMap} alphaMap={alphaMap} />
        </mesh>,
      ),
    )

    // `map` is a color map → gets the configured space
    expect(colorMap.colorSpace).toBe(THREE.LinearSRGBColorSpace)
    // `alphaMap` is data, not color → must be left untouched (still NoColorSpace)
    expect(alphaMap.colorSpace).toBe(THREE.NoColorSpace)
  })

  // The application mechanism is fully covered by the gl={{...}} tests above; the
  // renderer={{...}} config bag extracts textureColorSpace identically (renderer.tsx),
  // but selecting the WebGPU renderer requires a real device init in configure().
  it.todo('covered by Tier 2: renderer={{ textureColorSpace }} config bag needs a WebGPU device')
})
