import { describe, it, expect } from 'vitest'
import { WebGL2RenderingContext } from '../WebGL2RenderingContext'

/**
 * Guards the handle contract described on `returnsHandle` in the mock.
 *
 * These assertions look trivial, but the bug they cover was not: every `create*` stub returned
 * `undefined`, so three r185's `WeakMap`-keyed draw-buffer cache threw
 * `TypeError: Invalid value used as weak map key` the first time anything bound a
 * framebuffer-backed render target (#3820). The symptom appeared as a flaky, unrelated-looking
 * failure in the PMREM background test, so the useful thing to pin here is the *contract* rather
 * than that one test's outcome.
 */
describe('WebGL2RenderingContext mock', () => {
  const createContext = () => new WebGL2RenderingContext(document.createElement('canvas'))

  const handleFactories = [
    'createBuffer',
    'createFramebuffer',
    'createProgram',
    'createQuery',
    'createRenderbuffer',
    'createSampler',
    'createShader',
    'createTexture',
    'createTransformFeedback',
    'createVertexArray',
    'fenceSync',
  ] as const

  it.each(handleFactories)('%s returns a usable object handle', (method) => {
    const gl = createContext()
    const handle = gl[method]()

    expect(handle).toBeTypeOf('object')
    expect(handle).not.toBeNull()
  })

  it('hands out a distinct handle per call, so handles work as identities', () => {
    const gl = createContext()

    // Same call twice must not collapse to one identity -- three tracks state per framebuffer,
    // and shared handles would silently merge unrelated render targets' state.
    expect(gl.createFramebuffer()).not.toBe(gl.createFramebuffer())
  })

  it('produces handles that are valid WeakMap keys (the three r185 constraint)', () => {
    const gl = createContext()
    const cache = new WeakMap<object, string[]>()

    // This is the exact operation three's WebGLState.drawBuffers() performs; with the old
    // `() => {}` stub it threw "Invalid value used as weak map key".
    expect(() => cache.set(gl.createFramebuffer(), [])).not.toThrow()
  })

  it('still stubs non-handle entry points as void', () => {
    const gl = createContext()

    // The handle rule keys off the WebGL naming convention, so a command that merely *contains*
    // "create" in a later position must not be caught by it.
    expect(gl.bindFramebuffer()).toBeUndefined()
    expect(gl.drawBuffers()).toBeUndefined()
  })
})
