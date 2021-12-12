import * as React from 'react'
import { View } from 'react-native'
import { render, RenderAPI } from '@testing-library/react-native'

import { Canvas, act } from '../../src/native'

describe('native Canvas', () => {
  it('should correctly mount', async () => {
    let renderer: RenderAPI = null!

    await act(async () => {
      renderer = render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(renderer.container).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await act(async () => {
      render(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      )
    })

    expect(ref.current).toBeDefined()
  })

  it('should correctly unmount', async () => {
    let renderer: RenderAPI = null!

    await act(async () => {
      renderer = render(
        <Canvas>
          <group />
        </Canvas>,
      )
    })

    expect(() => renderer.unmount()).not.toThrow()
  })
})
