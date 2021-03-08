import { Root } from './renderer'
import { RootState } from './store'

type GlobalRenderCallback = (timeStamp: number) => boolean

function createSubs(callback: GlobalRenderCallback, subs: GlobalRenderCallback[]): () => void {
  const index = subs.length
  subs.push(callback)
  return () => void subs.splice(index, 1)
}

let globalEffects: GlobalRenderCallback[] = []
let globalAfterEffects: GlobalRenderCallback[] = []
let globalTailEffects: GlobalRenderCallback[] = []
export const addEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalEffects)
export const addAfterEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalAfterEffects)
export const addTail = (callback: GlobalRenderCallback) => createSubs(callback, globalTailEffects)

export function render(state: RootState, timestamp: number, repeat = 0, runGlobalEffects = false) {
  let i

  // Run global effects
  if (runGlobalEffects) {
    for (i = 0; i < globalEffects.length; i++) {
      globalEffects[i](timestamp)
      repeat++
    }
  }

  // Run local effects
  const delta = state.clock.getDelta()
  // Call subscribers (useFrame)
  for (i = 0; i < state.internal.subscribers.length; i++) state.internal.subscribers[i].ref.current(state, delta)

  // Decrease frame count
  state.internal.frames = Math.max(0, state.internal.frames - 1)
  repeat += state.frameloop ? 1 : state.internal.frames
  // Render content
  if (!state.internal.priority && state.gl.render) state.gl.render(state.scene, state.camera)
  // Run global after-effects
  if (runGlobalEffects) for (i = 0; i < globalAfterEffects.length; i++) globalAfterEffects[i](timestamp)

  return repeat
}

function createLoop<TCanvas>(roots: Map<TCanvas, Root>) {
  let running = false

  function loop(timestamp: number) {
    running = true

    let i
    let repeat = 0
    // Run global effects
    for (i = 0; i < globalEffects.length; i++) {
      globalEffects[i](timestamp)
      repeat++
    }

    roots.forEach((root) => {
      const state = root.store.getState()
      // If the frameloop is invalidated, do not run another frame
      repeat = state.frameloop || state.internal.frames > 0 ? render(state, timestamp, repeat) : 0
    })

    // Run global after-effects
    for (i = 0; i < globalAfterEffects.length; i++) globalAfterEffects[i](timestamp)
    // Keep on looping if anything invalidates the frameloop
    if (repeat !== 0) return requestAnimationFrame(loop)
    // Tail call effects, they are called when rendering stops
    else for (i = 0; i < globalTailEffects.length; i++) globalTailEffects[i](timestamp)

    // Flag end of operation
    running = false
  }

  function invalidate(state: RootState | boolean = true, frames = 1) {
    if (state === true) {
      roots.forEach((root) => (root.store.getState().internal.frames += frames))
    } else if (state) {
      if (state.vr) return
      state.internal.frames += frames
    }
    if (!running) {
      running = true
      requestAnimationFrame(loop)
    }
  }

  return { loop, invalidate }
}

export { createLoop }
