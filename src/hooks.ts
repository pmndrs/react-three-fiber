import * as THREE from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader'
import { useRef, useContext as useContextImpl, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useAsset } from 'use-asset'

import { stateContext } from './canvas'

import { LoaderResult, Extensions, BranchingReturn } from './types/internal'
import { ObjectMap, RenderCallback, SharedCanvasContext } from './types/index'

function useContext<T>(context: React.Context<T>) {
  let result = useContextImpl(context)

  if (!('subscribe' in result)) {
    throw new Error(
      `⚡️ react-three-fiber hooks can only be used within the Canvas component! https://github.com/pmndrs/react-three-fiber/blob/master/markdown/api.md#hooks`
    )
  }

  return result
}

export function useFrame(callback: RenderCallback, renderPriority: number = 0): null {
  const { subscribe } = useContext(stateContext)
  // Update ref
  const ref = useRef<RenderCallback>(callback)
  useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe/unsub
  useEffect(() => {
    const unsubscribe = subscribe(ref, renderPriority)
    return () => unsubscribe()
  }, [renderPriority, subscribe])
  return null
}

export function useThree(): SharedCanvasContext {
  return useContext(stateContext)
}

export function useUpdate<T>(
  callback: (props: T) => void,
  dependents: any[],
  optionalRef?: React.MutableRefObject<T>
): React.MutableRefObject<T | undefined> {
  const { invalidate } = useContext(stateContext)
  const localRef = useRef()
  const ref = optionalRef ? optionalRef : localRef
  useLayoutEffect(() => {
    if (ref.current) {
      callback(ref.current)
      invalidate()
    }
  }, dependents) // eslint-disable-line react-hooks/exhaustive-deps
  return ref
}

export function useResource<T>(optionalRef?: React.MutableRefObject<T>): React.MutableRefObject<T> {
  const [_, forceUpdate] = useState(false)
  const localRef = useRef<T>((undefined as unknown) as T)
  const ref = optionalRef ? optionalRef : localRef
  useLayoutEffect(() => void forceUpdate((i) => !i), [])
  return ref
}

function buildGraph(object: THREE.Object3D) {
  const data: ObjectMap = { nodes: {}, materials: {} }
  if (object) {
    object.traverse((obj: any) => {
      if (obj.name) data.nodes[obj.name] = obj as THREE.Object3D
      if (obj.material && !data.materials[obj.material.name])
        data.materials[obj.material.name] = obj.material as THREE.Material
    })
  }
  return data
}

export function useGraph(object: THREE.Object3D) {
  return useMemo(() => buildGraph(object), [object])
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
              (error) => reject(error.message ?? `failure loading ${input}`)
            )
          )
      )
    )
  }
}

export function useLoader<T, U extends string | string[]>(
  Proto: new () => LoaderResult<T>,
  input: U,
  extensions?: Extensions,
  onProgress?: (event: ProgressEvent<EventTarget>) => void
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
  extensions?: Extensions
) {
  const keys = (Array.isArray(input) ? input : [input]) as string[]
  return useAsset.preload(loadingFn<T>(extensions), Proto, ...keys)
}
