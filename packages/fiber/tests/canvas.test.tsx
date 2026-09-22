import React, { act } from 'react'
import { render } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas, RootState } from '../src'

describe('web Canvas', () => {
  it('should correctly mount', async () => {
    const renderer = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(renderer.container).toMatchSnapshot()
  })

  it('should forward ref', async () => {
    const ref = React.createRef<HTMLCanvasElement>()

    await act(async () =>
      render(
        <Canvas ref={ref}>
          <group />
        </Canvas>,
      ),
    )

    expect(ref.current).toBeInstanceOf(HTMLCanvasElement)
  })

  it('should forward context', async () => {
    const ParentContext = React.createContext<boolean>(null!)
    let receivedValue!: boolean

    function Test() {
      receivedValue = React.useContext(ParentContext)
      return null
    }

    await act(async () => {
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
    const renderer = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(() => renderer.unmount()).not.toThrow()
  })

  it('should survive a StrictMode remount', async () => {
    const forceContextLoss = jest.fn()
    let state!: RootState

    const renderer = await act(async () =>
      render(
        <React.StrictMode>
          <Canvas
            gl={(props) => {
              const gl = new THREE.WebGLRenderer(props)
              jest.spyOn(gl, 'forceContextLoss').mockImplementation(forceContextLoss)
              return gl
            }}
            onCreated={(created) => (state = created)}>
            <group />
          </Canvas>
        </React.StrictMode>,
      ),
    )

    expect(forceContextLoss).not.toHaveBeenCalled()
    expect(state.get().internal.active).toBe(true)
    expect(state.scene.children).toHaveLength(1)

    await act(async () => renderer.unmount())
    expect(forceContextLoss).toHaveBeenCalledTimes(1)
    expect(state.get().internal.active).toBe(false)
  })

  it('plays nice with react SSR', async () => {
    const useLayoutEffect = jest.spyOn(React, 'useLayoutEffect')

    await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(useLayoutEffect).not.toHaveBeenCalled()
  })
})
