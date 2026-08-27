import * as React from 'react'
import { act } from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'
import { Canvas, type RootState } from '../src'

vi.unmock('react-use-measure')

type TestRect = Pick<DOMRect, 'width' | 'height' | 'top' | 'left' | 'bottom' | 'right' | 'x' | 'y'>

class ControlledResizeObserver {
  static instances: ControlledResizeObserver[] = []

  constructor(private callback: ResizeObserverCallback) {
    ControlledResizeObserver.instances.push(this)
  }

  observe() {}
  unobserve() {}
  disconnect() {}

  emit() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

const rect = (width: number, height: number): TestRect => ({
  width,
  height,
  top: 0,
  left: 0,
  bottom: height,
  right: width,
  x: 0,
  y: 0,
})

describe('Canvas resize debounce', () => {
  const OriginalResizeObserver = window.ResizeObserver

  beforeEach(() => {
    vi.useFakeTimers()
    ControlledResizeObserver.instances = []
    window.ResizeObserver = ControlledResizeObserver as unknown as typeof ResizeObserver
  })

  afterEach(() => {
    window.ResizeObserver = OriginalResizeObserver
    vi.useRealTimers()
  })

  it('creates immediately from the initial size, then debounces later resizes', async () => {
    let bounds = rect(640, 480)
    let readState: (() => RootState) | undefined

    const result = render(
      <Canvas
        frameloop="never"
        resize={{ debounce: 2000 }}
        onCreated={(createdState) => (readState = createdState.get)}>
        <group />
      </Canvas>,
    )
    const container = result.container.querySelector('.r3f-canvas-container') as HTMLDivElement
    container.getBoundingClientRect = () => bounds as DOMRect

    expect(readState).toBeUndefined()

    await act(async () => {
      ControlledResizeObserver.instances.at(-1)!.emit()
      await Promise.resolve()
    })

    expect(readState?.().size).toMatchObject({ width: 640, height: 480 })

    bounds = rect(800, 600)
    await act(async () => {
      ControlledResizeObserver.instances.at(-1)!.emit()
    })

    expect(readState?.().size).toMatchObject({ width: 640, height: 480 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999)
    })
    expect(readState?.().size).toMatchObject({ width: 640, height: 480 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(readState?.().size).toMatchObject({ width: 800, height: 600 })
  })
})
