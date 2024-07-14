import * as React from 'react'
import { render, fireEvent, RenderResult } from '@testing-library/react'
import { Canvas, act, extend } from '../src'
import THREE from 'three'

extend(THREE as any)

const getContainer = () => document.querySelector('canvas')?.parentNode?.parentNode as HTMLDivElement

describe('events', () => {
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
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), evt)

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
    Object.defineProperty(evt, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt, 'offsetY', { get: () => 0 })

    fireEvent(getContainer(), evt)

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
    Object.defineProperty(down, 'offsetX', { get: () => 577 })
    Object.defineProperty(down, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), down)

    const up = new PointerEvent('pointerup')
    Object.defineProperty(up, 'offsetX', { get: () => 577 })
    Object.defineProperty(up, 'offsetY', { get: () => 480 })

    const evt = new MouseEvent('click')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), evt)

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
    Object.defineProperty(down, 'offsetX', { get: () => 577 })
    Object.defineProperty(down, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), down)

    const up = new PointerEvent('pointerup')
    Object.defineProperty(up, 'offsetX', { get: () => 577 })
    Object.defineProperty(up, 'offsetY', { get: () => 480 })

    const evt = new MouseEvent('click')
    Object.defineProperty(evt, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), evt)

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
    Object.defineProperty(evt, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt, 'offsetY', { get: () => 0 })

    fireEvent(getContainer(), evt)
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
    Object.defineProperty(evt1, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt1, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), evt1)

    expect(handlePointerMove).toHaveBeenCalled()
    expect(handlePointerOver).toHaveBeenCalled()
    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = new PointerEvent('pointermove')
    Object.defineProperty(evt2, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt2, 'offsetY', { get: () => 0 })

    fireEvent(getContainer(), evt2)

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
    Object.defineProperty(evt1, 'offsetX', { get: () => 577 })
    Object.defineProperty(evt1, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), evt1)

    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = new PointerEvent('pointermove')
    Object.defineProperty(evt2, 'offsetX', { get: () => 0 })
    Object.defineProperty(evt2, 'offsetY', { get: () => 0 })

    fireEvent(getContainer(), evt2)

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
    Object.defineProperty(down, 'offsetX', { get: () => 577 })
    Object.defineProperty(down, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), down)

    const up = new PointerEvent('pointerup')
    Object.defineProperty(up, 'offsetX', { get: () => 577 })
    Object.defineProperty(up, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), up)

    const event = new MouseEvent('click')
    Object.defineProperty(event, 'offsetX', { get: () => 577 })
    Object.defineProperty(event, 'offsetY', { get: () => 480 })

    fireEvent(getContainer(), event)

    expect(handleClickFront).toHaveBeenCalled()
    expect(handleClickRear).not.toHaveBeenCalled()
  })

  describe('web pointer capture', () => {
    const handlePointerMove = jest.fn()
    const handlePointerDown = jest.fn((ev) => (ev.target as any).setPointerCapture(ev.pointerId))
    const handlePointerUp = jest.fn((ev) => (ev.target as any).releasePointerCapture(ev.pointerId))
    const handlePointerEnter = jest.fn()
    const handlePointerLeave = jest.fn()

    /* This component lets us unmount the event-handling object */
    function PointerCaptureTest(props: { hasMesh: boolean; manualRelease?: boolean }) {
      return (
        <Canvas>
          {props.hasMesh && (
            <mesh
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={props.manualRelease ? handlePointerUp : undefined}
              onPointerLeave={handlePointerLeave}
              onPointerEnter={handlePointerEnter}>
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

      const canvas = getContainer()

      canvas.setPointerCapture = jest.fn()
      canvas.releasePointerCapture = jest.fn()

      const down = new PointerEvent('pointerdown', { pointerId })
      Object.defineProperty(down, 'offsetX', { get: () => 577 })
      Object.defineProperty(down, 'offsetY', { get: () => 480 })

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
      Object.defineProperty(move, 'offsetX', { get: () => 577 })
      Object.defineProperty(move, 'offsetY', { get: () => 480 })

      await act(async () => canvas.dispatchEvent(move))

      /* There should now be no pointer capture */
      expect(handlePointerMove).not.toHaveBeenCalled()
    })

    it('should not leave when captured', async () => {
      let renderResult: RenderResult = undefined!
      await act(async () => {
        renderResult = render(<PointerCaptureTest hasMesh manualRelease />)
        return renderResult
      })

      const canvas = getContainer()
      canvas.setPointerCapture = jest.fn()
      canvas.releasePointerCapture = jest.fn()

      const moveIn = new PointerEvent('pointermove', { pointerId })
      Object.defineProperty(moveIn, 'offsetX', { get: () => 577 })
      Object.defineProperty(moveIn, 'offsetY', { get: () => 480 })

      const moveOut = new PointerEvent('pointermove', { pointerId })
      Object.defineProperty(moveOut, 'offsetX', { get: () => -10000 })
      Object.defineProperty(moveOut, 'offsetY', { get: () => -10000 })

      /* testing-utils/react's fireEvent wraps the event like React does, so it doesn't match how our event handlers are called in production, so we call dispatchEvent directly. */
      await act(async () => canvas.dispatchEvent(moveIn))
      expect(handlePointerEnter).toHaveBeenCalledTimes(1)
      expect(handlePointerMove).toHaveBeenCalledTimes(1)

      const down = new PointerEvent('pointerdown', { pointerId })
      Object.defineProperty(down, 'offsetX', { get: () => 577 })
      Object.defineProperty(down, 'offsetY', { get: () => 480 })

      await act(async () => canvas.dispatchEvent(down))

      // If we move the pointer now, when it is captured, it should raise the onPointerMove event even though the pointer is not over the element,
      // and NOT raise the onPointerLeave event.
      await act(async () => canvas.dispatchEvent(moveOut))
      expect(handlePointerMove).toHaveBeenCalledTimes(2)
      expect(handlePointerLeave).not.toHaveBeenCalled()

      await act(async () => canvas.dispatchEvent(moveIn))
      expect(handlePointerMove).toHaveBeenCalledTimes(3)

      const up = new PointerEvent('pointerup', { pointerId })
      Object.defineProperty(up, 'offsetX', { get: () => 577 })
      Object.defineProperty(up, 'offsetY', { get: () => 480 })
      const lostpointercapture = new PointerEvent('lostpointercapture', { pointerId })

      await act(async () => canvas.dispatchEvent(up))
      await act(async () => canvas.dispatchEvent(lostpointercapture))

      // The pointer is still over the element, so onPointerLeave should not have been called.
      expect(handlePointerLeave).not.toHaveBeenCalled()

      // The element pointer should no longer be captured, so moving it away should call onPointerLeave.
      await act(async () => canvas.dispatchEvent(moveOut))
      expect(handlePointerEnter).toHaveBeenCalledTimes(1)
      expect(handlePointerLeave).toHaveBeenCalledTimes(1)
    })
  })
})
