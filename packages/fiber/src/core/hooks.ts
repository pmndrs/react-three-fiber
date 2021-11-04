import * as THREE from 'three'
import * as React from 'react'
import { StateSelector, EqualityChecker } from 'zustand'
import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { useAsset } from 'use-asset'
import { context, RootState, RenderCallback } from './store'
import { buildGraph, ObjectMap } from './utils'

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

export function useThree<T = RootState>(
  selector: StateSelector<RootState, T> = (state) => state as unknown as T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStore()(selector, equalityFn)
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

export function useLoader<T, U extends string | string[]>(
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
