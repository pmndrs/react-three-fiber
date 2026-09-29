/**
 * @fileoverview Transitions crossing between the R3F tree and the host React (#3915)
 *
 * The reconciler is vendored from a pinned `react-reconciler` release, so the transition objects it
 * mints have to stay shape-compatible with whatever `react`/`react-dom` the app runs, in both
 * directions. React 19.3 added a `types` field to transitions:
 *
 * - A reconciler built from 0.33.0 mints transitions without `types`. react-dom 19.3 guards that
 *   field against `null` rather than `undefined`, so the older shape passes the guard and
 *   `queueTransitionTypes` throws on `undefined.length`. Fixed by building from 0.34.0.
 * - The reverse: the 0.34.0 reconciler applies the same `null` guard to transitions minted by a
 *   React 19.0–19.2 host, which have no `types` at all. `vite.config.ts` rewrites that guard to
 *   `null !=` while vendoring so the reconciler accepts both shapes.
 *
 * Either throw only surfaces when a transition crosses roots, which is why every test here drives
 * both a canvas root and either a react-dom root or the host `React.startTransition`.
 */
import * as React from 'react'
import { act } from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { createRoot, extend } from '../src'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

extend(THREE)

describe('transitions across roots', () => {
  it('updates DOM state from a transition started inside the canvas', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    let setCount: React.Dispatch<React.SetStateAction<number>> = null!
    function DomApp() {
      const [count, setter] = React.useState(0)
      setCount = setter
      return <span>{count}</span>
    }
    const domRoot = ReactDOMClient.createRoot(host)
    await act(async () => domRoot.render(<DomApp />))

    let startFromCanvas: React.TransitionStartFunction = null!
    function CanvasChild() {
      const [, startTransition] = React.useTransition()
      startFromCanvas = startTransition
      return null
    }
    const root = createRoot(createCanvas())
    await act(async () => root.render(<CanvasChild />))

    // react-dom only reads transition.types while another transition is already pending
    await act(async () => {
      React.startTransition(() => setCount((value) => value + 1))
      startFromCanvas(() => setCount((value) => value + 1))
    })
    expect(host.textContent).toBe('2')

    await act(async () => domRoot.unmount())
    await act(async () => root.unmount())
    host.remove()
  })

  it('updates canvas state from React.startTransition on the host React', async () => {
    let setCount: React.Dispatch<React.SetStateAction<number>> = null!
    function CanvasChild() {
      const [count, setter] = React.useState(0)
      setCount = setter
      return <group name={`count-${count}`} />
    }
    const root = createRoot(createCanvas())
    const store = await act(async () => root.render(<CanvasChild />))
    const { scene } = store.getState()
    expect(scene.getObjectByName('count-0')).toBeDefined()

    await act(async () => React.startTransition(() => setCount((value) => value + 1)))
    expect(scene.getObjectByName('count-0')).toBeUndefined()
    expect(scene.getObjectByName('count-1')).toBeDefined()

    await act(async () => root.unmount())
  })

  it('updates canvas state from a useTransition started inside a react-dom tree', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    let setCount: React.Dispatch<React.SetStateAction<number>> = null!
    function CanvasChild() {
      const [count, setter] = React.useState(0)
      setCount = setter
      return <group name={`count-${count}`} />
    }
    const root = createRoot(createCanvas())
    const store = await act(async () => root.render(<CanvasChild />))
    const { scene } = store.getState()

    let startFromDom: React.TransitionStartFunction = null!
    function DomApp() {
      const [, startTransition] = React.useTransition()
      startFromDom = startTransition
      return null
    }
    const domRoot = ReactDOMClient.createRoot(host)
    await act(async () => domRoot.render(<DomApp />))

    await act(async () => startFromDom(() => setCount((value) => value + 1)))
    expect(scene.getObjectByName('count-0')).toBeUndefined()
    expect(scene.getObjectByName('count-1')).toBeDefined()

    await act(async () => domRoot.unmount())
    await act(async () => root.unmount())
    host.remove()
  })
})

// ViewTransition commits synchronously since three.js has nothing to animate. React 19.3 added it,
// so older React versions skip these tests
const { ViewTransition, addTransitionType } = React as any
const describeViewTransition = ViewTransition ? describe : describe.skip

describeViewTransition('ViewTransition', () => {
  it('mounts a subtree through a transition', async () => {
    const effects: string[] = []
    let setShown: React.Dispatch<React.SetStateAction<boolean>> = null!

    function Test() {
      const [shown, setter] = React.useState(false)
      setShown = setter
      React.useLayoutEffect(() => void effects.push(`layout:${shown}`), [shown])
      React.useEffect(() => void effects.push(`passive:${shown}`), [shown])
      return shown ? (
        <ViewTransition enter="fade">
          <group name="shown" />
        </ViewTransition>
      ) : null
    }

    const root = createRoot(createCanvas())
    const store = await act(async () => root.render(<Test />))
    const { scene } = store.getState()
    expect(scene.getObjectByName('shown')).toBeUndefined()

    await act(async () => React.startTransition(() => setShown(true)))
    expect(scene.getObjectByName('shown')).toBeInstanceOf(THREE.Group)
    expect(effects).toEqual(['layout:false', 'passive:false', 'layout:true', 'passive:true'])

    // Regular updates still commit afterwards
    await act(async () => setShown(false))
    expect(scene.getObjectByName('shown')).toBeUndefined()

    await act(async () => root.unmount())
  })

  it('updates and unmounts a subtree through transitions', async () => {
    let setStep: React.Dispatch<React.SetStateAction<number>> = null!

    function Test() {
      const [step, setter] = React.useState(0)
      setStep = setter
      if (step > 1) return null
      return (
        <ViewTransition name="box" update="slide">
          <mesh name="box" position-x={step} />
        </ViewTransition>
      )
    }

    const root = createRoot(createCanvas())
    const store = await act(async () => root.render(<Test />))
    const { scene } = store.getState()
    const mesh = scene.getObjectByName('box') as THREE.Mesh
    expect(mesh).toBeInstanceOf(THREE.Mesh)

    await act(async () =>
      React.startTransition(() => {
        addTransitionType('slide')
        setStep(1)
      }),
    )
    // Updated in place rather than remounted
    expect(scene.getObjectByName('box')).toBe(mesh)
    expect(mesh.position.x).toBe(1)

    await act(async () => React.startTransition(() => setStep(2)))
    expect(scene.getObjectByName('box')).toBeUndefined()

    await act(async () => root.unmount())
  })
})
