import * as THREE from 'three'
import { createCanvas } from '@react-three/test-renderer/src/createTestCanvas'

async function act<T>(fn: () => Promise<T>) {
  // Silence act warning since we have a custom act implementation
  const error = console.error
  console.error = function (message) {
    if (/was not wrapped in act/.test(message)) return
    return error.call(this, arguments)
  }

  const value = fn()

  return new Promise<T>((res) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => res(value))))
  }).finally(() => {
    console.error = error
  })
}

describe('reconciler', () => {
  const NODE_ENV = process.env.NODE_ENV

  for (const env of ['development', 'production']) {
    it(`should work with ${env} builds of React`, async () => {
      jest.resetModules()

      // @ts-ignore
      if (typeof window !== 'undefined') delete window.__THREE__
      process.env.NODE_ENV = env

      const React = await import('react')
      const R3F = await import('../src/index')

      // Ensure that the correct build was loaded
      expect(typeof React.act === (env === 'production' ? 'undefined' : 'function'))

      R3F.extend(THREE as any)
      const canvas = createCanvas()
      const root = R3F.createRoot(canvas)

      const lifecycle: string[] = []

      const object = {}
      const ref = React.createRef<{}>()

      function Test() {
        lifecycle.push('render')
        React.useImperativeHandle(React.useRef(undefined), () => void lifecycle.push('ref'))
        React.useInsertionEffect(() => void lifecycle.push('useInsertionEffect'), [])
        React.useLayoutEffect(() => void lifecycle.push('useLayoutEffect'), [])
        React.useEffect(() => void lifecycle.push('useEffect'), [])
        return React.createElement('primitive', { ref, object })
      }
      await act(async () => root.render(React.createElement(Test)))

      expect(lifecycle).toStrictEqual(['render', 'useInsertionEffect', 'ref', 'useLayoutEffect', 'useEffect'])
      expect(ref.current).toBe(object)

      await act(async () => root.unmount())
      expect(ref.current).toBe(null)

      // Production builds call startViewTransition with fewer arguments than development builds
      const { ViewTransition } = React as any
      if (ViewTransition) {
        const effects: boolean[] = []
        let setShown: React.Dispatch<React.SetStateAction<boolean>> = null!

        function Shown() {
          const [shown, setter] = React.useState(false)
          setShown = setter
          React.useEffect(() => void effects.push(shown), [shown])
          return shown
            ? React.createElement(ViewTransition, null, React.createElement('group', { name: 'shown' }))
            : null
        }
        const transitionRoot = R3F.createRoot(createCanvas())
        const store = await act(async () => transitionRoot.render(React.createElement(Shown)))
        await act(async () => React.startTransition(() => setShown(true)))

        expect(store.getState().scene.getObjectByName('shown')).toBeDefined()
        expect(effects).toStrictEqual([false, true])
        await act(async () => transitionRoot.unmount())
      }
    })
  }

  // @ts-ignore
  if (typeof window !== 'undefined') delete window.__THREE__
  process.env.NODE_ENV = NODE_ENV
  jest.resetModules()
})
