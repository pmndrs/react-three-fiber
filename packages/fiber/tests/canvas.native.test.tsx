import * as React from 'react'
import { View } from 'react-native'
import { create } from 'react-test-renderer'
import { Canvas, act } from '../src/native'

describe('native Canvas', () => {
  it('should correctly mount', async () => {
    const renderer = await act(async () =>
      create(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(renderer.toJSON()).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await act(async () =>
      create(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      ),
    )

    expect(ref.current).toBeInstanceOf(View)
  })

  it('should correctly unmount', async () => {
    const renderer = await act(async () =>
      create(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(() => renderer.unmount()).not.toThrow()
  })
})
