import * as THREE from 'three'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { Asset } from 'expo-asset'
import { readAsStringAsync } from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { useAsset } from 'use-asset'
import { buildGraph, ObjectMap } from '../core/utils'
import { Extensions, LoaderResult, BranchingReturn, useStore, useThree, useFrame, useGraph } from '../core/hooks'

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

/**
 * Downloads from a local URI and decodes into an ArrayBuffer.
 */
const toBuffer = async (localUri: string) => readAsStringAsync(localUri, { encoding: 'base64' }).then(decode)

function loadingFn<T>(extensions?: Extensions, onProgress?: (event: ProgressEvent<EventTarget>) => void) {
  return function (Proto: new () => LoaderResult<T>, ...input: string[]) {
    // Construct new loader and run extensions
    const loader = new Proto()
    if (extensions) extensions(loader)
    // Go through the urls and load them
    return Promise.all(
      input.map(
        (entry) =>
          new Promise(async (res, reject) => {
            // Construct URL
            const url = typeof entry === 'string' ? loader.path + entry : entry

            // There's no Image in native, so we create & pass a data texture instead
            if (loader instanceof THREE.TextureLoader) {
              const asset = await getAsset(url).downloadAsync()

              const texture = new THREE.Texture()
              ;(texture as any).isDataTexture = true
              texture.image = { data: asset, width: asset.width, height: asset.height }
              texture.needsUpdate = true

              return res(texture)
            }

            // Do similar for CubeTextures
            if (loader instanceof THREE.CubeTextureLoader) {
              const texture = new THREE.CubeTexture()
              ;(texture as any).isDataTexture = true
              texture.images = await Promise.all(
                (url as unknown as string[]).map(async (src) => {
                  const asset = await getAsset(src).downloadAsync()
                  return { data: asset, width: asset.width, height: asset.height }
                }),
              )
              texture.needsUpdate = true

              return res(texture)
            }

            // If asset is external and not an Image, load it
            if (url.startsWith?.('http') && Proto.prototype.hasOwnProperty('load')) {
              return loader.load(
                entry as any,
                (data: any) => {
                  if (data.scene) Object.assign(data, buildGraph(data.scene))
                  res(data)
                },
                onProgress,
                (error) => reject(`Could not load ${url}: ${error.message}`),
              )
            }

            // Otherwise, create a localUri and a file buffer
            const { localUri } = await getAsset(url).downloadAsync()
            const arrayBuffer = await toBuffer(localUri as string)

            // Parse it
            const parsed = (loader as any).parse?.(
              arrayBuffer,
              undefined,
              (data: any) => {
                if (data.scene) Object.assign(data, buildGraph(data.scene))
                res(data)
              },
              (error: ErrorEvent) => reject(`Could not load ${url}: ${error.message}`),
            )

            // Respect synchronous parsers which don't have callbacks
            if (parsed) return res(parsed)
          }),
      ),
    )
  }
}

function useLoader<T, U extends string | string[]>(
  Proto: new () => LoaderResult<T>,
  input: U,
  extensions?: Extensions,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): U extends any[] ? BranchingReturn<T, GLTF, GLTF & ObjectMap>[] : BranchingReturn<T, GLTF, GLTF & ObjectMap> {
  // Use suspense to load async assets
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  const results = useAsset(loadingFn<T>(extensions, onProgress), Proto, ...keys)
  // Return the object/s
  return (Array.isArray(input) ? results : results[0]) as U extends any[]
    ? BranchingReturn<T, GLTF, GLTF & ObjectMap>[]
    : BranchingReturn<T, GLTF, GLTF & ObjectMap>
}

useLoader.preload = function <T, U extends string | string[]>(
  Proto: new () => LoaderResult<T>,
  input: U,
  extensions?: Extensions,
) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return useAsset.preload(loadingFn<T>(extensions), Proto, ...keys)
}

useLoader.clear = function <T, U extends string | string[]>(Proto: new () => LoaderResult<T>, input: U) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return useAsset.clear(Proto, ...keys)
}

export { useStore, useThree, useFrame, useGraph, useLoader }
