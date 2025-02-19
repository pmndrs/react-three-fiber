import * as THREE from 'three'
import { polyfills } from '../src/native/polyfills'

polyfills()

const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('polyfills', () => {
  it('loads images via data textures', async () => {
    const texture = await new THREE.TextureLoader().loadAsync(pixel)
    expect((texture as any).isDataTexture).toBe(true)
    expect(texture.image.width).toBe(1)
    expect(texture.image.height).toBe(1)
  })

  it('creates a safe image URI for JSI', async () => {
    const texture = await new THREE.TextureLoader().loadAsync(pixel)
    expect(texture.image.data.localUri.startsWith('file:///')).toBe(true)
  })

  it('unpacks drawables in Android APK', async () => {
    const texture = await new THREE.TextureLoader().loadAsync('drawable.png')
    expect(texture.image.data.localUri.includes(':')).toBe(true)
  })

  it('loads files via the file system', async () => {
    const asset = 1
    const file = await new THREE.FileLoader().loadAsync(asset as any)
    expect(typeof (file as ArrayBuffer).byteLength).toBe('number') // TODO: ArrayBuffer instanceof
  })

  it('loads files via http', async () => {
    const file = await new THREE.FileLoader().loadAsync('https://example.com/test.png')
    expect(typeof (file as ArrayBuffer).byteLength).toBe('number') // TODO: ArrayBuffer instanceof
  })
})
