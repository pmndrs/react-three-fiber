import * as THREE from 'three'
import * as React from 'react'
import { suspend, preload, clear } from 'suspend-react'
import { context, RootState, RenderCallback, RootStore } from './store'
import { buildGraph, ObjectMap, is, useMutableCallback, useIsomorphicLayoutEffect, isObject3D } from './utils'
import type { Instance } from './reconciler'

/**
 * Exposes an object's {@link Instance}.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#useinstancehandle
 *
 * **Note**: this is an escape hatch to react-internal fields. Expect this to change significantly between versions.
 */
export function useInstanceHandle<T>(ref: React.RefObject<T>): React.RefObject<Instance<T>> {
  const instance = React.useRef<Instance>(null!)
  React.useImperativeHandle(instance, () => (ref.current as unknown as Instance<T>['object']).__r3f!, [ref])
  return instance
}

/**
 * Returns the R3F Canvas' Zustand store. Useful for [transient updates](https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes).
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usestore
 */
export function useStore(): RootStore {
  const store = React.useContext(context)
  if (!store) throw new Error('R3F: Hooks can only be used within the Canvas component!')
  return store
}

/**
 * Accesses R3F's internal state, containing renderer, canvas, scene, etc.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usethree
 */
export function useThree<T = RootState>(
  selector: (state: RootState) => T = (state) => state as unknown as T,
  equalityFn?: <T>(state: T, newState: T) => boolean,
): T {
  return useStore()(selector, equalityFn)
}

/**
 * Executes a callback before render in a shared frame loop.
 * Can order effects with render priority or manually render with a positive priority.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useframe
 */
export function useFrame(callback: RenderCallback, renderPriority: number = 0): null {
  const store = useStore()
  const subscribe = store.getState().internal.subscribe
  // Memoize ref
  const ref = useMutableCallback(callback)
  // Subscribe on mount, unsubscribe on unmount
  useIsomorphicLayoutEffect(() => subscribe(ref, renderPriority, store), [renderPriority, subscribe, store])
  return null
}

/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */
export function useGraph(object: THREE.Object3D): ObjectMap {
  return React.useMemo(() => buildGraph(object), [object])
}

export interface Loader<T> extends THREE.Loader {
  load(
    url: string | string[] | string[][],
    onLoad?: (result: T, ...args: any[]) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: unknown) => void,
  ): unknown
}

export type LoaderProto<T> = new (...args: any[]) => Loader<T>
export type LoaderResult<T> = T extends { scene: THREE.Object3D } ? T & ObjectMap : T
export type Extensions<T> = (loader: Loader<T>) => void

const memoizedLoaders = new WeakMap<LoaderProto<any>, Loader<any>>()
const memoizedResults = new WeakMap<Loader<unknown>, Map<string, Promise<unknown>>>()

const isConstructor = <T,>(value: unknown): value is LoaderProto<T> =>
  typeof value === 'function' && value?.prototype?.constructor === value

function loadingFn<T>(extensions?: Extensions<T>, onProgress?: (event: ProgressEvent) => void) {
  return async function (Proto: Loader<T> | LoaderProto<T>, ...urls: string[]) {
    // Construct and cache loader if constructor was passed
    let loader!: Loader<T>
    if (isConstructor(Proto)) {
      loader = memoizedLoaders.get(Proto)!
      if (!loader) {
        loader = new Proto()
        memoizedLoaders.set(Proto, loader)
      }
    } else {
      loader = Proto
    }

    // Prime per-loader cache
    let results: Map<string, Promise<unknown>> = memoizedResults.get(loader)!
    if (!results) {
      results = new Map()
      memoizedResults.set(loader, results)
    }

    // Apply loader extensions
    if (extensions) extensions(loader)

    // Go through the urls and load them
    return Promise.all(
      urls.map((url) => {
        // Load url and cache the result on first try
        if (!results.has(url)) {
          try {
            results.set(
              url,
              loader
                .loadAsync(url, onProgress)
                .then((data) => (isObject3D(data?.scene) ? Object.assign(data, buildGraph(data.scene)) : data)),
            )
          } catch (error) {
            // TODO: merge errors for multiple urls
            throw new Error(`Could not load ${url}: ${(error as ErrorEvent)?.message}`)
          }
        }

        // Return cached pending or completed result
        return results.get(url)
      }),
    )
  }
}

/**
 * Synchronously loads and caches assets with a three loader.
 *
 * Note: this hook's caller must be wrapped with `React.Suspense`
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useloader
 */
export function useLoader<T, U extends string | string[] | string[][]>(
  loader: Loader<T> | LoaderProto<T>,
  input: U,
  extensions?: Extensions<T>,
  onProgress?: (event: ProgressEvent) => void,
) {
  // Use suspense to load async assets
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  const results = suspend(loadingFn(extensions, onProgress), [loader, ...keys], { equal: is.equ })
  // Return the object(s)
  return (Array.isArray(input) ? results : results[0]) as unknown as U extends any[]
    ? LoaderResult<T>[]
    : LoaderResult<T>
}

/**
 * Preloads an asset into cache as a side-effect.
 */
useLoader.preload = function <T, U extends string | string[] | string[][]>(
  loader: Loader<T> | LoaderProto<T>,
  input: U,
  extensions?: Extensions<T>,
): void {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return preload(loadingFn(extensions), [loader, ...keys])
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <T, U extends string | string[] | string[][]>(
  loader: Loader<T> | LoaderProto<T>,
  input: U,
): void {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return clear([loader, ...keys])
}
