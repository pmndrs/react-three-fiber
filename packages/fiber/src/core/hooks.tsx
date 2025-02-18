import * as THREE from 'three'
import * as React from 'react'
import { suspend, preload, clear } from 'suspend-react'
import { context, RootState, RenderCallback, RootStore } from './store'
import { buildGraph, ObjectMap, is, useMutableCallback, useIsomorphicLayoutEffect, isObject3D } from './utils'
import type { Instance, ConstructorRepresentation } from './reconciler'

/**
 * Exposes an object's {@link Instance}.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#useInstanceHandle
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

type InputLike = string | string[] | string[][] | Readonly<string | string[] | string[][]>
type LoaderLike = THREE.Loader<any, InputLike>
type GLTFLike = { scene: THREE.Object3D }

type LoaderInstance<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> =
  T extends ConstructorRepresentation<LoaderLike> ? InstanceType<T> : T

export type LoaderResult<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = Awaited<
  ReturnType<LoaderInstance<T>['loadAsync']>
> extends infer R
  ? R extends GLTFLike
    ? R & ObjectMap
    : R
  : never

export type Extensions<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = (
  loader: LoaderInstance<T>,
) => void

const memoizedLoaders = new WeakMap<ConstructorRepresentation<LoaderLike>, LoaderLike>()

const isConstructor = <T,>(
  value: unknown,
): value is ConstructorRepresentation<THREE.Loader<T, string | string[] | string[][]>> =>
  typeof value === 'function' && value?.prototype?.constructor === value

function loadingFn<L extends LoaderLike | ConstructorRepresentation<THREE.Loader<any>>>(
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
              (data) => {
                if (isObject3D(data?.scene)) Object.assign(data, buildGraph(data.scene))
                res(data)
              },
              onProgress,
              (error) => reject(new Error(`Could not load ${input}: ${(error as ErrorEvent)?.message}`)),
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
