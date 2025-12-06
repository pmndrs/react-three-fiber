import * as THREE from 'three'
import { suspend, preload, clear } from 'suspend-react'
import type { ConstructorRepresentation } from '../reconciler'
import { buildGraph, ObjectMap, is, isObject3D } from '../utils'

type InputLike = string | string[] | string[][] | Readonly<string | string[] | string[][]>
// Define a loader-like interface that matches THREE.Loader's load signature
// This works for both generic and non-generic THREE.Loader instances
interface LoaderLike {
  load(
    url: InputLike,
    onLoad?: (result: any) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (error: unknown) => void,
  ): any
}
type GLTFLike = { scene: THREE.Object3D }

type LoaderInstance<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> =
  T extends ConstructorRepresentation<LoaderLike> ? InstanceType<T> : T

// Infer result type from the load method's callback parameter
type InferLoadResult<T> = T extends {
  load(url: any, onLoad?: (result: infer R) => void, ...args: any[]): any
}
  ? R
  : T extends ConstructorRepresentation<any>
  ? InstanceType<T> extends {
      load(url: any, onLoad?: (result: infer R) => void, ...args: any[]): any
    }
    ? R
    : any
  : any

export type LoaderResult<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = InferLoadResult<
  LoaderInstance<T>
> extends infer R
  ? R extends GLTFLike
    ? R & ObjectMap
    : R
  : never

export type Extensions<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = (
  loader: LoaderInstance<T>,
) => void

const memoizedLoaders = new WeakMap<ConstructorRepresentation<LoaderLike>, LoaderLike>()

const isConstructor = (value: unknown): value is ConstructorRepresentation<LoaderLike> =>
  typeof value === 'function' && value?.prototype?.constructor === value

function loadingFn<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
) {
  return function (Proto: L, ...input: string[]) {
    let loader: LoaderLike

    // Construct and cache loader if constructor was passed
    if (isConstructor(Proto)) {
      loader = memoizedLoaders.get(Proto)!
      if (!loader) {
        loader = new Proto()
        memoizedLoaders.set(Proto, loader)
      }
    } else {
      loader = Proto as any
    }

    // Apply loader extensions
    if (extensions) extensions(loader as any)

    // Go through the urls and load them
    return Promise.all(
      input.map(
        (input) =>
          new Promise<LoaderResult<L>>((res, reject) =>
            loader.load(
              input,
              (data: any) => {
                if (isObject3D(data?.scene)) Object.assign(data, buildGraph(data.scene))
                res(data)
              },
              onProgress,
              (error: unknown) => reject(new Error(`Could not load ${input}: ${(error as ErrorEvent)?.message}`)),
            ),
          ),
      ),
    )
  }
}

/**
 * Synchronously loads and caches assets with a three loader.
 *
 * Note: this hook's caller must be wrapped with `React.Suspense`
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useloader
 */
export function useLoader<I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: I,
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
) {
  // Use suspense to load async assets
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  const results = suspend(loadingFn(extensions, onProgress), [loader, ...keys], { equal: is.equ })
  // Return the object(s)
  return (Array.isArray(input) ? results : results[0]) as I extends any[] ? LoaderResult<L>[] : LoaderResult<L>
}

/**
 * Preloads an asset into cache as a side-effect.
 */
useLoader.preload = function <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: I,
  extensions?: Extensions<L>,
): void {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return preload(loadingFn(extensions), [loader, ...keys])
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: I,
): void {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return clear([loader, ...keys])
}
