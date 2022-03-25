import * as THREE from 'three'
import * as React from 'react'
import { StateSelector, EqualityChecker } from 'zustand'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { useAsset } from 'use-asset'
import { context, RootState, RenderCallback } from './store'

export interface Loader<T> extends THREE.Loader {
  load(
    url: string,
    onLoad?: (result: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void,
  ): unknown
}

type Extensions = (loader: THREE.Loader) => void
type LoaderResult<T> = T extends any[] ? Loader<T[number]> : Loader<T>
type ConditionalType<Child, Parent, Truthy, Falsy> = Child extends Parent ? Truthy : Falsy
type BranchingReturn<T, Parent, Coerced> = ConditionalType<T, Parent, Coerced, T>
type noop = (...args: any[]) => any
type PickFunction<T extends noop> = (...args: Parameters<T>) => ReturnType<T>

export type ObjectMap = {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
}

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

function buildGraph(object: THREE.Object3D) {
  const data: ObjectMap = { nodes: {}, materials: {} }
  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) {
        data.nodes[obj.name] = obj
      }
      if (obj.material && !data.materials[obj.material.name]) {
        data.materials[obj.material.name] = obj.material
      }
    })
  }
  return data
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
