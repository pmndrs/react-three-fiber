import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { ReconcilerRoot, createRoot, Canvas, useThree } from '../src/index'

/**
 * Canvas size control — Tier 1 (jsdom).
 *
 * Covers:
 *  - the `setSize` ownership state machine in `src/core/store.ts`
 *    (setSize() reset, setSize(n) square, setSize(w, h) rectangle, and the
 *    imperative-ownership transitions vs. auto/measured sizing during configure)
 *  - the `width` / `height` / `forceEven` Canvas props in `src/core/Canvas.tsx`
 *    (props override the measured container size; forceEven rounds up to even).
 *
 * All assertions read the store `size` state directly, so nothing here needs a GPU.
 */

const baseSize = { width: 100, height: 100, top: 0, left: 0 }

describe('setSize ownership state machine', () => {
  let root: ReconcilerRoot<HTMLCanvasElement> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })
  afterEach(async () => act(async () => root.unmount()))

  it('configure() applies the measured/props size without taking imperative ownership', async () => {
    const store = await act(async () => (await root.configure({ size: baseSize })).render(null))
    const state = store.getState()

    expect(state.size).toMatchObject({ width: 100, height: 100 })
    // configure() must leave ownership with auto/measured mode
    expect(state._sizeImperative).toBe(false)
  })

  it('setSize(n) sets a square and takes imperative ownership', async () => {
    const store = await act(async () => (await root.configure({ size: baseSize })).render(null))
    const state = store.getState()

    await act(async () => state.setSize(50))

    expect(store.getState().size).toMatchObject({ width: 50, height: 50 })
    expect(store.getState()._sizeImperative).toBe(true)
  })

  it('setSize(w, h) sets an explicit rectangle and takes imperative ownership', async () => {
    const store = await act(async () => (await root.configure({ size: baseSize })).render(null))
    const state = store.getState()

    await act(async () => state.setSize(320, 240))

    expect(store.getState().size).toMatchObject({ width: 320, height: 240 })
    expect(store.getState()._sizeImperative).toBe(true)
  })

  it('setSize(w, h, top, left) forwards top/left offsets', async () => {
    const store = await act(async () => (await root.configure({ size: baseSize })).render(null))
    const state = store.getState()

    await act(async () => state.setSize(320, 240, 10, 20))

    expect(store.getState().size).toMatchObject({ width: 320, height: 240, top: 10, left: 20 })
  })

  it('explicit imperative size blocks a subsequent configure() from overwriting it', async () => {
    // Initial auto size
    const store = await act(async () => (await root.configure({ size: baseSize })).render(null))
    expect(store.getState().size.width).toBe(100)

    // User takes ownership imperatively
    await act(async () => store.getState().setSize(200, 200))
    expect(store.getState().size.width).toBe(200)
    expect(store.getState()._sizeImperative).toBe(true)

    // A resize-driven re-configure with a different size must NOT clobber the imperative size
    await act(async () => root.configure({ size: { width: 400, height: 400, top: 0, left: 0 } }))
    expect(store.getState().size.width).toBe(200)
    expect(store.getState().size.height).toBe(200)
  })

  it('setSize() with no args releases ownership so configure() can size again', async () => {
    const store = await act(async () => (await root.configure({ size: baseSize })).render(null))

    // Take ownership
    await act(async () => store.getState().setSize(200, 200))
    expect(store.getState()._sizeImperative).toBe(true)

    // Release ownership back to auto/measured mode (no stored _sizeProps to reapply)
    await act(async () => store.getState().setSize())
    expect(store.getState()._sizeImperative).toBe(false)

    // Now a re-configure is free to apply the new measured size
    await act(async () => root.configure({ size: { width: 400, height: 400, top: 0, left: 0 } }))
    expect(store.getState().size.width).toBe(400)
    expect(store.getState().size.height).toBe(400)
  })

  it('setSize() reset re-applies stored _sizeProps (props ownership)', async () => {
    // _sizeProps mirror the width/height Canvas props; a reset should restore them
    const store = await act(async () =>
      (await root.configure({ size: baseSize, _sizeProps: { width: 150, height: 200 } })).render(null),
    )

    // Take imperative ownership with a different size
    await act(async () => store.getState().setSize(999, 999))
    expect(store.getState().size).toMatchObject({ width: 999, height: 999 })

    // Reset — stored props win over the imperative value
    await act(async () => store.getState().setSize())
    expect(store.getState()._sizeImperative).toBe(false)
    expect(store.getState().size).toMatchObject({ width: 150, height: 200 })
  })
})

describe('Canvas width / height / forceEven props', () => {
  let captured: { width: number; height: number } = null!

  function SizeProbe() {
    captured = useThree((s) => s.size)
    return null
  }

  beforeEach(() => {
    captured = null!
  })

  it('width/height props override the measured container size', async () => {
    // setupTests mocks the container measurement to 1280x800; explicit props must win
    await act(async () =>
      render(
        <Canvas width={640} height={480}>
          <SizeProbe />
        </Canvas>,
      ),
    )
    await act(async () => new Promise((r) => setTimeout(r, 20)))

    expect(captured.width).toBe(640)
    expect(captured.height).toBe(480)
  })

  it('forceEven rounds odd width/height up to even dimensions', async () => {
    await act(async () =>
      render(
        <Canvas width={101} height={103} forceEven>
          <SizeProbe />
        </Canvas>,
      ),
    )
    await act(async () => new Promise((r) => setTimeout(r, 20)))

    // ceil(101/2)*2 = 102, ceil(103/2)*2 = 104
    expect(captured.width).toBe(102)
    expect(captured.height).toBe(104)
  })

  it('without forceEven, odd width/height pass through unchanged', async () => {
    await act(async () =>
      render(
        <Canvas width={101} height={103}>
          <SizeProbe />
        </Canvas>,
      ),
    )
    await act(async () => new Promise((r) => setTimeout(r, 20)))

    expect(captured.width).toBe(101)
    expect(captured.height).toBe(103)
  })
})
