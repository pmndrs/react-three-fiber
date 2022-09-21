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

    expect(renderer.toJSON()).toMatchSnapshot()
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

  it('should forward context', async () => {
    const ParentContext = React.createContext<boolean>(null!)
    let receivedValue!: boolean

    function Test() {
      receivedValue = React.useContext(ParentContext)
      return null
    }

    await act(async () => {
      create(
        <ParentContext.Provider value={true}>
          <Canvas>
            <Test />
          </Canvas>
        </ParentContext.Provider>,
      )
    })

    expect(receivedValue).toBe(true)
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
