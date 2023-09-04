import * as THREE from 'three'
import { Image } from 'react-native'
import { Asset } from 'expo-asset'
import * as fs from 'expo-file-system'
import { fromByteArray, toByteArray } from 'base64-js'

export function polyfills() {
  // Implement Blob from ArrayBuffer if not implemented
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

  // Implement FileReader.readAsArrayBuffer if not implemented
  try {
    new FileReader().readAsArrayBuffer(new Blob([new ArrayBuffer(4) as any]))
  } catch (_) {
    FileReader.prototype.readAsArrayBuffer = function (blob) {
      const onloadend = this.onloadend
      this.onloadend = () => {
        this._result = toByteArray(this._result.split(',')[1]).buffer
        onloadend?.()
      }

      return this.readAsDataURL(blob)
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
  THREE.LoaderUtils.extractUrlBase = (url: unknown) => (typeof url === 'string' ? extractUrlBase(url) : './')

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
  const originalFileLoad = THREE.FileLoader.prototype.load.bind(THREE.FileLoader.prototype)
  THREE.FileLoader.prototype.load = async function load(url, onLoad, onProgress, onError) {
    const path = this.path
    if (this.path) url = this.path + url

    const asset = await getAsset(url)
    url = asset.localUri || asset.uri

    // Make FS paths web-safe
    if (url.startsWith('file://')) {
      const data = await fs.readAsStringAsync(url, { encoding: fs.EncodingType.Base64 })
      url = `data:application/octet-stream;base64,${data}`
    }

    this.path = ''
    originalFileLoad(url, onLoad, onProgress, onError)
    this.path = path
  }
}
