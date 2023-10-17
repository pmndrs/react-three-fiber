import { Image } from 'react-native'
import { Asset } from 'expo-asset'
import { cacheDirectory, copyAsync } from 'expo-file-system'
import * as THREE from 'three'

async function getAsset(input: string | number): Promise<string> {
  const asset = typeof input === 'string' ? Asset.fromURI(input) : Asset.fromModule(input)

  await asset.downloadAsync()
  let localUri = asset.localUri || asset.uri

  // Unpack assets in Android Release Mode
  if (!localUri.includes('://')) {
    localUri = `${cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`
    await copyAsync({ from: localUri, to: localUri })
  }

  return localUri
}

export function _polyfills() {
  // Don't pre-process urls, let expo-asset generate an absolute URL
  const extractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(THREE.LoaderUtils)
  THREE.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? extractUrlBase(url) : './')

  // There's no Image in native, so create a data texture instead
  THREE.TextureLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    if (this.path) url = this.path + url

    const texture = new THREE.Texture()

    getAsset(url)
      .then(async (localUri) => {
        const { width, height } = await new Promise<{ width: number; height: number }>((res, rej) =>
          Image.getSize(localUri, (width, height) => res({ width, height }), rej),
        )

        texture.image = {
          data: { localUri },
          width,
          height,
        }
        texture.flipY = true
        texture.unpackAlignment = 1
        texture.needsUpdate = true

        // Force non-DOM upload for EXGL fast paths
        // @ts-ignore
        texture.isDataTexture = true

        onLoad?.(texture)
      })
      .catch(onError)

    return texture
  }

  // Fetches assets via XMLHttpRequest
  THREE.FileLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    if (this.path) url = this.path + url

    const request = new XMLHttpRequest()

    getAsset(url)
      .then((localUri) => {
        request.open('GET', localUri, true)

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
}
