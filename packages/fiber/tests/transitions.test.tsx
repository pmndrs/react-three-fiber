/**
 * @fileoverview Transitions started inside the R3F tree (#3915)
 *
 * The reconciler is vendored from a pinned `react-reconciler` release, so the
 * transition objects it mints have to stay shape-compatible with whatever
 * `react-dom` the app runs. React 19.3 added a `types` field, and `react-dom`
 * 19.3 reads it guarded against `null` rather than `undefined` — so a
 * transition minted by an older reconciler passes the guard and then throws on
 * `undefined.length`.
 *
 * That only surfaces when a transition crosses from the R3F tree into a
 * react-dom root, which is why this test drives both.
 */
import * as React from 'react'
import { act } from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as THREE from 'three'
import { expect, it } from 'vitest'

import { createRoot, extend } from '../src'
import { createCanvas } from '../../test-renderer/src/createTestCanvas'

extend(THREE)

it('does not throw when a transition started inside the R3F tree updates DOM-tree state', async () => {
  const errors: string[] = []

  const host = document.createElement('div')
  document.body.appendChild(host)

  let setCount: React.Dispatch<React.SetStateAction<number>> = () => {}
  function DomApp() {
    const [count, setter] = React.useState(0)
    setCount = setter
    return React.createElement('span', null, String(count))
  }
  const domRoot = ReactDOMClient.createRoot(host, {
    onUncaughtError: (error: any) => errors.push(String(error?.message ?? error)),
  })
  await act(async () => {
    domRoot.render(React.createElement(DomApp))
  })

  let startFromCanvas: React.TransitionStartFunction = (() => {}) as any
  function CanvasChild() {
    const [, startTransition] = React.useTransition()
    startFromCanvas = startTransition
    return null
  }

  const root = createRoot(createCanvas())
  await act(async () => {
    root.render(React.createElement(CanvasChild))
  })

  // The DOM root needs a transition already pending for the scheduling path
  // that reads `transition.types` to run at all.
  React.startTransition(() => setCount((value) => value + 1))
  startFromCanvas(() => setCount((value) => value + 1))

  // The throw happens while the root is scheduled rather than during the
  // update itself, so let the scheduled work run before asserting.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })

  expect(errors).toEqual([])
})
