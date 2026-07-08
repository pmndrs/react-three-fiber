// NOTE: intentionally NOT re-exported from ./index — internal helper only.

/**
 * Library frames whose reads of `state.gl` are internal plumbing, not user
 * intent: zustand cloning state during `setState`, and the `Object.assign`
 * shallow-merge that touches every enumerable getter while doing so.
 */
const INTERNAL_LIB_MARKERS = ['zustand', 'setState', 'Object.assign']

/**
 * Path fragments that identify a frame as R3F's own runtime code — across every
 * environment it actually ships/runs in:
 *   - `packages/fiber/src`  — monorepo dev source (repo-name independent)
 *   - `packages/fiber/dist` — monorepo built output
 *   - `@react-three/fiber`  — installed package (node_modules)
 *   - `@react-three_fiber`  — Vite dep-optimized form of the above
 *
 * Deliberately path-INDEPENDENT: the previous heuristic hard-coded
 * `react-three-fiber/packages/fiber/src/core`, which only matched a checkout
 * literally named `react-three-fiber` — so it suppressed everything there
 * (the getter's own frame always matched) and nothing anywhere else (installed
 * as `@react-three/fiber`, or any other directory name). Note these markers
 * match `packages/fiber/src|dist` but NOT `packages/fiber/tests`, so the test
 * suite's own `state.gl` access is correctly treated as external.
 */
const INTERNAL_FIBER_MARKERS = ['packages/fiber/src', 'packages/fiber/dist', '@react-three/fiber', '@react-three_fiber']

/**
 * Decide whether a `state.gl` read (captured via `new Error().stack` inside the
 * getter) originated from R3F's own machinery — in which case the deprecation
 * warning should be suppressed — rather than from user/consumer code.
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
  return INTERNAL_LIB_MARKERS.some((m) => caller.includes(m)) || INTERNAL_FIBER_MARKERS.some((m) => caller.includes(m))
}
