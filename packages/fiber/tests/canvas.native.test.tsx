import * as React from 'react'
import { act } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import * as THREE from 'three'
import * as Expo from 'expo-gl'
import { WebGL2RenderingContext } from '@react-three/test-renderer/src/WebGL2RenderingContext'
// @ts-ignore TS2305 remove with modern TS config
import { render } from 'react-nil'
import { Canvas, type RootState, useThree } from '../src/native'

describe('native Canvas', () => {
  it('should correctly mount', async () => {
    const container = await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(JSON.stringify(container.head)).toMatchSnapshot()
  })

  describe('rerendering', () => {
    afterEach(async () => {
      await act(async () => render(null))
      jest.restoreAllMocks()
    })

    it('updates children and layout without resetting runtime values', async () => {
      const ref = React.createRef<View>()
      let state!: RootState
      const App = ({ name }: { name: string }) => (
        <Canvas ref={ref} shadows frameloop="never" onCreated={(created) => (state = created)}>
          <group name={name} />
        </Canvas>
      )
      await act(async () => render(<App name="initial" />))
      state.gl.shadowMap.type = THREE.BasicShadowMap
      await act(async () => state.setFrameloop('demand'))

      await act(async () => render(<App name="updated" />))
      await act(async () =>
        ref.current?.props.onLayout?.({
          nativeEvent: { layout: { width: 320, height: 200, x: 10, y: 20 } },
        } as LayoutChangeEvent),
      )
      expect(state.scene.children[0].name).toBe('updated')
      expect(state.get().size).toEqual({ width: 320, height: 200, left: 10, top: 20 })
      expect(state.get().frameloop).toBe('demand')
      expect(state.gl.shadowMap.type).toBe(THREE.BasicShadowMap)
    })

    it('configures a replacement native context before rendering it', async () => {
      let swap = false
      const contexts: WebGL2RenderingContext[] = []
      jest.spyOn(Expo, 'GLView').mockImplementation(((props: Expo.GLViewProps) => {
        const created = React.useRef(false)
        React.useLayoutEffect(() => {
          if (!created.current || swap) {
            created.current = true
            swap = false
            const context = new WebGL2RenderingContext({ width: 1280, height: 800 } as HTMLCanvasElement)
            context.endFrameEXP = jest.fn()
            contexts.push(context)
            props.onContextCreate?.(context as unknown as Expo.ExpoWebGLRenderingContext)
          }
        })
        return React.createElement('glview')
      }) as any)
      const gl = jest.fn((props) => new THREE.WebGLRenderer(props))
      const onCreated = jest.fn()
      const App = ({ name }: { name: string }) => (
        <Canvas gl={gl} frameloop="never" onCreated={onCreated}>
          <group name={name} />
        </Canvas>
      )
      await act(async () => render(<App name="initial" />))
      expect(gl).toHaveBeenCalledTimes(1)
      const initial: RootState = onCreated.mock.calls[0][0]
      const dispose = jest.spyOn(initial.gl, 'dispose')

      swap = true
      await act(async () => render(<App name="replacement" />))
      expect(gl).toHaveBeenCalledTimes(2)
      expect(onCreated).toHaveBeenCalledTimes(2)
      expect(dispose).toHaveBeenCalledTimes(1)
      const replacement: RootState = onCreated.mock.calls[1][0]
      expect(replacement.gl.getContext()).toBe(contexts[1])
      expect(replacement.scene.children[0].name).toBe('replacement')
      replacement.gl.render(replacement.scene, replacement.camera)
      expect(contexts[1].endFrameEXP).toHaveBeenCalledTimes(1)
    })

    it('applies the latest layout before mounting with an async renderer', async () => {
      const ref = React.createRef<View>()
      let ready!: () => void
      const gl = jest.fn(async (props) => {
        await new Promise<void>((resolve) => (ready = resolve))
        return new THREE.WebGLRenderer(props)
      })
      const mounted = jest.fn()
      const created = jest.fn()
      function Scene() {
        const width = useThree((state) => state.size.width)
        React.useLayoutEffect(() => {
          mounted(width)
        }, [width])
        return null
      }
      const App = () => (
        <Canvas ref={ref} gl={gl} frameloop="never" onCreated={(state) => created(state.size.width)}>
          <Scene />
        </Canvas>
      )
      await act(async () => render(<App />))
      await act(async () =>
        ref.current?.props.onLayout?.({
          nativeEvent: { layout: { width: 320, height: 200, x: 10, y: 20 } },
        } as LayoutChangeEvent),
      )
      expect(mounted).not.toHaveBeenCalled()
      await act(async () => ready())
      expect(gl).toHaveBeenCalledTimes(1)
      expect(mounted.mock.calls).toEqual([[320]])
      expect(created.mock.calls).toEqual([[320]])
    })
  })

  it('should forward ref', async () => {
    const ref = React.createRef<View>()

    await act(async () =>
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
    await act(async () =>
      render(
        <Canvas>
          <group />
        </Canvas>,
      ),
    )

    expect(async () => await act(async () => render(null))).not.toThrow()
  })
})
