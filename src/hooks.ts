import * as THREE from 'three'
import { useRef, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { SharedCanvasContext, RenderCallback, stateContext } from './canvas'
//@ts-ignore
import usePromise from 'react-promise-suspense'

// helper type for omitting properties from types
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export function useFrame(callback: RenderCallback, renderPriority: number = 0): void {
  const { subscribe } = useContext(stateContext)
  // Update ref
  const ref = useRef<RenderCallback>(callback)
  useLayoutEffect(() => void (ref.current = callback), [callback])
  // Subscribe/unsub
  useEffect(() => {
    const unsubscribe = subscribe(ref, renderPriority)
    return () => unsubscribe()
  }, [renderPriority])
}

export function useRender(callback: RenderCallback, takeOverRenderloop: boolean = false, deps: any[] = []): void {
  useEffect(
    () =>
      void console.warn(
        'react-three-fiber: Please use useFrame(fn, [priority=0]) ✅ instead of useRender ❌, the former will be made obsolete soon!'
      ),
    []
  )
  useFrame(callback, takeOverRenderloop ? 1 : 0)
}

export function useThree(): SharedCanvasContext {
  return useContext(stateContext)
}

export function useUpdate<T>(
  callback: (props: T) => void,
  dependents: any[],
  optionalRef?: React.MutableRefObject<T>
): React.MutableRefObject<any> {
  const { invalidate } = useContext(stateContext)
  const localRef = useRef()
  const ref = optionalRef ? optionalRef : localRef

  useEffect(() => {
    if (ref.current) {
      callback(ref.current)
      invalidate()
    }
  }, dependents)

  return ref
}

export function useResource<T>(optionalRef?: React.MutableRefObject<T>): [React.MutableRefObject<T>, T] {
  const [_, forceUpdate] = useState(false)
  const localRef = useRef<T>((undefined as unknown) as T)
  const ref = optionalRef ? optionalRef : localRef
  useEffect(() => void forceUpdate(i => !i), [ref.current])
  return [ref, ref.current]
}

type Content = {
  geometry: THREE.Geometry | THREE.BufferGeometry
  material: THREE.Material | THREE.Material[]
}

type Extensions = (loader: THREE.Loader) => void

type LoaderData = {
  data: any
  objects: any[]
}

const blackList = [
  'id',
  'uuid',
  'type',
  'children',
  'parent',
  'matrix',
  'matrixWorld',
  'matrixWorldNeedsUpdate',
  'modelViewMatrix',
  'normalMatrix',
]

function prune(props: any) {
  const reducedProps = { ...props }
  // Remove black listed props
  blackList.forEach(name => delete reducedProps[name])
  // Remove functions
  Object.keys(reducedProps).forEach(name => typeof reducedProps[name] === 'function' && delete reducedProps[name])
  // Prune materials and geometries
  if (reducedProps.material) reducedProps.material = prune(reducedProps.material)
  if (reducedProps.geometry) reducedProps.geometry = prune(reducedProps.geometry)
  // Return cleansed object
  return reducedProps
}

export function useLoader<T>(Proto: THREE.Loader, url: string, extensions?: Extensions): [T, any[]] {
  // Use suspense to load async assets
  const { data, objects } = usePromise<LoaderData>(
    (Proto: THREE.Loader, url: string) =>
      new Promise(res => {
        const loader = new (Proto as any)()
        if (extensions) extensions(loader)
        loader.load(url, (data: any) => {
          const objects: any[] = []
          if (data.scene) data.scene.traverse((props: any) => objects.push(prune(props)))
          res({ data, objects })
        })
      }),
    [Proto, url]
  )
  // Dispose objects on unmount
  useEffect(() => () => data.scene && data.scene.dispose(), [])
  // Return the object itself and a list of pruned props
  return [data, objects]
}
