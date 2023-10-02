import * as THREE from 'three'
import { Image, Platform, NativeModules } from 'react-native'
import { Asset } from 'expo-asset'
import * as fs from 'expo-file-system'
import { fromByteArray } from 'base64-js'

export function polyfills() {
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Patch Blob for ArrayBuffer if unsupported
  if (Platform.OS !== 'web') {
    try {
      new Blob([new ArrayBuffer(4) as any])
    } catch (_) {
      const BlobManager = require('react-native/Libraries/Blob/BlobManager.js')

      BlobManager.createFromParts = function createFromParts(parts: Array<Blob | BlobPart | string>, options: any) {
        const blobId = uuidv4()

        const items = parts.map((part) => {
          if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
            const data = fromByteArray(new Uint8Array(part as ArrayBuffer))
            return {
              data,
              type: 'string',
            }
          } else if (part instanceof Blob) {
            return {
              data: (part as any).data,
              type: 'blob',
            }
          } else {
            return {
              data: String(part),
              type: 'string',
            }
          }
        })
        const size = items.reduce((acc, curr) => {
          if (curr.type === 'string') {
            return acc + global.unescape(encodeURI(curr.data)).length
          } else {
            return acc + curr.data.size
          }
        }, 0)

        NativeModules.BlobModule.createFromParts(items, blobId)

        return BlobManager.createFromOptions({
          blobId,
          offset: 0,
          size,
          type: options ? options.type : '',
          lastModified: options ? options.lastModified : Date.now(),
        })
      }
    }
  }

  async function getAsset(input: string | number): Promise<string> {
    if (typeof input === 'string') {
      // Don't process storage or data uris
      if (input.startsWith('file:') || input.startsWith('data:')) return input

      // Unpack Blobs from react-native BlobManager
      if (input.startsWith('blob:')) {
        const blob = await new Promise<Blob>((res, rej) => {
          const xhr = new XMLHttpRequest()
          xhr.open('GET', input as string)
          xhr.responseType = 'blob'
          xhr.onload = () => res(xhr.response)
          xhr.onerror = rej
          xhr.send()
        })

        const data = await new Promise<string>((res, rej) => {
          const reader = new FileReader()
          reader.onload = () => res(reader.result as string)
          reader.onerror = rej
          reader.readAsText(blob)
        })

        return `data:${blob.type};base64,${data}`
      }
    }

    // Download bundler module or external URL
    const asset = await Asset.fromModule(input).downloadAsync()
    let uri = asset.localUri || asset.uri

    // Unpack assets in Android Release Mode
    if (!uri.includes(':')) {
      const file = `${fs.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`
      await fs.copyAsync({ from: uri, to: file })
      uri = file
    }

    return uri
  }

  // Don't pre-process urls, let expo-asset generate an absolute URL
  const extractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(THREE.LoaderUtils)
  THREE.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? extractUrlBase(url) : './')

  // There's no Image in native, so create a data texture instead
  THREE.TextureLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    if (this.path) url = this.path + url

    const texture = new THREE.Texture()

    getAsset(url)
      .then(async (uri) => {
        // Create safe URI for JSI
        if (uri.startsWith('data:')) {
          const [header, data] = uri.split(',')
          const [, type] = header.split('/')

          uri = fs.cacheDirectory + uuidv4() + `.${type}`
          await fs.writeAsStringAsync(uri, data, { encoding: fs.EncodingType.Base64 })
        }

        const { width, height } = await new Promise<{ width: number; height: number }>((res, rej) =>
          Image.getSize(uri, (width, height) => res({ width, height }), rej),
        )

        texture.image = {
          data: { localUri: uri },
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
      .then(async (uri) => {
        // Make FS paths web-safe
        if (uri.startsWith('file://')) {
          const data = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 })
          uri = `data:application/octet-stream;base64,${data}`
        }

        request.open('GET', uri, true)

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
