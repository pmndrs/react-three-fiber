import * as THREE from 'three'
import type { Asset } from 'expo-asset'
import type { RelocationOptions } from 'expo-file-system'

// Check if expo-asset is installed (available with expo modules)
let expAsset: typeof Asset | undefined
// expo-file-system will never be installed in case if expo is not here
let copyAsync: null | ((...args: RelocationOptions) => Promise<void>) = null
let cacheDirectory: string | null = null
try {
  expAsset = require('expo-asset')?.Asset
  const fs = require('expo-file-system')
  copyAsync = fs.copyAsync
  cacheDirectory = fs.cacheDirectory
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
    const asset = getAsset(url)

    ;(async () => {
      // this means it's android liniking
      if (copyAsync && cacheDirectory && !asset.uri.includes('://')) {
        const localUri = `${cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`
        await copyAsync({
          from: asset.uri,
          to: localUri,
        })
        return {
          data: { localUri },
          asset,
        }
      }

      const data = await asset.downloadAsync()
      return {
        data,
        asset: data,
      }
    })().then(({ data, asset }) => {
      texture.image = {
        data,
        width: asset.width,
        height: asset.height,
      }
      texture.flipY = true
      texture.unpackAlignment = 1
      texture.needsUpdate = true

      onLoad?.(texture)
    })

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
