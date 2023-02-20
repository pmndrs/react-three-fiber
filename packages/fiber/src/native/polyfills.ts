import * as THREE from 'three'
import type { Asset } from 'expo-asset'

// Check if expo-asset is installed (available with expo modules)
let expAsset: typeof Asset | undefined
try {
  expAsset = require('expo-asset')?.Asset
} catch (_) {}

/**
 * Generates an asset based on input type.
 */
function getAsset(input: string | number) {
  switch (typeof input) {
    case 'string':
      return expAsset!.fromURI(input)
    case 'number':
      return expAsset!.fromModule(input)
    default:
      throw new Error('R3F: Invalid asset! Must be a URI or module.')
  }
}

let injected = false

export function polyfills() {
  if (!expAsset || injected) return
  injected = true

  // Don't pre-process urls, let expo-asset generate an absolute URL
  const extractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(THREE.LoaderUtils)
  THREE.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? extractUrlBase(url) : './')

  // There's no Image in native, so create a data texture instead
  const prevTextureLoad = THREE.TextureLoader.prototype.load
  THREE.TextureLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    const texture = new THREE.Texture()

    // @ts-ignore
    texture.isDataTexture = true

    getAsset(url)
      .downloadAsync()
      .then((asset: Asset) => {
        texture.image = {
          data: asset,
          width: asset.width,
          height: asset.height,
        }
        texture.flipY = true
        texture.unpackAlignment = 1
        texture.needsUpdate = true

        onLoad?.(texture)
      })
      .catch(onError)

    return texture
  }

  // Fetches assets via XMLHttpRequest
  const prevFileLoad = THREE.FileLoader.prototype.load
  THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    if (this.path) url = this.path + url

    const request = new XMLHttpRequest()

    getAsset(url)
      .downloadAsync()
      .then((asset) => {
        request.open('GET', asset.uri, true)

        request.addEventListener(
          'load',
          (event) => {
            if (request.status === 200) {
              onLoad?.(request.response)

              this.manager.itemEnd(url)
            } else {
              onError?.(event as unknown as ErrorEvent)

              this.manager.itemError(url)
              this.manager.itemEnd(url)
            }
          },
          false,
        )

        request.addEventListener(
          'progress',
          (event) => {
            onProgress?.(event)
          },
          false,
        )

        request.addEventListener(
          'error',
          (event) => {
            onError?.(event as unknown as ErrorEvent)

            this.manager.itemError(url)
            this.manager.itemEnd(url)
          },
          false,
        )

        request.addEventListener(
          'abort',
          (event) => {
            onError?.(event as unknown as ErrorEvent)

            this.manager.itemError(url)
            this.manager.itemEnd(url)
          },
          false,
        )

        if (this.responseType) request.responseType = this.responseType
        if (this.withCredentials) request.withCredentials = this.withCredentials

        for (const header in this.requestHeader) {
          request.setRequestHeader(header, this.requestHeader[header])
        }

        request.send(null)

        this.manager.itemStart(url)
      })

    return request
  }

  // Cleanup function
  return () => {
    THREE.LoaderUtils.extractUrlBase = extractUrlBase
    THREE.TextureLoader.prototype.load = prevTextureLoad
    THREE.FileLoader.prototype.load = prevFileLoad
  }
}
