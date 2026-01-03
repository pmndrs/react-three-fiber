import * as THREE from 'three'
import { act } from './reconciler.test'
import { createCanvas } from './reconciler.test'

process.env.NODE_ENV = 'production'

describe('reconciler production', () => {
  it('should work with production builds of React', async () => {
    // @ts-ignore
    if (typeof window !== 'undefined') delete window.__THREE__

    const React = await import('react')
    const R3F = await import('../src/index')

    // Ensure that the correct build was loaded
    // @ts-ignore
    expect(typeof React.act === 'undefined')

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
  })
})
