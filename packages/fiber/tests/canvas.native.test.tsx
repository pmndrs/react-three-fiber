import * as React from 'react'
import { View } from 'react-native'
// @ts-ignore TS2305 remove with modern TS config
import { render } from 'react-nil'
import { Canvas } from '../src/native'

describe('native Canvas', () => {
  it('should correctly mount', async () => {
    const container = await React.act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(JSON.stringify(container.head)).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await React.act(async () =>
      render(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      ),
    )

    expect(ref.current).toBeInstanceOf(View)
  })

  it('should forward context', async () => {
    const ParentContext = React.createContext<boolean>(null!)
    let receivedValue!: boolean

    function Test() {
      receivedValue = React.useContext(ParentContext)
      return null
    }

    await React.act(async () => {
      render(
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
    await React.act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(async () => await React.act(async () => render(null))).not.toThrow()
  })
})
