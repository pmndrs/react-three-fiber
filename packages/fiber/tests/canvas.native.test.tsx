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

  it.skip('should forward ref', async () => {
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

  it.skip('should forward context', async () => {
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
    const renderer = await act(async () =>
      create(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(async () => await act(async () => renderer.unmount())).not.toThrow()
  })
})
