import { vi } from 'vitest'
import * as React from 'react'
import * as THREE from '#three'
import { render, fireEvent } from '@testing-library/react'
import { Canvas, extend, useThree } from '../src/index'

async function act<T>(fn: () => T | Promise<T>) {
  const value = await fn()
  // Wait for R3F's initialization and frame loop
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res(null))))
  return value
}

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

describe('EventManager enabled property', () => {
  it('should auto-trigger hover events (onPointerEnter) when re-enabled over mesh', async () => {
    const handlePointerEnter = vi.fn()
    const handlePointerLeave = vi.fn()
    let setEnabled: ((value: boolean) => void) | null = null

    function EventController() {
      const state = useThree()

      React.useEffect(() => {
        setEnabled = (value: boolean) => {
          state.set((prev) => ({ events: { ...prev.events, enabled: value } }))
        }
      }, [state])

      return null
    }

    await act(async () => {
      render(
        <Canvas>
          <EventController />
          <mesh onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const moveOverMesh = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const moveAway = createPointerEvent('pointermove', { clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 })

    //* Step 1: Move over mesh - should fire enter
    await act(async () => {
      fireEvent(getContainer(), moveOverMesh)
    })
    expect(handlePointerEnter).toHaveBeenCalledTimes(1)

    //* Step 2: Move away - should fire leave
    await act(async () => {
      fireEvent(getContainer(), moveAway)
    })
    expect(handlePointerLeave).toHaveBeenCalledTimes(1)

    //* Step 3: Disable events
    await act(() => {
      if (setEnabled) setEnabled(false)
    })

    //* Step 4: Move back over mesh while disabled - should NOT fire
    await act(async () => {
      fireEvent(getContainer(), moveOverMesh)
    })
    expect(handlePointerEnter).toHaveBeenCalledTimes(1) // Still 1

    //* Step 5: Re-enable - should auto-trigger and fire enter event
    await act(() => {
      if (setEnabled) setEnabled(true)
    })

    //* Should have auto-fired enter event because pointer is over mesh
    expect(handlePointerEnter).toHaveBeenCalledTimes(2)
  })

  it('should auto-trigger raycaster update when re-enabled', async () => {
    const handlePointerMove = vi.fn()
    let setEnabled: ((value: boolean) => void) | null = null

    function EventController() {
      const state = useThree()

      React.useEffect(() => {
        setEnabled = (value: boolean) => {
          state.set((prev) => ({ events: { ...prev.events, enabled: value } }))
        }
      }, [state])

      return null
    }

    await act(async () => {
      render(
        <Canvas>
          <EventController />
          <mesh onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    //* Step 1: Move pointer over mesh to establish lastEvent
    const moveOverMesh = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    await act(async () => {
      fireEvent(getContainer(), moveOverMesh)
    })

    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    //* Step 2: Disable events
    await act(() => {
      if (setEnabled) setEnabled(false)
    })

    //* Step 3: Move pointer while disabled (this updates lastEvent but doesn't fire handlers)
    await act(async () => {
      fireEvent(getContainer(), moveOverMesh)
    })

    //* Should NOT have fired while disabled
    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    //* Step 4: Re-enable - should auto-trigger with lastEvent
    await act(() => {
      if (setEnabled) setEnabled(true)
    })

    //* Should have auto-fired because lastEvent has pointer over mesh
    expect(handlePointerMove).toHaveBeenCalledTimes(2)
  })

  it('should not fire events when disabled', async () => {
    const handleClick = vi.fn()
    const handlePointerMove = vi.fn()
    let setEnabled: ((value: boolean) => void) | null = null

    function EventController() {
      const state = useThree()

      React.useEffect(() => {
        setEnabled = (value: boolean) => {
          state.set((prev) => ({ events: { ...prev.events, enabled: value } }))
        }
      }, [state])

      return null
    }

    await act(async () => {
      render(
        <Canvas>
          <EventController />
          <mesh onClick={handleClick} onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    //* Disable events
    await act(() => {
      if (setEnabled) setEnabled(false)
    })

    //* Try to trigger events while disabled
    const moveEvent = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const downEvent = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const upEvent = createPointerEvent('pointerup', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const clickEvent = createPointerEvent('click', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), moveEvent)
      fireEvent(getContainer(), downEvent)
      fireEvent(getContainer(), upEvent)
      fireEvent(getContainer(), clickEvent)
    })

    //* None of the handlers should have been called
    expect(handleClick).not.toHaveBeenCalled()
    expect(handlePointerMove).not.toHaveBeenCalled()
  })

  it('should fire events normally when enabled', async () => {
    const handleClick = vi.fn()
    const handlePointerMove = vi.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onClick={handleClick} onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    //* Events are enabled by default
    const moveEvent = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const downEvent = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const upEvent = createPointerEvent('pointerup', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const clickEvent = createPointerEvent('click', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), moveEvent)
      fireEvent(getContainer(), downEvent)
      fireEvent(getContainer(), upEvent)
      fireEvent(getContainer(), clickEvent)
    })

    expect(handleClick).toHaveBeenCalled()
    expect(handlePointerMove).toHaveBeenCalled()
  })

  it('should allow toggling enabled on and off', async () => {
    const handlePointerMove = vi.fn()
    let setEnabled: ((value: boolean) => void) | null = null

    function EventController() {
      const state = useThree()

      React.useEffect(() => {
        setEnabled = (value: boolean) => {
          state.set((prev) => ({ events: { ...prev.events, enabled: value } }))
        }
      }, [state])

      return null
    }

    await act(async () => {
      render(
        <Canvas>
          <EventController />
          <mesh onPointerMove={handlePointerMove}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const moveEvent = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    //* Initially enabled - should work
    await act(async () => {
      fireEvent(getContainer(), moveEvent)
    })
    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    //* Disable - should not work
    await act(() => {
      if (setEnabled) setEnabled(false)
    })
    await act(async () => {
      fireEvent(getContainer(), moveEvent)
    })
    expect(handlePointerMove).toHaveBeenCalledTimes(1) // Still 1, not called

    //* Re-enable - auto-trigger fires + manual fire = 2 more calls
    await act(() => {
      if (setEnabled) setEnabled(true)
    })
    // Auto-trigger from subscription fires here (call #2)
    expect(handlePointerMove).toHaveBeenCalledTimes(2)

    await act(async () => {
      fireEvent(getContainer(), moveEvent)
    })
    // Manual fire (call #3)
    expect(handlePointerMove).toHaveBeenCalledTimes(3)

    //* Disable again
    await act(() => {
      if (setEnabled) setEnabled(false)
    })
    await act(async () => {
      fireEvent(getContainer(), moveEvent)
    })
  })
})
