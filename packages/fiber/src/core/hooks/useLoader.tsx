import { suspend, preload, clear } from 'suspend-react'
import { buildGraph, is, isObject3D } from '../utils'

//* Type Imports ==============================
import type { ConstructorRepresentation, LoaderLike, InputLike, LoaderResult, Extensions } from '#types'

const memoizedLoaders = new WeakMap<ConstructorRepresentation<LoaderLike>, LoaderLike>()

const isConstructor = (value: unknown): value is ConstructorRepresentation<LoaderLike> =>
  typeof value === 'function' && value?.prototype?.constructor === value

//* Loader Retrieval Utility ==============================

/**
 * Gets or creates a memoized loader instance from a loader constructor or returns the loader if it's already an instance.
 * This allows external code to access loader methods like abort().
 */
function getLoader<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  Proto: L,
): L extends ConstructorRepresentation<infer T> ? T : L {
  // Construct and cache loader if constructor was passed
  if (isConstructor(Proto)) {
    let loader = memoizedLoaders.get(Proto)
    if (!loader) {
      loader = new Proto()
      memoizedLoaders.set(Proto, loader)
    }
    return loader as L extends ConstructorRepresentation<infer T> ? T : L
  }

  // Return the loader instance as-is
  return Proto as L extends ConstructorRepresentation<infer T> ? T : L
}

function loadingFn<L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
) {
  return function (Proto: L, input: string) {
    const loader = getLoader(Proto)

    // Apply loader extensions
    if (extensions) extensions(loader as any)

    // Prefer loadAsync if available (supports abort, cleaner Promise API)
    if ('loadAsync' in loader && typeof loader.loadAsync === 'function') {
      return loader.loadAsync(input, onProgress).then((data: any) => {
        if (isObject3D(data?.scene)) Object.assign(data, buildGraph(data.scene))
        return data
      }) as Promise<LoaderResult<L>>
    }

    // Fall back to callback-based load
    return new Promise<LoaderResult<L>>((res, reject) =>
      loader.load(
        input,
        (data: any) => {
          if (isObject3D(data?.scene)) Object.assign(data, buildGraph(data.scene))
          res(data)
        },
        onProgress,
        (error: unknown) => reject(new Error(`Could not load ${input}: ${(error as ErrorEvent)?.message}`)),
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

  // Create the loading function once to ensure consistent function reference across suspend calls
  const fn = loadingFn(extensions, onProgress)

  // Call suspend individually for each key to match preload cache structure
  const results = keys.map((key) => suspend(fn, [loader, key], { equal: is.equ }))

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
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): void {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  // Preload each key individually so cache keys match useLoader calls
  keys.forEach((key) => preload(loadingFn(extensions, onProgress), [loader, key]))
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: I,
): void {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  // Clear each key individually to match how they were cached
  keys.forEach((key) => clear([loader, key]))
}

/**
 * Gets the memoized loader instance, allowing access to loader methods like abort().
 * For constructor-based loaders, returns the cached instance. For instance loaders, returns the instance itself.
 */
useLoader.loader = getLoader
