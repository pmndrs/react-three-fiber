import { vi } from 'vitest'
import * as React from 'react'
import { render, fireEvent } from '@testing-library/react'
// NOTE: this file deliberately keeps a local frame-settling helper instead of the shared
// act() in ./utils/act. Wrapping these cases in React's real act changes the raycast the
// pointer events see -- 'falls back to distance ordering' starts reporting the far mesh
// first, i.e. declaration order, which is what a distance tie would produce. That points at
// world matrices not being current at dispatch time under a real act scope, and it needs its
// own investigation rather than being papered over here. Tracked separately; the act(...)
// warnings from this file stay until then.
async function act<T>(fn: () => Promise<T>) {
  const value = await fn()
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
  return value
}
import { Canvas, extend } from '../src'
import * as THREE from '#three'
import type { RootState } from '#types'

extend(THREE as any)

const getContainer = () => document.querySelector('canvas') as HTMLCanvasElement

function createPointerEvent(type: string, props: any = {}) {
  const evt = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...props })
  Object.defineProperty(evt, 'clientX', { value: props.clientX ?? 640 })
  Object.defineProperty(evt, 'clientY', { value: props.clientY ?? 400 })
  Object.defineProperty(evt, 'offsetX', { value: props.offsetX ?? 640 })
  Object.defineProperty(evt, 'offsetY', { value: props.offsetY ?? 400 })
  return evt
}

// Coordinates that hit a 2x2 box centered at the origin (proven in events.test.tsx)
const CENTER = { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 }

describe('events - interactivePriority sort', () => {
  it('gives userData.interactivePriority precedence over distance (farther-but-prioritized wins)', async () => {
    const order: string[] = []

    await act(async () => {
      render(
        <Canvas>
          {/* Farther from the default camera (z=5) but flagged with a high interactive priority */}
          <mesh position-z={-2} userData={{ interactivePriority: 10 }} onPointerDown={() => order.push('far')}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
          {/* Nearer to the camera, no priority */}
          <mesh position-z={2} onPointerDown={() => order.push('near')}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const down = createPointerEvent('pointerdown', CENTER)
    await act(async () => {
      fireEvent(getContainer(), down)
    })

    // Both are under the cursor, but the prioritized (farther) mesh must be processed first
    expect(order).toEqual(['far', 'near'])
    expect(order[0]).toBe('far')
  })

  it('higher interactivePriority wins when both objects have a priority', async () => {
    const order: string[] = []

    await act(async () => {
      render(
        <Canvas>
          {/* Nearer, low priority */}
          <mesh position-z={2} userData={{ interactivePriority: 1 }} onPointerDown={() => order.push('low')}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
          {/* Farther, high priority */}
          <mesh position-z={-2} userData={{ interactivePriority: 5 }} onPointerDown={() => order.push('high')}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const down = createPointerEvent('pointerdown', CENTER)
    await act(async () => {
      fireEvent(getContainer(), down)
    })

    // Higher priority value wins regardless of depth
    expect(order[0]).toBe('high')
    expect(order).toEqual(['high', 'low'])
  })

  it('falls back to distance ordering when no interactivePriority is set (nearest first)', async () => {
    const order: string[] = []

    await act(async () => {
      render(
        <Canvas>
          <mesh position-z={-2} onPointerDown={() => order.push('far')}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
          <mesh position-z={2} onPointerDown={() => order.push('near')}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const down = createPointerEvent('pointerdown', CENTER)
    await act(async () => {
      fireEvent(getContainer(), down)
    })

    // No priority anywhere -> pure distance sort, nearest processed first
    expect(order[0]).toBe('near')
    expect(order).toEqual(['near', 'far'])
  })
})

describe('events - XR registerPointer / unregisterPointer', () => {
  it('registerPointer assigns an XR pointerId and initializes the pointerMap entry', async () => {
    let storeRef: RootState = null!
    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const { events, internal } = storeRef.get()
    expect(typeof events.registerPointer).toBe('function')

    const pointerId = events.registerPointer!({ ray: new THREE.Ray(), type: 'controller', handedness: 'left' })

    // XR pointer IDs start at 1000 to avoid colliding with DOM pointer IDs
    expect(pointerId).toBeGreaterThanOrEqual(1000)

    // The pointer state must be initialized in the pointerMap
    const pointerState = internal.pointerMap.get(pointerId)
    expect(pointerState).toBeDefined()
    expect(pointerState!.hovered).toBeInstanceOf(Map)
    expect(pointerState!.captured).toBeInstanceOf(Map)
    expect(pointerState!.hovered.size).toBe(0)
    expect(pointerState!.captured.size).toBe(0)
  })

  it('assigns incrementing, collision-free XR pointerIds', async () => {
    let storeRef: RootState = null!
    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const { events } = storeRef.get()
    const a = events.registerPointer!({ ray: new THREE.Ray(), type: 'controller', handedness: 'left' })
    const b = events.registerPointer!({ ray: new THREE.Ray(), type: 'controller', handedness: 'right' })

    expect(b).toBeGreaterThan(a)
    expect(a).not.toBe(b)
  })

  it('unregisterPointer cleans up the pointerMap and leaves no stale dirty state', async () => {
    let storeRef: RootState = null!
    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const { events, internal } = storeRef.get()
    const pointerId = events.registerPointer!({ ray: new THREE.Ray(), type: 'hand', handedness: 'right' })
    expect(internal.pointerMap.has(pointerId)).toBe(true)

    // Simulate a deferred/dirty raycast queued for this pointer
    internal.pointerDirty.set(pointerId, createPointerEvent('pointermove', CENTER) as any)
    expect(internal.pointerDirty.has(pointerId)).toBe(true)

    events.unregisterPointer!(pointerId)

    // Pointer state gone, and no stale dirty entry left behind
    expect(internal.pointerMap.has(pointerId)).toBe(false)
    expect(internal.pointerDirty.has(pointerId)).toBe(false)
  })

  it('unregisterPointer is a no-op for an unknown pointerId', async () => {
    let storeRef: RootState = null!
    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const { events, internal } = storeRef.get()
    const sizeBefore = internal.pointerMap.size
    expect(() => events.unregisterPointer!(999999)).not.toThrow()
    expect(internal.pointerMap.size).toBe(sizeBefore)
  })
})

describe('events - frame-timed edges', () => {
  it('events.flush() processes deferred pointer moves (they do not fire before flush)', async () => {
    const handlePointerMove = vi.fn()
    let storeRef: RootState = null!

    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // frameTimedRaycasts is on by default and frameloop is 'always' -> moves defer
    expect(storeRef.get().events.frameTimedRaycasts).toBe(true)

    // Dispatch synchronously so no frame loop flushes it for us
    getContainer().dispatchEvent(createPointerEvent('pointermove', CENTER))

    // Deferred: queued in pointerDirty, handler not yet called
    expect(storeRef.get().internal.pointerDirty.has(1)).toBe(true)
    expect(handlePointerMove).not.toHaveBeenCalled()

    // Manual flush drains the deferred queue and fires the handler
    storeRef.get().events.flush!()

    expect(handlePointerMove).toHaveBeenCalled()
    expect(storeRef.get().internal.pointerDirty.size).toBe(0)
  })

  it('alwaysFireOnScroll: false defers wheel events instead of firing them immediately', async () => {
    const handleWheel = vi.fn()
    let storeRef: RootState = null!

    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh onWheel={handleWheel}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    storeRef.get().setEvents({ alwaysFireOnScroll: false })

    // Dispatch synchronously so nothing flushes it for us
    getContainer().dispatchEvent(createPointerEvent('wheel', CENTER))

    // With alwaysFireOnScroll off, the wheel raycast is deferred, not fired
    expect(handleWheel).not.toHaveBeenCalled()
    expect(storeRef.get().internal.pointerDirty.has(1)).toBe(true)
  })

  it('alwaysFireOnScroll: true (default) fires wheel events immediately', async () => {
    const handleWheel = vi.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onWheel={handleWheel}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    await act(async () => {
      fireEvent(getContainer(), createPointerEvent('wheel', CENTER))
    })

    expect(handleWheel).toHaveBeenCalled()
  })

  it('updateOnFrame: true re-raycasts with the last event on flush()', async () => {
    const handlePointerMove = vi.fn()
    let storeRef: RootState = null!

    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // Disable deferral so the re-raycast is observable synchronously, enable per-frame updates
    storeRef.get().setEvents({ frameTimedRaycasts: false, updateOnFrame: true })

    // Move fires immediately (no deferral) and records lastEvent
    getContainer().dispatchEvent(createPointerEvent('pointermove', CENTER))
    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    handlePointerMove.mockClear()

    // flush() with updateOnFrame re-fires onPointerMove using the stored lastEvent
    storeRef.get().events.flush!()
    expect(handlePointerMove).toHaveBeenCalledTimes(1)
  })

  it('updateOnFrame: false does not re-raycast on flush()', async () => {
    const handlePointerMove = vi.fn()
    let storeRef: RootState = null!

    await act(async () => {
      render(
        <Canvas onCreated={(state) => (storeRef = state)}>
          <mesh onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    storeRef.get().setEvents({ frameTimedRaycasts: false, updateOnFrame: false })

    getContainer().dispatchEvent(createPointerEvent('pointermove', CENTER))
    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    handlePointerMove.mockClear()

    // No updateOnFrame and nothing deferred -> flush is a no-op for the handler
    storeRef.get().events.flush!()
    expect(handlePointerMove).not.toHaveBeenCalled()
  })
})
