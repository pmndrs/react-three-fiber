// NOTE: intentionally NOT re-exported from ./index — internal helper only.

/**
 * Library frames whose reads of `state.gl` are internal plumbing, not user
 * intent: zustand cloning state during `setState`, and the `Object.assign`
 * shallow-merge that touches every enumerable getter while doing so.
 */
const INTERNAL_LIB_MARKERS = ['zustand', 'setState', 'Object.assign']

/**
 * R3F's own source is deliberately NOT on this list.
 *
 * It used to be: any frame under `packages/fiber/src|dist` (or the installed
 * `@react-three/fiber`) had its `state.gl` deprecation warning suppressed. That blanket
 * exemption was written for library plumbing, but it also covered genuine R3F code — the one
 * real internal consumer, `EnvironmentPortal`, sat inside its own exemption and so never
 * surfaced the warning it should have. Migrating to `state.renderer` is a v10 pillar; R3F must
 * hold itself to it, not silence itself.
 *
 * Core has no `state.gl` reads left, so nothing needs suppressing. If one is reintroduced it now
 * warns like any other consumer's would.
 */
/**
 * Decide whether a `state.gl` read (captured via `new Error().stack` inside the getter) came
 * from library plumbing that walks every enumerable getter — in which case the deprecation
 * warning is noise — rather than from a deliberate read in user, consumer, or R3F code.
 *
 * Only the IMMEDIATE caller frame is inspected. Scanning the whole stack would
 * misfire on every user access, because R3F internals (the reconciler,
 * scheduler, zustand) are always present further down the call stack.
 *
 * @param stack       The `.stack` string from an Error created inside the getter.
 * @param callerDepth Lines to skip to reach the immediate caller. On V8
 *                    (Node / Vitest / Chromium) the stack is
 *                    `Error` (0), the getter frame (1), then the caller (2).
 */
export function isInternalRendererAccess(stack: string | undefined, callerDepth = 2): boolean {
  if (!stack) return false
  const caller = stack.split('\n')[callerDepth] ?? ''
  return INTERNAL_LIB_MARKERS.some((m) => caller.includes(m))
}
