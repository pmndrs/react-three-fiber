/// <reference lib="es2021.weakref" />

import * as React from 'react'
import { act } from 'react'
import * as v8 from 'v8'
import * as vm from 'vm'
import { advance, createRoot, useFrame } from '../src/index'

v8.setFlagsFromString('--expose-gc')
const gc: () => void = vm.runInNewContext('gc')

// Mounts a root with a frame subscriber, runs its frames, unmounts it, and keeps only a weak reference.
// The canvas comes from the DOM because createCanvas from test-renderer closes over the canvas it returns.
async function mountAndUnmount(
  frameloop: 'demand' | 'never',
  runFrames: (frameRan: Promise<void>) => Promise<unknown>,
) {
  const canvas = document.createElement('canvas')
  const root = createRoot(canvas)

  let onFrame!: () => void
  const frameRan = new Promise<void>((resolve) => (onFrame = resolve))
  function Subscriber() {
    useFrame(() => onFrame())
    return null
  }

  await act(async () => (await root.configure({ frameloop })).render(<Subscriber />))
  await act(async () => runFrames(frameRan))
  await act(async () => root.unmount())

  return new WeakRef(canvas)
}

// A WeakRef keeps its target alive until the current job ends, so each attempt waits for a new task.
async function isCollected(target: WeakRef<object>) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await new Promise((resolve) => setTimeout(resolve))
    gc()
    await new Promise((resolve) => setTimeout(resolve))
    if (!target.deref()) return true
  }
  return false
}

describe('frame loop retention', () => {
  it('releases an unmounted root that never ran a frame', async () => {
    const canvas = await mountAndUnmount('never', async () => {})
    expect(await isCollected(canvas)).toBe(true)
  })

  it('releases an unmounted root after requestAnimationFrame ran its frame', async () => {
    const canvas = await mountAndUnmount('demand', (frameRan) => frameRan)
    expect(await isCollected(canvas)).toBe(true)
  })

  it('releases an unmounted root after advance ran its frame', async () => {
    const canvas = await mountAndUnmount('never', async (frameRan) => {
      advance(1)
      await frameRan
    })
    expect(await isCollected(canvas)).toBe(true)
  })
})
