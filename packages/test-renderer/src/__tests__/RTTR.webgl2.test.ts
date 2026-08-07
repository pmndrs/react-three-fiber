import * as THREE from 'three'

import { WebGL2RenderingContext } from '../WebGL2RenderingContext'

const objectFactories = [
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
]

describe('WebGL2RenderingContext object factories', () => {
  const createContext = () => new WebGL2RenderingContext({ width: 1280, height: 800 } as HTMLCanvasElement) as any

  // three tracks per-object render state in WeakMaps — WebGLState.drawBuffers keys on the
  // framebuffer handed back by createFramebuffer — so a factory returning undefined throws
  // the first time a render target is bound.
  it('return values that can key a WeakMap', () => {
    const gl = createContext()

    for (const factory of objectFactories) {
      expect(() => new WeakMap().set(gl[factory](), true)).not.toThrow()
    }
  })

  it('return a distinct object per call', () => {
    const gl = createContext()

    expect(gl.createFramebuffer()).not.toBe(gl.createFramebuffer())
  })

  it('let three render an equirectangular background', () => {
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

    // Equirect backgrounds go through PMREMGenerator, which binds a framebuffer-backed
    // render target — the path that fails when createFramebuffer returns undefined.
    expect(() => renderer.render(scene, camera)).not.toThrow()
  })
})
