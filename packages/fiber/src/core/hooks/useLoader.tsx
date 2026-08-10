import { useRef } from 'react'
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
  cacheKey?: InputLike,
) {
  // What to load
  const inputs = (Array.isArray(input) ? input : [input]) as string[]
  // What to cache under. Defaults to the input URLs, but can be overridden so assets fetched
  // from URLs that change per request (signed/auth URLs) still reuse the same cache entry.
  const cacheKeys = (Array.isArray(cacheKey ?? input) ? (cacheKey ?? input) : [cacheKey ?? input]) as string[]

  // Create the loading function once to ensure consistent function reference across suspend calls
  const fn = loadingFn(extensions, onProgress)

  // Call suspend individually for each key to match preload cache structure.
  // Suspend caches on `key`, but the closure always loads the matching `input`.
  const results = cacheKeys.map((key, index) =>
    suspend(() => fn(loader, inputs[index]), [loader, key], { equal: is.equ }),
  )

  // Keep the array's identity stable while its contents are unchanged.
  //
  // `.map()` builds a fresh array every render, and callers routinely use the result as an effect
  // dependency. Any such effect that also writes to the store becomes an infinite render loop:
  // effect -> setState -> re-render -> new array identity -> effect. That is #3849, which
  // useTexture hit through its registry effect.
  //
  // Shallow-compared rather than keyed on the cache keys, because `useLoader.clear()` can hand
  // back new objects for the *same* keys and that invalidation still has to propagate. Comparing
  // the resolved values means a genuine change always yields a new identity, and an incidental
  // re-render never does.
  //
  // The render-phase ref write is idempotent — given equal contents it always settles on the same
  // array — so it is safe under StrictMode's double render.
  const stableRef = useRef<unknown[] | null>(null)
  const previous = stableRef.current
  const stable =
    previous !== null && previous.length === results.length && previous.every((value, i) => value === results[i])
      ? previous
      : results
  stableRef.current = stable

  // Return the object(s)
  return (Array.isArray(input) ? stable : stable[0]) as I extends any[] ? LoaderResult<L>[] : LoaderResult<L>
}

/**
 * Preloads an asset into cache as a side-effect.
 */
useLoader.preload = function <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: I,
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
  cacheKey?: InputLike,
): void {
  const inputs = (Array.isArray(input) ? input : [input]) as string[]
  const cacheKeys = (Array.isArray(cacheKey ?? input) ? (cacheKey ?? input) : [cacheKey ?? input]) as string[]
  // Preload each key individually so cache keys match useLoader calls
  cacheKeys.forEach((key, index) =>
    preload(() => loadingFn(extensions, onProgress)(loader, inputs[index]), [loader, key]),
  )
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <I extends InputLike, L extends LoaderLike | ConstructorRepresentation<LoaderLike>>(
  loader: L,
  input: I,
  cacheKey?: InputLike,
): void {
  const cacheKeys = (Array.isArray(cacheKey ?? input) ? (cacheKey ?? input) : [cacheKey ?? input]) as string[]
  // Clear each key individually to match how they were cached (custom cache key when provided)
  cacheKeys.forEach((key) => clear([loader, key]))
}

/**
 * Gets the memoized loader instance, allowing access to loader methods like abort().
 * For constructor-based loaders, returns the cached instance. For instance loaders, returns the instance itself.
 */
useLoader.loader = getLoader
