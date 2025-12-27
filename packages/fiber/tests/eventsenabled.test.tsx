import * as React from 'react'
import * as THREE from '#three'
import { render, fireEvent } from '@testing-library/react'
import { Canvas, extend, act, useThree } from '../src/index'

//* PointerEvent Polyfill ==============================
// JSDOM doesn't include PointerEvent
// https://github.com/jsdom/jsdom/pull/2666#issuecomment-691216178
if (!global.PointerEvent) {
  global.PointerEvent = class extends MouseEvent {
    readonly pointerId: number = 0
    readonly width: number = 1
    readonly height: number = 1
    readonly pressure: number = 0
    readonly tangentialPressure: number = 0
    readonly tiltX: number = 0
    readonly tiltY: number = 0
    readonly twist: number = 0
    readonly pointerType: string = ''
    readonly isPrimary: boolean = false
    readonly altitudeAngle: number = 0
    readonly azimuthAngle: number = 0

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      Object.assign(this, params)
    }

    getCoalescedEvents = () => []
    getPredictedEvents = () => []
  }
}

extend(THREE as any)

const getContainer = () => document.querySelector('canvas')?.parentNode?.parentNode as HTMLDivElement

describe('EventManager enabled property', () => {
  it('should auto-trigger hover events (onPointerEnter) when re-enabled over mesh', async () => {
    const handlePointerEnter = jest.fn()
    const handlePointerLeave = jest.fn()
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

    const moveOverMesh = new PointerEvent('pointermove')
    Object.defineProperty(moveOverMesh, 'offsetX', { get: () => 577 })
    Object.defineProperty(moveOverMesh, 'offsetY', { get: () => 480 })

    const moveAway = new PointerEvent('pointermove')
    Object.defineProperty(moveAway, 'offsetX', { get: () => 0 })
    Object.defineProperty(moveAway, 'offsetY', { get: () => 0 })

    //* Step 1: Move over mesh - should fire enter
    fireEvent(getContainer(), moveOverMesh)
    expect(handlePointerEnter).toHaveBeenCalledTimes(1)

    //* Step 2: Move away - should fire leave
    fireEvent(getContainer(), moveAway)
    expect(handlePointerLeave).toHaveBeenCalledTimes(1)

    //* Step 3: Disable events
    act(() => {
      if (setEnabled) setEnabled(false)
    })

    //* Step 4: Move back over mesh while disabled - should NOT fire
    fireEvent(getContainer(), moveOverMesh)
    expect(handlePointerEnter).toHaveBeenCalledTimes(1) // Still 1

    //* Step 5: Re-enable - should auto-trigger and fire enter event
    act(() => {
      if (setEnabled) setEnabled(true)
    })

    //* Should have auto-fired enter event because pointer is over mesh
    expect(handlePointerEnter).toHaveBeenCalledTimes(2)
  })

  it('should auto-trigger raycaster update when re-enabled', async () => {
    const handlePointerMove = jest.fn()
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
    const moveOverMesh = new PointerEvent('pointermove')
    Object.defineProperty(moveOverMesh, 'offsetX', { get: () => 577 })
    Object.defineProperty(moveOverMesh, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), moveOverMesh)

    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    //* Step 2: Disable events
    act(() => {
      if (setEnabled) setEnabled(false)
    })

    //* Step 3: Move pointer while disabled (this updates lastEvent but doesn't fire handlers)
    fireEvent(getContainer(), moveOverMesh)

    //* Should NOT have fired while disabled
    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    //* Step 4: Re-enable - should auto-trigger with lastEvent
    act(() => {
      if (setEnabled) setEnabled(true)
    })

    //* Should have auto-fired because lastEvent has pointer over mesh
    expect(handlePointerMove).toHaveBeenCalledTimes(2)
  })

  it('should not fire events when disabled', async () => {
    const handleClick = jest.fn()
    const handlePointerMove = jest.fn()
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
    act(() => {
      if (setEnabled) setEnabled(false)
    })

    //* Try to trigger events while disabled
    const moveEvent = new PointerEvent('pointermove')
    Object.defineProperty(moveEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(moveEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), moveEvent)

    const downEvent = new PointerEvent('pointerdown')
    Object.defineProperty(downEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(downEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), downEvent)

    const upEvent = new PointerEvent('pointerup')
    Object.defineProperty(upEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(upEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), upEvent)

    const clickEvent = new MouseEvent('click')
    Object.defineProperty(clickEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(clickEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), clickEvent)

    //* None of the handlers should have been called
    expect(handleClick).not.toHaveBeenCalled()
    expect(handlePointerMove).not.toHaveBeenCalled()
  })

  it('should fire events normally when enabled', async () => {
    const handleClick = jest.fn()
    const handlePointerMove = jest.fn()

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
    const moveEvent = new PointerEvent('pointermove')
    Object.defineProperty(moveEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(moveEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), moveEvent)

    expect(handlePointerMove).toHaveBeenCalled()

    const downEvent = new PointerEvent('pointerdown')
    Object.defineProperty(downEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(downEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), downEvent)

    const upEvent = new PointerEvent('pointerup')
    Object.defineProperty(upEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(upEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), upEvent)

    const clickEvent = new MouseEvent('click')
    Object.defineProperty(clickEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(clickEvent, 'offsetY', { get: () => 480 })
    fireEvent(getContainer(), clickEvent)

    expect(handleClick).toHaveBeenCalled()
  })

  it('should allow toggling enabled on and off', async () => {
    const handlePointerMove = jest.fn()
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

    const moveEvent = new PointerEvent('pointermove')
    Object.defineProperty(moveEvent, 'offsetX', { get: () => 577 })
    Object.defineProperty(moveEvent, 'offsetY', { get: () => 480 })

    //* Initially enabled - should work
    fireEvent(getContainer(), moveEvent)
    expect(handlePointerMove).toHaveBeenCalledTimes(1)

    //* Disable - should not work
    act(() => {
      if (setEnabled) setEnabled(false)
    })
    fireEvent(getContainer(), moveEvent)
    expect(handlePointerMove).toHaveBeenCalledTimes(1) // Still 1, not called

    //* Re-enable - auto-trigger fires + manual fire = 2 more calls
    act(() => {
      if (setEnabled) setEnabled(true)
    })
    // Auto-trigger from subscription fires here (call #2)
    expect(handlePointerMove).toHaveBeenCalledTimes(2)

    fireEvent(getContainer(), moveEvent)
    // Manual fire (call #3)
    expect(handlePointerMove).toHaveBeenCalledTimes(3)

    //* Disable again
    act(() => {
      if (setEnabled) setEnabled(false)
    })
    fireEvent(getContainer(), moveEvent)
    expect(handlePointerMove).toHaveBeenCalledTimes(3) // Still 3, disabled again
  })
})
