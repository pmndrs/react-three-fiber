import * as THREE from 'three'
import * as React from 'react'
import { StateSelector, EqualityChecker, UseBoundStore, StateListener } from 'zustand'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { suspend, preload, clear } from 'suspend-react'
import { context, RootState, RenderCallback } from './store'
import { buildGraph, ObjectMap, is } from './utils'
import { FilterFunction } from './events'

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
type noop = (...args: any[]) => any
type PickFunction<T extends noop> = (...args: Parameters<T>) => ReturnType<T>

export function useStore() {
  const store = React.useContext(context)
  if (!store) throw `R3F hooks can only be used within the Canvas component!`
  return store
}

export function useThree<T = RootState>(
  selector: StateSelector<RootState, T> = (state) => state as unknown as T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStore()(selector, equalityFn)
}

export type InjectState = Partial<
  Omit<
    RootState,
    | 'set'
    | 'get'
    | 'setSize'
    | 'setFrameloop'
    | 'setDpr'
    | 'events'
    | 'invalidate'
    | 'advance'
    | 'performance'
    | 'internal'
  > & {
    events: { enabled?: boolean; priority?: number; filter?: FilterFunction }
  }
>

const overrideState = (store: UseBoundStore<RootState>, props: InjectState) => {
  const { events, ...inject } = props
  const state = store.getState()
  return { ...state, ...inject, get: () => overrideState(store, props), events: { ...state.events, ...events } }
}

const getOverrideKeys = ({ events, ...inject }: InjectState) => {
  return Object.entries({ ...events, ...inject }).flat()
}

export function useInject(state: InjectState) {
  const useOriginalStore = useStore()
  const useInjectStore = React.useMemo<UseBoundStore<RootState>>(() => {
    const useInjected = (sel: StateSelector<RootState, RootState> = (state) => state) => {
      // Execute the useStore hook with the selector once, to maintain reactivity, result doesn't matter
      useOriginalStore(sel)
      // Inject data and return the result, either selected or raw
      return sel(overrideState(useOriginalStore, state))
    }
    useInjected.setState = useOriginalStore.setState
    useInjected.destroy = useOriginalStore.destroy
    // Patch getState
    useInjected.getState = (): RootState => {
      return overrideState(useOriginalStore, state)
    }
    // Patch subscribe
    useInjected.subscribe = (listener: StateListener<RootState>) => {
      return useOriginalStore.subscribe((current, previous) =>
        listener(overrideState(useOriginalStore, state), previous),
      )
    }
    return useInjected
  }, [useOriginalStore, ...getOverrideKeys(state)])

  // Return the patched store and a provider component
  return React.useMemo(
    () =>
      [
        ({ children }: { children: React.ReactNode }) => (
          <context.Provider value={useInjectStore} children={children} />
        ),
        useInjectStore,
      ] as [React.FC<{ children: React.ReactNode }>, UseBoundStore<RootState>],
    [useInjectStore],
  )
}

export function useFrame(callback: RenderCallback, renderPriority: number = 0): null {
  const subscribe = useStore().getState().internal.subscribe
  // Update ref
  const ref = React.useRef<RenderCallback>(callback)
  React.useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe on mount, unsubscribe on unmount
  React.useLayoutEffect(() => subscribe(ref, renderPriority), [renderPriority, subscribe])
  return null
}

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

export function useMemoizedFn<T extends noop>(fn?: T): PickFunction<T> {
  const fnRef = React.useRef<T | undefined>(fn)
  React.useLayoutEffect(() => void (fnRef.current = fn), [fn])
  return (...args: Parameters<T>) => fnRef.current?.(...args)
}

export function useLoader<T, U extends string | string[]>(
  Proto: new () => LoaderResult<T>,
  input: U,
  extensions?: Extensions,
  onProgress?: (event: ProgressEvent<EventTarget>) => void,
): U extends any[] ? BranchingReturn<T, GLTF, GLTF & ObjectMap>[] : BranchingReturn<T, GLTF, GLTF & ObjectMap> {
  // Use suspense to load async assets
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  const results = suspend(loadingFn<T>(extensions, onProgress), [Proto, ...keys], { equal: is.equ })
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
  return preload(loadingFn<T>(extensions), [Proto, ...keys])
}

useLoader.clear = function <T, U extends string | string[]>(Proto: new () => LoaderResult<T>, input: U) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return clear([Proto, ...keys])
}
