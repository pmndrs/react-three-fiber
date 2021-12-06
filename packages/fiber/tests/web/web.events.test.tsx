jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { render, fireEvent, RenderResult } from '@testing-library/react'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { Canvas, act } from '../../src'

// @ts-ignore
HTMLCanvasElement.prototype.getContext = function () {
  return createWebGLContext(this)
}

describe('events ', () => {
  it('can handle onPointerDown', async () => {
    const handlePointerDown = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onPointerDown={handlePointerDown}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt = new PointerEvent('pointerdown')
    //@ts-ignore
    evt.offsetX = 577
    //@ts-ignore
    evt.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt)

    expect(handlePointerDown).toHaveBeenCalled()
  })

  it('can handle onPointerMissed', async () => {
    const handleClick = jest.fn()
    const handleMissed = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onPointerMissed={handleMissed} onClick={handleClick}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt = new MouseEvent('click')
    //@ts-ignore
    evt.offsetX = 0
    //@ts-ignore
    evt.offsetY = 0

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt)

    expect(handleClick).not.toHaveBeenCalled()
    expect(handleMissed).toHaveBeenCalledWith(evt)
  })

  it('should not fire onPointerMissed when same element is clicked', async () => {
    const handleClick = jest.fn()
    const handleMissed = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onPointerMissed={handleMissed} onClick={handleClick}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const down = new PointerEvent('pointerdown')
    //@ts-ignore
    down.offsetX = 577
    //@ts-ignore
    down.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, down)

    const up = new PointerEvent('pointerup')
    //@ts-ignore
    up.offsetX = 577
    //@ts-ignore
    up.offsetY = 480

    const evt = new MouseEvent('click')
    //@ts-ignore
    evt.offsetX = 577
    //@ts-ignore
    evt.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt)

    expect(handleClick).toHaveBeenCalled()
    expect(handleMissed).not.toHaveBeenCalled()
  })

  it('should not fire onPointerMissed on parent when child element is clicked', async () => {
    const handleClick = jest.fn()
    const handleMissed = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <group onPointerMissed={handleMissed}>
            <mesh onClick={handleClick}>
              <boxGeometry args={[2, 2]} />
              <meshBasicMaterial />
            </mesh>
          </group>
        </Canvas>,
      )
    })

    const down = new PointerEvent('pointerdown')
    //@ts-ignore
    down.offsetX = 577
    //@ts-ignore
    down.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, down)

    const up = new PointerEvent('pointerup')
    //@ts-ignore
    up.offsetX = 577
    //@ts-ignore
    up.offsetY = 480

    const evt = new MouseEvent('click')
    //@ts-ignore
    evt.offsetX = 577
    //@ts-ignore
    evt.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt)

    expect(handleClick).toHaveBeenCalled()
    expect(handleMissed).not.toHaveBeenCalled()
  })

  it('can handle onPointerMissed on Canvas', async () => {
    const handleMissed = jest.fn()

    await act(async () => {
      render(
        <Canvas onPointerMissed={handleMissed}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt = new MouseEvent('click')
    //@ts-ignore
    evt.offsetX = 0
    //@ts-ignore
    evt.offsetY = 0

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt)
    expect(handleMissed).toHaveBeenCalledWith(evt)
  })

  it('can handle onPointerMove', async () => {
    const handlePointerMove = jest.fn()
    const handlePointerOver = jest.fn()
    const handlePointerEnter = jest.fn()
    const handlePointerOut = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh
            onPointerOut={handlePointerOut}
            onPointerEnter={handlePointerEnter}
            onPointerMove={handlePointerMove}
            onPointerOver={handlePointerOver}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt1 = new PointerEvent('pointermove')
    //@ts-ignore
    evt1.offsetX = 577
    //@ts-ignore
    evt1.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt1)

    expect(handlePointerMove).toHaveBeenCalled()
    expect(handlePointerOver).toHaveBeenCalled()
    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = new PointerEvent('pointermove')
    //@ts-ignore
    evt2.offsetX = 0
    //@ts-ignore
    evt2.offsetY = 0

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt2)

    expect(handlePointerOut).toHaveBeenCalled()
  })

  it('should handle stopPropogation', async () => {
    const handlePointerEnter = jest.fn().mockImplementation((e) => {
      expect(() => e.stopPropagation()).not.toThrow()
    })
    const handlePointerLeave = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onPointerLeave={handlePointerLeave} onPointerEnter={handlePointerEnter}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
          <mesh position-z={3}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt1 = new PointerEvent('pointermove')
    //@ts-ignore
    evt1.offsetX = 577
    //@ts-ignore
    evt1.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt1)

    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = new PointerEvent('pointermove')
    //@ts-ignore
    evt2.offsetX = 0
    //@ts-ignore
    evt2.offsetY = 0

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, evt2)

    expect(handlePointerLeave).toHaveBeenCalled()
  })

  it('should handle stopPropagation on click events', async () => {
    const handleClickFront = jest.fn((e) => e.stopPropagation())
    const handleClickRear = jest.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onClick={handleClickFront}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
          <mesh onClick={handleClickRear} position-z={-3}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const down = new PointerEvent('pointerdown')
    //@ts-ignore
    down.offsetX = 577
    //@ts-ignore
    down.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, down)

    const up = new PointerEvent('pointerup')
    //@ts-ignore
    up.offsetX = 577
    //@ts-ignore
    up.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, up)

    const event = new MouseEvent('click')
    //@ts-ignore
    event.offsetX = 577
    //@ts-ignore
    event.offsetY = 480

    fireEvent(document.querySelector('canvas') as HTMLCanvasElement, event)

    expect(handleClickFront).toHaveBeenCalled()
    expect(handleClickRear).not.toHaveBeenCalled()
  })

  describe('pointer capture', () => {
    const handlePointerMove = jest.fn()
    const handlePointerDown = jest.fn((ev) => (ev.target as any).setPointerCapture(ev.pointerId))

    /* This component lets us unmount the event-handling object */
    function PointerCaptureTest(props: { hasMesh: boolean }) {
      return (
        <Canvas>
          {props.hasMesh && (
            <mesh onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}>
              <boxGeometry args={[2, 2]} />
              <meshBasicMaterial />
            </mesh>
          )}
        </Canvas>
      )
    }

    const pointerId = 1234

    it('should release when the capture target is unmounted', async () => {
      let renderResult: RenderResult = undefined!
      await act(async () => {
        renderResult = render(<PointerCaptureTest hasMesh={true} />)
        return renderResult
      })

      const canvas = document.querySelector('canvas') as HTMLCanvasElement

      canvas.setPointerCapture = jest.fn()
      canvas.releasePointerCapture = jest.fn()

      const down = new PointerEvent('pointerdown', { pointerId })
      //@ts-ignore
      down.offsetX = 577
      //@ts-ignore
      down.offsetY = 480

      /* testing-utils/react's fireEvent wraps the event like React does, so it doesn't match how our event handlers are called in production, so we call dispatchEvent directly. */
      await act(async () => canvas.dispatchEvent(down))

      /* This should have captured the DOM pointer */
      expect(handlePointerDown).toHaveBeenCalledTimes(1)
      expect(canvas.setPointerCapture).toHaveBeenCalledWith(pointerId)
      expect(canvas.releasePointerCapture).not.toHaveBeenCalled()

      /* Now remove the mesh */
      await act(async () => renderResult.rerender(<PointerCaptureTest hasMesh={false} />))

      expect(canvas.releasePointerCapture).toHaveBeenCalledWith(pointerId)

      const move = new PointerEvent('pointerdown', { pointerId })
      //@ts-ignore
      move.offsetX = 577
      //@ts-ignore
      move.offsetY = 480

      await act(async () => canvas.dispatchEvent(move))

      /* There should now be no pointer capture */
      expect(handlePointerMove).not.toHaveBeenCalled()
    })
  })
})
