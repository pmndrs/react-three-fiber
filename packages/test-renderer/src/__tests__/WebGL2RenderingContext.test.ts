import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { WebGL2RenderingContext } from '../WebGL2RenderingContext'

/**
 * Guards the handle contract described on `returnsHandle` in the mock.
 *
 * These assertions look trivial, but the bug they cover was not: every `create*` stub returned
 * `undefined`, so three r185's `WeakMap`-keyed draw-buffer cache threw
 * `TypeError: Invalid value used as weak map key` the first time anything bound a
 * framebuffer-backed render target (#3820). The symptom appeared as a flaky, unrelated-looking
 * failure in the PMREM background test, so the useful thing to pin here is the *contract* rather
 * than that one test's outcome. The last case then renders an equirect background for real, which
 * is the same path from the other end: it fails if a handle is unusable, whatever the reason.
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

  it('lets three render an equirectangular background', () => {
    // Every assertion above pokes the mock directly. This one drives the path that actually broke:
    // an equirect background is resolved through PMREMGenerator, which binds a framebuffer-backed
    // render target, so three reaches WebGLState.drawBuffers() with a handle the mock produced.
    // It is the end-to-end counterpart to the contract -- if the mock regresses in some way the
    // direct assertions do not anticipate, three still has to be able to render.
    const canvas = document.createElement('canvas')
    canvas.width = 1280
    canvas.height = 800

    const renderer = new THREE.WebGLRenderer({ canvas })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()

    const texture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.needsUpdate = true
    scene.background = texture

    expect(() => renderer.render(scene, camera)).not.toThrow()
  })
})
