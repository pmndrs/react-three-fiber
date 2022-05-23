import * as THREE from 'three'
import * as React from 'react'
import { StateSelector, EqualityChecker } from 'zustand'
import { suspend, preload, clear } from 'suspend-react'
import { context, RootState, RenderCallback } from './store'
import { buildGraph, ObjectMap, is, useMutableCallback, useIsomorphicLayoutEffect } from './utils'
import { UpdateCallback } from './stages'

export interface Loader<T> extends THREE.Loader {
  load(
    url: string,
    onLoad?: (result: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void,
  ): unknown
}

export type Extensions = (loader: THREE.Loader) => void
export type LoaderResult<T> = T extends any[] ? Loader<T[number]> : Loader<T>
export type ConditionalType<Child, Parent, Truthy, Falsy> = Child extends Parent ? Truthy : Falsy
export type BranchingReturn<T, Parent, Coerced> = ConditionalType<T, Parent, Coerced, T>

export function useStore() {
  const store = React.useContext(context)
  if (!store) throw `R3F hooks can only be used within the Canvas component!`
  return store
}

/**
 * Accesses R3F's internal state, containing renderer, canvas, scene, etc.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usethree
 */
export function useThree<T = RootState>(
  selector: StateSelector<RootState, T> = (state) => state as unknown as T,
  equalityFn?: EqualityChecker<T>,
) {
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

export function useUpdate(callback: UpdateCallback, stage: string = 'update'): null {
  const stagesMap = useStore().getState().internal.stagesMap
  const ref = useMutableCallback(callback)
  useIsomorphicLayoutEffect(() => {
    if (stagesMap[stage]) {
      stagesMap[stage].add(ref)
    } else {
      throw `A '${stage}' stage does not exist.`
    }
  }, [stage])
  return null
}

/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */
export function useGraph(object: THREE.Object3D) {
  return React.useMemo(() => buildGraph(object), [object])
}

function loadingFn<T>(extensions?: Extensions, onProgress?: (event: ProgressEvent<EventTarget>) => void) {
  return function (Proto: new () => LoaderResult<T>, ...input: string[]) {
    // Construct new loader and run extensions
    const loader = new Proto()
    if (extensions) extensions(loader)
    // Go through the urls and load them
    return Promise.all(
      input.map(
        (input) =>
          new Promise((res, reject) =>
            loader.load(
              input,
              (data: any) => {
                if (data.scene) Object.assign(data, buildGraph(data.scene))
                res(data)
              },
              onProgress,
              (error) => reject(`Could not load ${input}: ${error.message}`),
            ),
          ),
      ),
    )
  }
}

interface GLTFLike {
  scene: THREE.Object3D
}

/**
 * Synchronously loads and caches assets with a three loader.
 *
 * Note: this hook's caller must be wrapped with `React.Suspense`
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#useloader
 */
export function useLoader<T, U extends string | string[]>(
  Proto: new () => LoaderResult<T>,
  input: U,
  extensions?: Extensions,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): U extends any[]
  ? BranchingReturn<T, GLTFLike, GLTFLike & ObjectMap>[]
  : BranchingReturn<T, GLTFLike, GLTFLike & ObjectMap> {
  // Use suspense to load async assets
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  const results = suspend(loadingFn<T>(extensions, onProgress), [Proto, ...keys], { equal: is.equ })
  // Return the object/s
  return (Array.isArray(input) ? results : results[0]) as U extends any[]
    ? BranchingReturn<T, GLTFLike, GLTFLike & ObjectMap>[]
    : BranchingReturn<T, GLTFLike, GLTFLike & ObjectMap>
}

/**
 * Preloads an asset into cache as a side-effect.
 */
useLoader.preload = function <T, U extends string | string[]>(
  Proto: new () => LoaderResult<T>,
  input: U,
  extensions?: Extensions,
) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return preload(loadingFn<T>(extensions), [Proto, ...keys])
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <T, U extends string | string[]>(Proto: new () => LoaderResult<T>, input: U) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return clear([Proto, ...keys])
}
