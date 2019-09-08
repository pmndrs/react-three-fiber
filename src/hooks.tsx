import * as THREE from 'three'
import { useRef, useContext, useEffect, useMemo, useState } from 'react'
import { stateContext, CanvasContext, RenderCallback } from './canvas'

// helper type for omitting properties from types
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

export function useRender(fn: RenderCallback, takeOverRenderloop: boolean = false, deps: any[] = []): void {
  const { subscribe, setManual } = useContext(stateContext)

  // This calls into the host to inform it whether the render-loop is manual or not
  useMemo(() => takeOverRenderloop && setManual(true), [takeOverRenderloop])

  useEffect(() => {
    // Subscribe to the render-loop
    const unsubscribe = subscribe(fn)

    return () => {
      // Call subscription off on unmount
      unsubscribe()
      if (takeOverRenderloop) setManual(false)
    }
  }, deps)
}

/** experimental */
export function useFrame(fn: RenderCallback, deps: any[] = []): void {
  useRender(fn, false, deps)
}

/** experimental */
export function useGl(fn: RenderCallback, deps: any[] = []): void {
  useRender(fn, true, deps)
}

export function useThree(): Omit<CanvasContext, 'subscribe'> {
  const { subscribe, ...props } = useContext(stateContext)
  return props
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
  const [resource, set] = useState()
  const localRef = useRef<T>((undefined as unknown) as T)
  const ref = optionalRef ? optionalRef : localRef
  useEffect(() => void set(ref.current), [ref.current])
  return [ref, resource]
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
