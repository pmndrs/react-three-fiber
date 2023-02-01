import * as THREE from 'three'
import * as React from 'react'
import { StateSelector, EqualityChecker } from 'zustand'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { suspend, preload, clear } from 'suspend-react'
import { context, RootState, RenderCallback } from './store'
import { buildGraph, ObjectMap, is, useMutableCallback, useIsomorphicLayoutEffect } from './utils'
import { LocalState, Instance } from './renderer'

export interface Loader<T> extends THREE.Loader {
  load(
    url: string,
    onLoad?: (result: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void,
  ): unknown
  loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<T>
}

export type LoaderProto<T> = new (...args: any) => Loader<T extends unknown ? any : T>
export type LoaderReturnType<T, L extends LoaderProto<T>> = T extends unknown
  ? Awaited<ReturnType<InstanceType<L>['loadAsync']>>
  : T
// TODO: this isn't used anywhere, remove in v9
export type LoaderResult<T> = T extends any[] ? Loader<T[number]> : Loader<T>
export type Extensions<T extends { prototype: LoaderProto<any> }> = (loader: T['prototype']) => void
export type ConditionalType<Child, Parent, Truthy, Falsy> = Child extends Parent ? Truthy : Falsy
export type BranchingReturn<T, Parent, Coerced> = ConditionalType<T, Parent, Coerced, T>

/**
 * Exposes an object's {@link LocalState}.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#useInstanceHandle
 *
 * **Note**: this is an escape hatch to react-internal fields. Expect this to change significantly between versions.
 */
export function useInstanceHandle<O>(ref: React.MutableRefObject<O>): React.MutableRefObject<LocalState> {
  const instance = React.useRef<LocalState>(null!)
  useIsomorphicLayoutEffect(() => void (instance.current = (ref.current as unknown as Instance).__r3f), [ref])
  return instance
}

export function useStore() {
  const store = React.useContext(context)
  if (!store) throw new Error('R3F: Hooks can only be used within the Canvas component!')
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

/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */
export function useGraph(object: THREE.Object3D) {
  return React.useMemo(() => buildGraph(object), [object])
}

function loadingFn<L extends LoaderProto<any>>(
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
) {
  return function (Proto: L, ...input: string[]) {
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
              (error) => reject(new Error(`Could not load ${input}: ${error.message})`)),
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
export function useLoader<T, U extends string | string[], L extends LoaderProto<T>, R = LoaderReturnType<T, L>>(
  Proto: L,
  input: U,
  extensions?: Extensions<L>,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): U extends any[] ? BranchingReturn<R, GLTF, GLTF & ObjectMap>[] : BranchingReturn<R, GLTF, GLTF & ObjectMap> {
  // Use suspense to load async assets
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  const results = suspend(loadingFn<L>(extensions, onProgress), [Proto, ...keys], { equal: is.equ })
  // Return the object/s
  return (Array.isArray(input) ? results : results[0]) as U extends any[]
    ? BranchingReturn<R, GLTF, GLTF & ObjectMap>[]
    : BranchingReturn<R, GLTF, GLTF & ObjectMap>
}

/**
 * Preloads an asset into cache as a side-effect.
 */
useLoader.preload = function <T, U extends string | string[], L extends LoaderProto<T>>(
  Proto: L,
  input: U,
  extensions?: Extensions<L>,
) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return preload(loadingFn<L>(extensions), [Proto, ...keys])
}

/**
 * Removes a loaded asset from cache.
 */
useLoader.clear = function <T, U extends string | string[], L extends LoaderProto<T>>(Proto: L, input: U) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return clear([Proto, ...keys])
}
