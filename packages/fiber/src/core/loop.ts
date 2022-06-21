import * as THREE from 'three'
import { Root } from './renderer'
import { RootState, Subscription } from './store'

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

/**
 * Adds a global render callback which is called each frame.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addEffect
 */
export const addEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalEffects)

/**
 * Adds a global after-render callback which is called each frame.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addAfterEffect
 */
export const addAfterEffect = (callback: GlobalRenderCallback) => createSubs(callback, globalAfterEffects)

/**
 * Adds a global callback which is called when rendering stops.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#addTail
 */
export const addTail = (callback: GlobalRenderCallback) => createSubs(callback, globalTailEffects)

function run(effects: GlobalRenderCallback[], timestamp: number) {
  for (i = 0; i < effects.length; i++) effects[i](timestamp)
}

function update(timestamp: number, state: RootState, frame?: THREE.XRFrame) {
  // Run local effects
  let delta = state.clock.getDelta()
  // In frameloop='never' mode, clock times are updated using the provided timestamp
  if (state.frameloop === 'never' && typeof timestamp === 'number') {
    delta = timestamp - state.clock.elapsedTime
    state.clock.oldTime = state.clock.elapsedTime
    state.clock.elapsedTime = timestamp
  } else {
    delta = Math.max(Math.min(delta, state.internal.maxDelta), 0)
  }
  // Call subscribers (useUpdate)
  for (const stage of state.internal.stages) {
    stage.frame(delta, frame)
  }

  state.internal.frames = Math.max(0, state.internal.frames - 1)
  return state.frameloop === 'always' ? 1 : state.internal.frames
}

export function createLoop<TCanvas>(roots: Map<TCanvas, Root>) {
  let running = false
  let repeat: number
  let frame: number
  let state: RootState

  function loop(timestamp: number): void {
    frame = requestAnimationFrame(loop)
    running = true
    repeat = 0

    // Run effects
    if (globalEffects.length) run(globalEffects, timestamp)

    // Render all roots
    roots.forEach((root) => {
      state = root.store.getState()

      // If the frameloop is invalidated, do not run another frame
      if (
        state.internal.active &&
        (state.frameloop === 'always' || state.internal.frames > 0) &&
        !state.gl.xr?.isPresenting
      ) {
        repeat += update(timestamp, state)
      }
    })

    // Run after-effects
    if (globalAfterEffects.length) run(globalAfterEffects, timestamp)

    // Stop the loop if nothing invalidates it
    if (repeat === 0) {
      // Tail call effects, they are called when rendering stops
      if (globalTailEffects.length) run(globalTailEffects, timestamp)

      // Flag end of operation
      running = false
      return cancelAnimationFrame(frame)
    }
  }

  function invalidate(state?: RootState, frames = 1): void {
    if (!state) return roots.forEach((root) => invalidate(root.store.getState()), frames)
    if (state.gl.xr?.isPresenting || !state.internal.active || state.frameloop === 'never') return
    // Increase frames, do not go higher than 60
    state.internal.frames = Math.min(60, state.internal.frames + frames)
    // If the render-loop isn't active, start it
    if (!running) {
      running = true
      requestAnimationFrame(loop)
    }
  }

  function advance(
    timestamp: number,
    runGlobalEffects: boolean = true,
    state?: RootState,
    frame?: THREE.XRFrame,
  ): void {
    if (runGlobalEffects) run(globalEffects, timestamp)
    if (!state) roots.forEach((root) => update(timestamp, root.store.getState()))
    else update(timestamp, state, frame)
    if (runGlobalEffects) run(globalAfterEffects, timestamp)
  }

  return {
    loop,
    /**
     * Invalidates the view, requesting a frame to be rendered. Will globally invalidate unless passed a root's state.
     * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#invalidate
     */
    invalidate,
    /**
     * Advances the frameloop and runs render effects, useful for when manually rendering via `frameloop="never"`.
     * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#advance
     */
    advance,
  }
}
