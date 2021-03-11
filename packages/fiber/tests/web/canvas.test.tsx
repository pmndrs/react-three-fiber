jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
import { ReactTestRenderer, create, act } from 'react-test-renderer'
import { createCanvas } from 'react-three-test-renderer/src/createTestCanvas'
import { createWebGLContext } from 'react-three-test-renderer/src/createWebGLContext'

import { Canvas, testutil_act as r3fAct } from '../../src/web'

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

  it('should correctly mount', async () => {
    let renderer: ReactTestRenderer | null = null

    await r3fAct(async () => {
      await act(async () => {
        renderer = create(
          <Canvas>
            <group />
          </Canvas>,
          {
            createNodeMock,
          },
        )
      })
    })

    const tree = renderer!.toJSON()

    expect(tree).toMatchSnapshot()
  })

  it('should correctly unmount', async () => {
    let renderer: ReactTestRenderer | null = null

    await r3fAct(async () => {
      await act(async () => {
        renderer = create(
          <Canvas>
            <group />
          </Canvas>,
          {
            createNodeMock,
          },
        )
      })
    })

    expect(() => renderer!.unmount()).not.toThrow()
  })
})
