import * as THREE from 'three'
import { Image } from 'react-native'
import { Asset } from 'expo-asset'
import * as fs from 'expo-file-system'
import { fromByteArray } from 'base64-js'

export function polyfills() {
  // Patch Blob for ArrayBuffer if unsupported
  try {
    new Blob([new ArrayBuffer(4) as any])
  } catch (_) {
    global.Blob = class extends Blob {
      constructor(parts?: any[], options?: any) {
        super(
          parts?.map((part) => {
            if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
              part = fromByteArray(new Uint8Array(part as ArrayBuffer))
            }

            return part
          }),
          options,
        )
      }
    }
  }

  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c == 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  async function getAsset(input: string | number): Promise<Asset> {
    if (typeof input === 'string') {
      // Point to storage if preceded with fs path
      if (input.startsWith('file:')) return { localUri: input } as Asset

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
        const [header, data] = input.split(',')
        const [, type] = header.split('/')

        const localUri = fs.cacheDirectory + uuidv4() + `.${type}`
        await fs.writeAsStringAsync(localUri, data, { encoding: fs.EncodingType.Base64 })

        return { localUri } as Asset
      }
    }

    // Download bundler module or external URL
    const asset = Asset.fromModule(input)

    // Unpack assets in Android Release Mode
    if (!asset.uri.includes(':')) {
      const localUri = `${fs.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`
      await fs.copyAsync({ from: asset.uri, to: localUri })
      return { localUri } as Asset
    }

    // Otherwise, resolve from registry
    return asset.downloadAsync()
  }

  // Don't pre-process urls, let expo-asset generate an absolute URL
  const extractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(THREE.LoaderUtils)
  THREE.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? extractUrlBase(url) : './')

  // There's no Image in native, so create a data texture instead
  THREE.TextureLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    if (this.path) url = this.path + url

    const texture = new THREE.Texture()

    getAsset(url)
      .then(async (asset: Asset) => {
        const uri = asset.localUri || asset.uri

        if (!asset.width || !asset.height) {
          const { width, height } = await new Promise<{ width: number; height: number }>((res, rej) =>
            Image.getSize(uri, (width, height) => res({ width, height }), rej),
          )
          asset.width = width
          asset.height = height
        }

        texture.image = {
          data: { localUri: uri },
          width: asset.width,
          height: asset.height,
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
      .then(async (asset) => {
        let uri = asset.localUri || asset.uri

        // Make FS paths web-safe
        if (asset.uri.startsWith('file://')) {
          const data = await fs.readAsStringAsync(asset.uri, { encoding: fs.EncodingType.Base64 })
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
