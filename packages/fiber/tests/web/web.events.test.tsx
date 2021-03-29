jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { createWebGLContext } from '@react-three/test-renderer/src/createWebGLContext'

import { Canvas, events, act } from '../../src/web/index'

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
    expect(handleMissed).toHaveBeenCalled()
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
})
