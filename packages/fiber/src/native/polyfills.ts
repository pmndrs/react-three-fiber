import * as THREE from 'three'
import { Image } from 'react-native'
import type { Asset } from 'expo-asset'

// Check if expo-asset is installed (available with expo modules)
let expAsset: typeof Asset | undefined
try {
  expAsset = require('expo-asset')?.Asset
} catch (_) {}

/**
 * Generates an asset based on input type.
 */
async function getAsset(input: string | number): Promise<Asset> {
  switch (typeof input) {
    case 'string':
      if (input.startsWith('data:')) return { localUri: input } as Asset
      return expAsset!.fromURI(input).downloadAsync()
    case 'number':
      return expAsset!.fromModule(input).downloadAsync()
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

    getAsset(url)
      .then(async (asset: Asset) => {
        if (!asset.width || !asset.height) {
          const { width, height } = await new Promise<{ width: number; height: number }>((res, rej) =>
            Image.getSize(asset.localUri!, (width, height) => res({ width, height }), rej),
          )
          asset.width = width
          asset.height = height
        }

        texture.image = {
          data: asset,
          width: asset.width,
          height: asset.height,
        }
        texture.flipY = false
        texture.unpackAlignment = 1
        texture.needsUpdate = true

        // @ts-ignore
        texture.isDataTexture = true

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
      .catch(onError)

    return request
  }

  // Cleanup function
  return () => {
    THREE.LoaderUtils.extractUrlBase = extractUrlBase
    THREE.TextureLoader.prototype.load = prevTextureLoad
    THREE.FileLoader.prototype.load = prevFileLoad
  }
}
