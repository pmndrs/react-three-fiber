import { vi } from 'vitest'
import * as THREE from '#three'
import { createCanvas as createTestCanvas } from '../../test-renderer/src/createTestCanvas'

export async function act<T>(fn: () => Promise<T>) {
  const value = fn()
  return new Promise<T>((res) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => res(value))))
  })
}

export const createCanvas = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 800
  return canvas
}

describe('reconciler development', () => {
  it('should work with development builds of React', async () => {
    // @ts-ignore
    if (typeof window !== 'undefined') delete window.__THREE__
    process.env.NODE_ENV = 'development'

    vi.resetModules()
    const React = await import('react')
    const R3F = await import('../src/index')

    // Ensure that the correct build was loaded
    expect(typeof React.act === 'function')

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

describe('React 19.2 root view-transition host methods', () => {
  // React 19.2 added cloneRootViewTransitionContainer / removeRootViewTransitionClone to the host
  // config. They previously threw 'Not implemented.' here, which would have turned any React-
  // internal probe into a hard crash for users. They are now no-ops: R3F renders into a
  // WebGL/WebGPU canvas, where cloning the root has no meaning, so we never opt into root view
  // transitions and React has no reason to call them.
  //
  // Scope note: react-reconciler captures the host config at construction, so the methods cannot
  // be spied on from out here. What this proves is that a full mount -> update -> unmount cycle
  // completes cleanly. That is exactly the cycle the previous `throw` would have failed, so it is
  // the same guard the throw provided — without the crash risk. If a future React starts driving
  // root view transitions for host roots, this needs revisiting with an observable stub.
  it('completes a full mount/update/unmount cycle without hitting them', async () => {
    process.env.NODE_ENV = 'development'
    vi.resetModules()
    const React = await import('react')
    const R3F = await import('../src/index')

    R3F.extend(THREE as any)
    const root = R3F.createRoot(createCanvas())

    function Test({ scale }: { scale: number }) {
      return React.createElement('mesh', { scale })
    }

    await act(async () => root.render(React.createElement(Test, { scale: 1 })))
    await act(async () => root.render(React.createElement(Test, { scale: 2 })))
    await expect(act(async () => root.unmount())).resolves.not.toThrow()
  })
})
