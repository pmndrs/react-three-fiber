import { isInternalRendererAccess } from '../src/core/utils/isInternalRendererAccess'

/**
 * Build a synthetic V8-format stack: `Error`, then the `state.gl` getter frame,
 * then the immediate caller (the frame the heuristic actually inspects), then a
 * couple of always-internal deeper frames to prove they are NOT considered.
 */
function stack(callerFrame: string): string {
  return [
    'Error',
    '    at Object.get [as gl] (/anywhere/store.ts:300:23)', // the getter itself
    `    at ${callerFrame}`, // <- immediate caller (index 2)
    '    at renderLoop (/anywhere/packages/fiber/src/core/renderer.tsx:700:5)', // deeper: internal
    '    at step (/root/node_modules/@pmndrs/scheduler/dist/index.js:42:9)', // deeper: internal
  ].join('\n')
}

describe('isInternalRendererAccess', () => {
  it('returns false for a missing stack', () => {
    expect(isInternalRendererAccess(undefined)).toBe(false)
    expect(isInternalRendererAccess('')).toBe(false)
  })

  describe('suppresses internal access (returns true)', () => {
    it('zustand state cloning', () => {
      expect(isInternalRendererAccess(stack('Map.setState (/root/node_modules/zustand/esm/vanilla.mjs:20:5)'))).toBe(
        true,
      )
    })

    it('Object.assign spread over enumerable getters', () => {
      expect(isInternalRendererAccess(stack('Object.assign (<anonymous>)'))).toBe(true)
    })

    it("R3F's own dev source (monorepo, any repo name)", () => {
      // The key regression: a directory NOT named "react-three-fiber".
      expect(
        isInternalRendererAccess(
          stack(
            'Environment (/Users/dev/r3f-a3-test-coverage/packages/fiber/src/core/components/Environment.tsx:272:20)',
          ),
        ),
      ).toBe(true)
    })

    it("R3F's built monorepo output", () => {
      expect(isInternalRendererAccess(stack('r (/repo/packages/fiber/dist/index.mjs:1:5000)'))).toBe(true)
    })

    it('the installed package (node_modules/@react-three/fiber)', () => {
      expect(
        isInternalRendererAccess(stack('Environment (/app/node_modules/@react-three/fiber/dist/index.mjs:1:9000)')),
      ).toBe(true)
    })

    it('the Vite dep-optimized package form', () => {
      expect(
        isInternalRendererAccess(stack('Environment (/app/node_modules/.vite/deps/@react-three_fiber.js:900:12)')),
      ).toBe(true)
    })
  })

  describe('warns on external access (returns false)', () => {
    it('user application code', () => {
      expect(isInternalRendererAccess(stack('App (/Users/dev/my-app/src/App.tsx:14:19)'))).toBe(false)
    })

    it('a consumer library that should migrate (e.g. drei)', () => {
      // drei lives under @react-three/drei — must NOT be mistaken for fiber internals.
      expect(
        isInternalRendererAccess(
          stack('useEnvironment (/app/node_modules/@react-three/drei/core/Environment.js:30:8)'),
        ),
      ).toBe(false)
    })

    it("the test suite's own access (packages/fiber/tests, not src/dist)", () => {
      expect(isInternalRendererAccess(stack('/repo/packages/fiber/tests/gl-deprecation.test.tsx:40:22'))).toBe(false)
    })

    it('does NOT let always-internal deeper frames leak in (only the immediate caller matters)', () => {
      // Caller is user code; the deeper renderer.tsx / scheduler frames must be ignored.
      expect(isInternalRendererAccess(stack('onClick (/Users/dev/my-app/src/Scene.tsx:88:7)'))).toBe(false)
    })
  })

  it('honors a custom callerDepth', () => {
    // Firefox/Safari stacks omit the leading "Error" line, so the caller sits one line earlier.
    const ffStack = ['get@/anywhere/store.ts:300:23', 'App@/Users/dev/my-app/src/App.tsx:14:19'].join('\n')
    expect(isInternalRendererAccess(ffStack, 1)).toBe(false)
    expect(isInternalRendererAccess(ffStack.replace('my-app/src', 'packages/fiber/src'), 1)).toBe(true)
  })
})
