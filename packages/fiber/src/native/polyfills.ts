import * as THREE from 'three'
import { Image, NativeModules, Platform } from 'react-native'
import { Asset } from 'expo-asset'
import { fromByteArray } from 'base64-js'
import { Buffer } from 'buffer'

// Conditionally import expo-file-system/legacy to support Expo 54
const getFileSystem = () => {
  try {
    return require('expo-file-system/legacy')
  } catch {
    return require('expo-file-system')
  }
}
const fs = getFileSystem()

// http://stackoverflow.com/questions/105034
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function getAsset(input: string | number): Promise<string> {
  if (typeof input === 'string') {
    // Don't process storage
    if (input.startsWith('file:')) return input

    // Unpack Blobs from react-native BlobManager
    // https://github.com/facebook/react-native/issues/22681#issuecomment-523258955
    if (input.startsWith('blob:') || input.startsWith(NativeModules.BlobModule?.BLOB_URI_SCHEME)) {
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

    // Create safe URI for JSI serialization
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

export function polyfills() {
  // Patch Blob for ArrayBuffer and URL if unsupported
  // https://github.com/facebook/react-native/pull/39276
  // https://github.com/pmndrs/react-three-fiber/issues/3058
  if (Platform.OS !== 'web') {
    try {
      const blob = new Blob([new ArrayBuffer(4) as any])
      const url = URL.createObjectURL(blob)
      URL.revokeObjectURL(url)
    } catch (_) {
      const BlobManagerModule = require('react-native/Libraries/Blob/BlobManager.js')
      const BlobManager = BlobManagerModule.default ?? BlobManagerModule

      const createObjectURL = URL.createObjectURL
      URL.createObjectURL = function (blob: Blob): string {
        if ((blob as any).data._base64) {
          return `data:${blob.type};base64,${(blob as any).data._base64}`
        }

        return createObjectURL(blob)
      }

      const createFromParts = BlobManager.createFromParts
      BlobManager.createFromParts = function (parts: Array<Blob | BlobPart | string>, options: any) {
        parts = parts.map((part) => {
          if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
            part = fromByteArray(new Uint8Array(part as ArrayBuffer))
          }

          return part
        })

        const blob = createFromParts(parts, options)

        // Always enable slow but safe path for iOS (previously for Android unauth)
        // https://github.com/pmndrs/react-three-fiber/issues/3075
        // if (!NativeModules.BlobModule?.BLOB_URI_SCHEME) {
        blob.data._base64 = ''
        for (const part of parts) {
          blob.data._base64 += (part as any).data?._base64 ?? part
        }
        // }

        return blob
      }
    }
  }

  // Don't pre-process urls, let expo-asset generate an absolute URL
  const extractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(THREE.LoaderUtils)
  THREE.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? extractUrlBase(url) : './')

  // There's no Image in native, so create a data texture instead
  THREE.TextureLoader.prototype.load = function load(this: THREE.TextureLoader, url, onLoad, onProgress, onError) {
    if (this.path && typeof url === 'string') url = this.path + url

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
        // @ts-expect-error
        texture.isDataTexture = true

        onLoad?.(texture)
      })
      .catch(onError)

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
