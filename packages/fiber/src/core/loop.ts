import { Root } from './renderer'
import { RootState } from './store'

type GlobalRenderCallback = (timeStamp: number) => void

function createSubs(callback: GlobalRenderCallback, subs: GlobalRenderCallback[]): () => void {
  const index = subs.length
  subs.push(callback)
  return () => void subs.splice(index, 1)
}

let i
let globalEffects: GlobalRenderCallback[] = []
let globalAfterEffects: GlobalRenderCallback[] = []
let globalTailEffects: GlobalRenderCallback[] = []
export const addEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalEffects)
export const addAfterEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalAfterEffects)
export const addTail = (callback: GlobalRenderCallback) => createSubs(callback, globalTailEffects)

function run(effects: GlobalRenderCallback[], timestamp: number) {
  for (i = 0; i < effects.length; i++) effects[i](timestamp)
}

function render(timestamp: number, state: RootState) {
  // Run local effects
  let delta = state.clock.getDelta()
  // In frameloop='never' mode, clock times are updated using the provided timestamp
  if (state.frameloop === 'never' && typeof timestamp === 'number') {
    delta = timestamp - state.clock.elapsedTime
    state.clock.oldTime = state.clock.elapsedTime
    state.clock.elapsedTime = timestamp
  }
  // Call subscribers (useFrame)
  for (i = 0; i < state.internal.subscribers.length; i++) state.internal.subscribers[i].ref.current(state, delta)
  // Render content
  if (!state.internal.priority && state.gl.render) state.gl.render(state.scene, state.camera)
  // Decrease frame count
  state.internal.frames = Math.max(0, state.internal.frames - 1)
  return state.frameloop === 'always' ? 1 : state.internal.frames
}

export function createLoop<TCanvas>(roots: Map<TCanvas, Root>) {
  let running = false
  let repeat: number
  function loop(timestamp: number) {
    running = true
    repeat = 0

    // Run effects
    run(globalEffects, timestamp)
    // Render all roots
    roots.forEach((root) => {
      const state = root.store.getState()
      // If the frameloop is invalidated, do not run another frame
      if (state.internal.active && (state.frameloop === 'always' || state.internal.frames > 0) && !state.vr)
        repeat += render(timestamp, state)
    })
    // Run after-effects
    run(globalAfterEffects, timestamp)

    // Keep on looping if anything invalidates the frameloop
    if (repeat > 0) return requestAnimationFrame(loop)
    // Tail call effects, they are called when rendering stops
    else run(globalTailEffects, timestamp)

    // Flag end of operation
    running = false
  }

  function invalidate(state?: RootState): void {
    if (!state) return roots.forEach((root) => invalidate(root.store.getState()))
    if (state.vr || !state.internal.active || state.frameloop === 'never') return
    // Increase frames, do not go higher than 60
    state.internal.frames = Math.min(60, state.internal.frames + 1)
    // If the render-loop isn't active, start it
    if (!running) {
      running = true
      requestAnimationFrame(loop)
    }
  }

  function advance(timestamp: number, runGlobalEffects: boolean = true, state?: RootState): void {
    if (runGlobalEffects) run(globalEffects, timestamp)
    if (!state) roots.forEach((root) => render(timestamp, root.store.getState()))
    else render(timestamp, state)
    if (runGlobalEffects) run(globalAfterEffects, timestamp)
  }

  return { loop, invalidate, advance }
}
