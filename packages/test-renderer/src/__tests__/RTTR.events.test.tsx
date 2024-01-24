import * as React from 'react'

import ReactThreeTestRenderer from '../index'
import type { ReactThreeTest } from '../index'

describe('ReactThreeTestRenderer Events', () => {
  it('should fire an event', async () => {
    const handlePointerDown = jest.fn().mockImplementationOnce((event: ReactThreeTest.MockSyntheticEvent) => {
      expect(() => event.stopPropagation()).not.toThrow()
      expect(event.offsetX).toEqual(640)
      expect(event.offsetY).toEqual(400)
    })

    const Component = () => {
      return (
        <mesh onPointerDown={handlePointerDown}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const { scene, fireEvent } = await ReactThreeTestRenderer.create(<Component />)

    const eventData = {
      offsetX: 640,
      offsetY: 400,
    }

    await fireEvent(scene.children[0], 'onPointerDown', eventData)

    expect(handlePointerDown).toHaveBeenCalledTimes(1)

    await fireEvent(scene.children[0], 'pointerDown')

    expect(handlePointerDown).toHaveBeenCalledTimes(2)
  })

  it('should not throw if the handle name is incorrect', async () => {
    const handlePointerDown = jest.fn()

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementationOnce(jest.fn())

    const Component = () => {
      return (
        <mesh onPointerDown={handlePointerDown}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const { scene, fireEvent } = await ReactThreeTestRenderer.create(<Component />)

    expect(async () => await fireEvent(scene.children[0], 'onPointerUp')).not.toThrow()

    expect(handlePointerDown).not.toHaveBeenCalled()

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Handler for onPointerUp was not found. You must pass event names in camelCase or name of the handler https://github.com/pmndrs/react-three-fiber/blob/master/packages/test-renderer/markdown/rttr.md#create-fireevent',
    )
  })
})
