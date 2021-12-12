import * as React from 'react'
import { View } from 'react-native'
import { act, create, ReactTestRenderer } from 'react-test-renderer'

import { Canvas } from '../../src/native'

describe('native Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: ReactTestRenderer = null!

    await act(async () => {
      renderer = create(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(renderer.toTree()).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await act(async () => {
      create(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      )
    })

    expect(ref.current).toBeDefined()
  })

  it('should correctly unmount', async () => {
    let renderer: ReactTestRenderer = null!

    await act(async () => {
      renderer = create(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(() => renderer.unmount()).not.toThrow()
  })
})
