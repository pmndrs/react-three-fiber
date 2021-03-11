import * as React from 'react'
import { create } from 'react-test-renderer'
import { createCanvas } from 'react-three-test-renderer/src/createTestCanvas'
import { createWebGLContext } from 'react-three-test-renderer/src/createWebGLContext'

import { Canvas } from '../../src/web'

describe('web Canvas', () => {
  const canvas = createCanvas({
    beforeReturn: (canvas) => {
      //@ts-ignore
      canvas.getContext = (type: string) => {
        if (type === 'webgl' || type === 'webgl2') {
          return createWebGLContext(canvas)
        }
      }
    },
  })

  const createNodeMock = () => {
    return canvas
  }

  it('should correctly mount', () => {
    const tree = create(
      <Canvas>
        <group />
      </Canvas>,
      {
        createNodeMock,
      },
    ).toJSON()

    expect(tree).toMatchSnapshot()
  })

  it('should correctly unmount', () => {
    const render = create(
      <Canvas>
        <group />
      </Canvas>,
      {
        createNodeMock,
      },
    )

    expect(() => render.unmount()).not.toThrow()
  })
})
