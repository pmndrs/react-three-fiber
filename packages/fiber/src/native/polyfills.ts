import * as THREE from 'three'
import { Image, NativeModules, Platform } from 'react-native'
import { Asset } from 'expo-asset'
import * as fs from 'expo-file-system'
import { fromByteArray } from 'base64-js'
import { Buffer } from 'buffer'

export function polyfills() {
  // http://stackoverflow.com/questions/105034
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  // Patch Blob for ArrayBuffer if unsupported
  // https://github.com/facebook/react-native/pull/39276
  if (Platform.OS !== 'web') {
    try {
      const blob = new Blob([new ArrayBuffer(4) as any])
      const url = URL.createObjectURL(blob)
      URL.revokeObjectURL(url)
    } catch (_) {
      const BlobManager = require('react-native/Libraries/Blob/BlobManager.js')

      let BLOB_URL_PREFIX: string | null = null

      const { BlobModule } = NativeModules

      if (BlobModule && typeof BlobModule.BLOB_URI_SCHEME === 'string') {
        BLOB_URL_PREFIX = BlobModule.BLOB_URI_SCHEME + ':'
        if (typeof BlobModule.BLOB_URI_HOST === 'string') {
          BLOB_URL_PREFIX += `//${BlobModule.BLOB_URI_HOST}/`
        }
      }

      URL.createObjectURL = function createObjectURL(blob: Blob): string {
        const data = (blob as any).data

        if (BLOB_URL_PREFIX === null) {
          // https://github.com/pmndrs/react-three-fiber/issues/3058
          // throw new Error('Cannot create URL for blob!')
          return `data:${blob.type};base64,${data._base64}`
        }

        return `${BLOB_URL_PREFIX}${data.blobId}?offset=${data.offset}&size=${blob.size}`
      }

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

        const blob = BlobManager.createFromOptions({
          blobId,
          offset: 0,
          size,
          type: options ? options.type : '',
          lastModified: options ? options.lastModified : Date.now(),
        })

        if (BLOB_URL_PREFIX === null) {
          let data = ''
          for (const item of items) {
            data += item.data._base64 ?? item.data
          }
          blob.data._base64 = data
        }

        return blob
      }
    }
  }

  async function getAsset(input: string | number): Promise<string> {
    if (typeof input === 'string') {
      // Don't process storage
      if (input.startsWith('file:')) return input

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

        input = `data:${blob.type};base64,${data}`
      }

      // Create safe URI for JSI
      if (input.startsWith('data:')) {
        const [header, data] = input.split(';base64,')
        const [, type] = header.split('/')

        const uri = fs.cacheDirectory + uuidv4() + `.${type}`
        await fs.writeAsStringAsync(uri, data, { encoding: fs.EncodingType.Base64 })

        return uri
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
  THREE.TextureLoader.prototype.load = function load(this: THREE.TextureLoader, url, onLoad, onProgress, onError) {
    if (this.path && typeof url === 'string') url = this.path + url

    this.manager.itemStart(url)

    const texture = new THREE.Texture()

    getAsset(url)
      .then(async (uri) => {
        // https://github.com/expo/expo-three/pull/266
        const { width, height } = await new Promise<{ width: number; height: number }>((res, rej) =>
          Image.getSize(uri, (width, height) => res({ width, height }), rej),
        )

        texture.image = {
          // Special case for EXGLImageUtils::loadImage
          data: { localUri: uri },
          width,
          height,
        }
        texture.flipY = true // Since expo-gl@12.4.0
        texture.needsUpdate = true

        // Force non-DOM upload for EXGL texImage2D
        // @ts-ignore
        texture.isDataTexture = true

        onLoad?.(texture)
      })
      .catch((error) => {
        onError?.(error)
        this.manager.itemError(url)
      })
      .finally(() => {
        this.manager.itemEnd(url)
      })

    return texture
  }

  // Fetches assets via FS
  THREE.FileLoader.prototype.load = function load(this: THREE.FileLoader, url, onLoad, onProgress, onError) {
    if (this.path && typeof url === 'string') url = this.path + url

    this.manager.itemStart(url)

    getAsset(url)
      .then(async (uri) => {
        const base64 = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 })
        const data = Buffer.from(base64, 'base64')
        onLoad?.(data.buffer)
      })
      .catch((error) => {
        onError?.(error)
        this.manager.itemError(url)
      })
      .finally(() => {
        this.manager.itemEnd(url)
      })
  }
}
