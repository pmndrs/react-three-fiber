import * as THREE from 'three'
import { useRef, useContext as useContextImpl, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { SharedCanvasContext, RenderCallback, stateContext } from './canvas'
import { useAsset } from 'use-asset'

function useContext<T>(context: React.Context<T>) {
  let result = useContextImpl(context)
  if (!result) {
    console.warn('hooks can only be used within the canvas! https://github.com/react-spring/react-three-fiber#hooks')
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
): React.MutableRefObject<T> | React.MutableRefObject<undefined> {
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

export interface Loader<T> extends THREE.Loader {
  load(
    url: string,
    onLoad?: (result: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): unknown
}

type Extensions = (loader: THREE.Loader) => void
type LoaderResult<T> = T extends any[] ? Loader<T[number]> : Loader<T>

type ObjectMap = {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
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
  return function (Proto: new () => LoaderResult<T>, input: string[] | string) {
    // Construct new loader and run extensions
    const loader = new Proto()
    if (extensions) extensions(loader)
    // Go through the urls and load them
    const urlArray = Array.isArray(input) ? input : [input]
    return Promise.all(
      urlArray.map(
        (input) =>
          new Promise((res, reject) =>
            loader.load(
              input,
              (data: any) => {
                if (data.scene) Object.assign(data, buildGraph(data.scene))
                res(data)
              },
              onProgress,
              (error) => reject(error.message)
            )
          )
      )
    )
  }
}

export function useLoader<T>(
  Proto: new () => LoaderResult<T>,
  input: T extends any[] ? string[] : string,
  extensions?: Extensions,
  onProgress?: (event: ProgressEvent<EventTarget>) => void
): T {
  // Use suspense to load async assets
  const results = useAsset(loadingFn<T>(extensions, onProgress), [Proto, input]) as unknown[]
  // Return the object/s
  return (Array.isArray(input) ? results : results[0]) as T
}

useLoader.preload = function <T>(
  Proto: new () => LoaderResult<T>,
  url: T extends any[] ? string[] : string,
  extensions?: Extensions
) {
  return useAsset.preload(loadingFn<T>(extensions), Proto, url)
}
