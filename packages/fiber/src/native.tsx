import * as THREE from 'three'
import { Asset } from 'expo-asset'

/**
 * Generates an asset based on input type.
 */
const getAsset = (input: Asset | string | number) => {
  if (input instanceof Asset) return input

  switch (typeof input) {
    case 'string':
      return Asset.fromURI(input)
    case 'number':
      return Asset.fromModule(input)
    default:
      throw 'Invalid asset! Must be a URI or module.'
  }
}

// Don't pre-process urls, let expo-asset generate an absolute URL
const extractUrlBase = THREE.LoaderUtils.extractUrlBase.bind(THREE.LoaderUtils)
THREE.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? extractUrlBase(url) : './')

// There's no Image in native, so create a data texture instead
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
      texture.needsUpdate = true

      onLoad?.(texture)
    })
    .catch(onError)

  return texture
}

// Fetches assets via XMLHttpRequest
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

export * from './three-types'
import * as ReactThreeFiber from './three-types'
export { ReactThreeFiber }
export type { BaseInstance, LocalState } from './core/renderer'
export type {
  Intersection,
  Subscription,
  Dpr,
  Size,
  Viewport,
  RenderCallback,
  Performance,
  RootState,
} from './core/store'
export type { ThreeEvent, Events, EventManager, ComputeFunction } from './core/events'
export type { ObjectMap, Camera } from './core/utils'
export * from './native/Canvas'
export { createTouchEvents as events } from './native/events'
export * from './core'
