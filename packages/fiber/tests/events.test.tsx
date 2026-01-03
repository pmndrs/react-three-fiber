import { vi } from 'vitest'
import * as React from 'react'
import { render, fireEvent, RenderResult, createEvent } from '@testing-library/react'
async function act<T>(fn: () => Promise<T>) {
  const value = await fn()
  // Wait for R3F's initialization and frame loop
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

describe('events', () => {
  it('can handle onPointerDown', async () => {
    const handlePointerDown = vi.fn()

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

    const evt = createPointerEvent('pointerdown')
    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handlePointerDown).toHaveBeenCalled()
  })

  it('can handle onPointerMissed', async () => {
    const handleClick = vi.fn()
    const handleMissed = vi.fn()

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

    const evt = createPointerEvent('click', { clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 })
    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handleClick).not.toHaveBeenCalled()
    expect(handleMissed).toHaveBeenCalledWith(evt)
  })

  it('should not fire onPointerMissed when same element is clicked', async () => {
    const handleClick = vi.fn()
    const handleMissed = vi.fn()

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

    const down = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const up = createPointerEvent('pointerup', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const evt = createPointerEvent('click', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), down)
      fireEvent(getContainer(), up)
      fireEvent(getContainer(), evt)
    })

    expect(handleClick).toHaveBeenCalled()
    expect(handleMissed).not.toHaveBeenCalled()
  })

  it('should not fire onPointerMissed on parent when child element is clicked', async () => {
    const handleClick = vi.fn()
    const handleMissed = vi.fn()

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

    const down = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const up = createPointerEvent('pointerup', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const evt = createPointerEvent('click', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), down)
      fireEvent(getContainer(), up)
      fireEvent(getContainer(), evt)
    })

    expect(handleClick).toHaveBeenCalled()
    expect(handleMissed).not.toHaveBeenCalled()
  })

  it('can handle onPointerMissed on Canvas', async () => {
    const handleMissed = vi.fn()

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

    const evt = createPointerEvent('click', { clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 })

    await act(async () => {
      fireEvent(getContainer(), evt)
    })
    expect(handleMissed).toHaveBeenCalledWith(evt)
  })

  it('can handle onPointerMove', async () => {
    const handlePointerMove = vi.fn()
    const handlePointerOver = vi.fn()
    const handlePointerEnter = vi.fn()
    const handlePointerOut = vi.fn()

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

    const evt1 = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), evt1)
    })

    expect(handlePointerMove).toHaveBeenCalled()
    expect(handlePointerOver).toHaveBeenCalled()
    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = createPointerEvent('pointermove', { clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 })

    await act(async () => {
      fireEvent(getContainer(), evt2)
    })

    expect(handlePointerOut).toHaveBeenCalled()
  })

  //* Drag & Drop Events ==============================
  // Note: DragEvent is not fully implemented in jsdom yet: https://github.com/jsdom/jsdom/issues/2913
  // however, @testing-library/react does simulate it via createEvent

  it('can handle onDragOverEnter & onDragOverLeave on mesh', async () => {
    const handleDragOverEnter = vi.fn()
    const handleDragOverLeave = vi.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onDragOverEnter={handleDragOverEnter} onDragOverLeave={handleDragOverLeave}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // Drag over the mesh
    const evtOver = createPointerEvent('dragover', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    await act(async () => {
      fireEvent(getContainer(), evtOver)
    })

    expect(handleDragOverEnter).toHaveBeenCalled()

    // Drag away from the mesh
    const evtAway = createPointerEvent('dragover', { clientX: 1, clientY: 1, offsetX: 1, offsetY: 1 })
    await act(async () => {
      fireEvent(getContainer(), evtAway)
    })

    expect(handleDragOverLeave).toHaveBeenCalled()
  })

  it('can handle continuous onDragOver on mesh', async () => {
    const handleDragOver = vi.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onDragOver={handleDragOver}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // First dragover
    const evt1 = createPointerEvent('dragover', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    await act(async () => {
      fireEvent(getContainer(), evt1)
    })

    // Second dragover (should still fire even if already over)
    const evt2 = createPointerEvent('dragover', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    await act(async () => {
      fireEvent(getContainer(), evt2)
    })

    expect(handleDragOver).toHaveBeenCalledTimes(2)
  })

  it('can handle onDragOverMissed on Canvas', async () => {
    const handleDragOverMissed = vi.fn()

    await act(async () => {
      render(
        <Canvas onDragOverMissed={handleDragOverMissed}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // Drag over empty area (miss the mesh)
    const evt = createPointerEvent('dragover', { clientX: 1, clientY: 1, offsetX: 1, offsetY: 1 })
    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handleDragOverMissed).toHaveBeenCalled()
  })

  it('can handle onDrop on mesh', async () => {
    const handleDrop = vi.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onDrop={handleDrop}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt = createPointerEvent('drop', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handleDrop).toHaveBeenCalled()
  })

  it('can handle onDropMissed on Canvas', async () => {
    const handleDropMissed = vi.fn()

    await act(async () => {
      render(
        <Canvas onDropMissed={handleDropMissed}>
          <mesh>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // Drop on empty area (miss the mesh)
    const evt = createPointerEvent('drop', { clientX: 1, clientY: 1, offsetX: 1, offsetY: 1 })
    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handleDropMissed).toHaveBeenCalled()
  })

  it('can handle onDragOverMissed on mesh', async () => {
    const handleDragOverMissed = vi.fn()
    const handleDragOverEnter = vi.fn()

    await act(async () => {
      render(
        <Canvas>
          <mesh onDragOverMissed={handleDragOverMissed} onDragOverEnter={handleDragOverEnter}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    // Drag over empty area (miss the mesh)
    const evt = createPointerEvent('dragover', { clientX: 1, clientY: 1, offsetX: 1, offsetY: 1 })
    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handleDragOverEnter).not.toHaveBeenCalled()
    expect(handleDragOverMissed).toHaveBeenCalled()
  })

  it('should handle stopPropagation', async () => {
    const handlePointerEnter = vi.fn().mockImplementation((e) => {
      expect(() => e.stopPropagation()).not.toThrow()
    })
    const handlePointerLeave = vi.fn()

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

    const evt1 = createPointerEvent('pointermove', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), evt1)
    })

    expect(handlePointerEnter).toHaveBeenCalled()

    const evt2 = createPointerEvent('pointermove', { clientX: 0, clientY: 0, offsetX: 0, offsetY: 0 })

    await act(async () => {
      fireEvent(getContainer(), evt2)
    })

    expect(handlePointerLeave).toHaveBeenCalled()
  })

  it('should handle stopPropagation on click events', async () => {
    const handleClickFront = vi.fn((e) => e.stopPropagation())
    const handleClickRear = vi.fn()

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

    const down = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const up = createPointerEvent('pointerup', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
    const evt = createPointerEvent('click', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), down)
      fireEvent(getContainer(), up)
      fireEvent(getContainer(), evt)
    })

    expect(handleClickFront).toHaveBeenCalled()
    expect(handleClickRear).not.toHaveBeenCalled()
  })

  describe('web pointer capture', () => {
    const handlePointerMove = vi.fn()
    const handlePointerDown = vi.fn((ev) => (ev.target as any).setPointerCapture(ev.pointerId))
    const handlePointerUp = vi.fn((ev) => (ev.target as any).releasePointerCapture(ev.pointerId))
    const handlePointerEnter = vi.fn()
    const handlePointerLeave = vi.fn()

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

      canvas.setPointerCapture = vi.fn()
      canvas.releasePointerCapture = vi.fn()

      const down = createPointerEvent('pointerdown', {
        pointerId,
        clientX: 577,
        clientY: 480,
        offsetX: 577,
        offsetY: 480,
      })

      /* testing-utils/react's fireEvent wraps the event like React does, so it doesn't match how our event handlers are called in production, so we call dispatchEvent directly. */
      await act(async () => {
        canvas.dispatchEvent(down)
      })

      /* This should have captured the DOM pointer */
      expect(handlePointerDown).toHaveBeenCalledTimes(1)
      expect(canvas.setPointerCapture).toHaveBeenCalledWith(pointerId)
      expect(canvas.releasePointerCapture).not.toHaveBeenCalled()

      /* Now remove the mesh */
      await act(async () => {
        renderResult.rerender(<PointerCaptureTest hasMesh={false} />)
      })

      expect(canvas.releasePointerCapture).toHaveBeenCalledWith(pointerId)

      const move = createPointerEvent('pointermove', {
        pointerId,
        clientX: 577,
        clientY: 480,
        offsetX: 577,
        offsetY: 480,
      })

      await act(async () => {
        canvas.dispatchEvent(move)
      })

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
      canvas.setPointerCapture = vi.fn()
      canvas.releasePointerCapture = vi.fn()

      const moveIn = createPointerEvent('pointermove', {
        pointerId,
        clientX: 577,
        clientY: 480,
        offsetX: 577,
        offsetY: 480,
      })
      const moveOut = createPointerEvent('pointermove', {
        pointerId,
        clientX: -10000,
        clientY: -10000,
        offsetX: -10000,
        offsetY: -10000,
      })

      /* testing-utils/react's fireEvent wraps the event like React does, so it doesn't match how our event handlers are called in production, so we call dispatchEvent directly. */
      await act(async () => {
        canvas.dispatchEvent(moveIn)
      })
      expect(handlePointerEnter).toHaveBeenCalledTimes(1)
      expect(handlePointerMove).toHaveBeenCalledTimes(1)

      const down = createPointerEvent('pointerdown', {
        pointerId,
        clientX: 577,
        clientY: 480,
        offsetX: 577,
        offsetY: 480,
      })

      await act(async () => {
        canvas.dispatchEvent(down)
      })

      // If we move the pointer now, when it is captured, it should raise the onPointerMove event even though the pointer is not over the element,
      // and NOT raise the onPointerLeave event.
      await act(async () => {
        canvas.dispatchEvent(moveOut)
      })
      expect(handlePointerMove).toHaveBeenCalledTimes(2)
      expect(handlePointerLeave).not.toHaveBeenCalled()

      await act(async () => {
        canvas.dispatchEvent(moveIn)
      })
      expect(handlePointerMove).toHaveBeenCalledTimes(3)

      const up = createPointerEvent('pointerup', { pointerId, clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })
      const lostpointercapture = createPointerEvent('lostpointercapture', { pointerId })

      await act(async () => {
        canvas.dispatchEvent(up)
        canvas.dispatchEvent(lostpointercapture)
      })

      // The pointer is still over the element, so onPointerLeave should not have been called.
      expect(handlePointerLeave).not.toHaveBeenCalled()

      // The element pointer should no longer be captured, so moving it away should call onPointerLeave.
      await act(async () => {
        canvas.dispatchEvent(moveOut)
      })
      expect(handlePointerEnter).toHaveBeenCalledTimes(1)
      expect(handlePointerLeave).toHaveBeenCalledTimes(1)
    })
  })

  it('can handle primitives', async () => {
    const handlePointerDownOuter = vi.fn()
    const handlePointerDownInner = vi.fn()

    const object = new THREE.Group()
    object.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2), new THREE.MeshBasicMaterial()))

    await act(async () => {
      render(
        <Canvas>
          <group onPointerDown={handlePointerDownOuter}>
            <primitive name="test" object={object} onPointerDown={handlePointerDownInner} />
          </group>
        </Canvas>,
      )
    })

    const evt = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handlePointerDownOuter).toHaveBeenCalled()
    expect(handlePointerDownInner).toHaveBeenCalled()
  })

  it('can handle a DOM offset canvas', async () => {
    const handlePointerDown = vi.fn()
    await act(async () => {
      render(
        <Canvas
          onCreated={(state: RootState) => {
            state.size.left = 100
            state.size.top = 100
          }}>
          <mesh onPointerDown={handlePointerDown}>
            <boxGeometry args={[2, 2]} />
            <meshBasicMaterial />
          </mesh>
        </Canvas>,
      )
    })

    const evt = createPointerEvent('pointerdown', { clientX: 577, clientY: 480, offsetX: 577, offsetY: 480 })

    await act(async () => {
      fireEvent(getContainer(), evt)
    })

    expect(handlePointerDown).toHaveBeenCalled()
  })

  it.todo('can handle different event prefixes')
})
