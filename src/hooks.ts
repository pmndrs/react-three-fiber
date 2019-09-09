import * as THREE from 'three'
import { useRef, useContext, useEffect, useMemo, useState } from 'react'
import { SharedCanvasContext, RenderCallback, stateContext } from './canvas'

// helper type for omitting properties from types
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export function useFrame(fn: RenderCallback, renderPriority: number = 0): void {
  const { subscribe } = useContext(stateContext)
  // Update ref
  const ref = useRef<RenderCallback>(fn)
  useEffect(() => void (ref.current = fn), [fn])
  // Subscribe/unsub
  useEffect(() => {
    const unsubscribe = subscribe(ref, renderPriority)
    return () => unsubscribe()
  }, [renderPriority])
}

export function useRender(fn: RenderCallback, takeOverRenderloop: boolean = false, deps: any[] = []): void {
  useEffect(
    () =>
      void console.warn(
        'react-three-fiber: Please use useFrame(fn, [priority=0]) ✅ instead of useRender ❌, the former will be made obsolete soon!'
      ),
    []
  )
  useFrame(fn, takeOverRenderloop ? 1 : 0)
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

/** experimental */
export function useLoader(proto: THREE.Loader, url: string, extensions?: Extensions): Content[] {
  const key = useMemo(() => ({}), [url])
  const [cache] = useState(() => new WeakMap())
  const loader = useMemo(() => {
    const temp = new (proto as any)()
    if (extensions) extensions(temp)
    return temp
  }, [proto])
  const [_, forceUpdate] = useState(false)
  useEffect(() => {
    if (!cache.has(key)) {
      loader.load(url, (gltf: any) => {
        const temp: Content[] = []
        gltf.scene.traverse(
          (obj: THREE.Mesh) => obj.isMesh && temp.push({ geometry: obj.geometry, material: obj.material })
        )
        cache.set(key, temp)
        forceUpdate(i => !i)
      })
    }
  }, [proto, key])
  return cache.get(key) || []
}
