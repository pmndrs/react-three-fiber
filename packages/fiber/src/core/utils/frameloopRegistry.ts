//* Per-Root Frameloop Registry ==============================
//
// The scheduler's frameloop is process-global by design ("A single requestAnimationFrame
// loop for the entire application"). `<Canvas frameloop>` however reads as a per-canvas
// prop, and writing it straight to the scheduler made one canvas on 'demand' stop the
// shared loop for every other canvas (#3852).
//
// This registry keeps the per-root intent and reconciles the two layers:
//
//   - The GLOBAL mode is derived from all registered roots: the loop runs if ANY root
//     wants 'always', accepts invalidations if any root wants 'demand', and only rests
//     at 'never' when every root is manually driven.
//   - A root on 'demand' while the loop runs for others is gated per frame: its jobs
//     (system and useFrame) only execute on frames it has been invalidated for.
//
// Roots on 'never' are never gated — their contract is "tick whenever a frame is driven
// manually" (scheduler.step / advance), and the loop never runs on their behalf.

import { getScheduler, type Scheduler } from '@pmndrs/scheduler'

//* Type Imports ==============================
import type { Frameloop } from '#types'

interface RootLoop {
  frameloop: Frameloop
  /** Pending invalidated frames for this root (only consulted on 'demand') */
  frames: number
  /** Whether this root's jobs run during the frame currently executing */
  ticking: boolean
}

// Matches the scheduler's own pendingFrames cap
const MAX_PENDING_FRAMES = 60

//* Cross-Bundle Singleton ==============================
// Keyed by scheduler instance so Scheduler.reset() (tests, HMR) implicitly resets us,
// and held on globalThis so the legacy and webgpu bundles share one registry.
const R3F_ROOT_LOOPS = Symbol.for('@react-three/fiber.rootLoops')
const registries: WeakMap<Scheduler, Map<string, RootLoop>> = (globalThis as any)[R3F_ROOT_LOOPS] ??
((globalThis as any)[R3F_ROOT_LOOPS] = new WeakMap())

function getRootLoops(): Map<string, RootLoop> {
  const scheduler = getScheduler()
  let loops = registries.get(scheduler)
  if (!loops) {
    loops = new Map()
    registries.set(scheduler, loops)
  }
  return loops
}

/**
 * Derive the global scheduler mode from every root's requested frameloop.
 * 'always' wins over 'demand' wins over 'never' — the loop must serve the
 * most demanding root; the others are gated per frame instead.
 */
function applyDerivedFrameloop(): void {
  const loops = getRootLoops()
  if (loops.size === 0) return
  let derived: Frameloop = 'never'
  for (const loop of loops.values()) {
    if (loop.frameloop === 'always') {
      derived = 'always'
      break
    }
    if (loop.frameloop === 'demand') derived = 'demand'
  }
  // The scheduler's setter is idempotent and owns starting/stopping the loop
  getScheduler().frameloop = derived
}

/** Register a root's frameloop intent. Called when the root registers with the scheduler. */
export function registerRootLoop(rootId: string, frameloop: Frameloop): void {
  getRootLoops().set(rootId, { frameloop, frames: 0, ticking: true })
  applyDerivedFrameloop()
}

/** Remove a root and re-derive the global mode. Called from the root's unregister cleanup. */
export function releaseRootLoop(rootId: string): void {
  getRootLoops().delete(rootId)
  applyDerivedFrameloop()
}

/**
 * Update one root's frameloop and re-derive the global mode.
 * A no-op before the root has registered — registration reads the store's
 * current `frameloop`, so the intent is picked up there.
 */
export function setRootFrameloop(rootId: string | undefined, frameloop: Frameloop): void {
  if (!rootId) return
  const loop = getRootLoops().get(rootId)
  if (!loop || loop.frameloop === frameloop) return
  loop.frameloop = frameloop
  // Pending frames accumulated under the previous mode ('always' roots collect them
  // without ever consuming) would drain as phantom renders after a switch to 'demand'
  loop.frames = 0
  applyDerivedFrameloop()
}

/**
 * Request frames for one root. Mirrors the scheduler's invalidate semantics:
 * `stackFrames: false` replaces the pending count, `true` accumulates (capped).
 */
export function invalidateRootLoop(rootId: string, frames = 1, stackFrames = false): void {
  const loop = getRootLoops().get(rootId)
  if (!loop) return
  loop.frames = Math.min(MAX_PENDING_FRAMES, stackFrames ? loop.frames + frames : frames)
}

/** Request frames for every registered root (invalidate/advance without a target root). */
export function invalidateAllRootLoops(frames = 1, stackFrames = false): void {
  for (const rootId of getRootLoops().keys()) invalidateRootLoop(rootId, frames, stackFrames)
}

/**
 * Frame gate, run as the root's first 'start'-phase job. Decides whether this root
 * participates in the executing frame and consumes one pending frame if so.
 */
export function beginRootFrame(rootId: string): void {
  const loop = getRootLoops().get(rootId)
  if (!loop) return
  if (loop.frameloop !== 'demand') {
    loop.ticking = true
    return
  }
  loop.ticking = loop.frames > 0
  if (loop.ticking) loop.frames--
}

/**
 * Run as the root's last 'finish'-phase job: lift the gate once the frame is over,
 * so out-of-frame manual stepping (FrameControls.step / scheduler.stepJob) still works
 * on a root that sat out the last loop frame.
 */
export function endRootFrame(rootId: string): void {
  const loop = getRootLoops().get(rootId)
  if (loop) loop.ticking = true
}

/** Whether jobs belonging to this root should execute right now. */
export function rootIsTicking(rootId: string | undefined): boolean {
  if (!rootId) return true
  const loop = getRootLoops().get(rootId)
  return loop ? loop.ticking : true
}
