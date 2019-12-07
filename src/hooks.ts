import * as THREE from 'three'
import { useRef, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { SharedCanvasContext, RenderCallback, stateContext, Camera } from './canvas'
import { applyProps } from './reconciler'
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

export function useRender(callback: RenderCallback, takeOver: boolean) {
  return useFrame(callback, takeOver ? 1 : 0)
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

export interface Loader<T> extends THREE.Loader {
  load(
    url: string,
    onLoad?: (result: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): unknown
}

export function useLoader<T>(Proto: new () => Loader<T>, url: string | string[], extensions?: Extensions): T {
  const loader = useMemo(() => {
    // Construct new loader
    const temp = new Proto()
    // Run loader extensions
    if (extensions) extensions(temp)
    return temp
  }, [Proto])
  // Use suspense to load async assets
  const results = usePromise<LoaderData>(
    (Proto: THREE.Loader, url: string | string[]) => {
      const urlArray = Array.isArray(url) ? url : [url]
      return Promise.all(
        urlArray.map(
          url =>
            new Promise(res =>
              loader.load(url, (data: any) => {
                if (data.scene) {
                  const objects: any[] = []
                  data.scene.traverse((props: any) => objects.push(prune(props)))
                  data.__$ = objects
                }
                res(data)
              })
            )
        )
      )
    },
    [Proto, url]
  )
  // Dispose objects on unmount
  useEffect(
    () => () =>
      results.forEach((data: any) => {
        if (data.dispose) data.dispose()
        if (data.scene && data.scene.dispose) data.scene.dispose()
      }),
    []
  )

  // Temporary hack to make the new api backwards compatible for a while ...
  const isArray = Array.isArray(url)
  if (!isArray) {
    Object.assign(results[0], {
      [Symbol.iterator]() {
        console.warn('[value]=useLoader(...) is deprecated, please use value=useLoader(...) instead!')
        return [results[0]][Symbol.iterator]()
      },
    })
  }

  // Return the object itself and a list of pruned props
  return isArray ? results : results[0]
}

export function useCamera(camera: Camera, props?: Partial<THREE.Raycaster>) {
  const { mouse } = useThree()
  const raycast = useMemo(() => {
    let raycaster = new THREE.Raycaster()
    if (props) applyProps(raycaster, props, {})
    let originalRaycast:
      | ((raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void)
      | undefined = undefined
    return function(_: THREE.Raycaster, intersects: THREE.Intersection[]): void {
      raycaster.setFromCamera(mouse, camera)
      if (!originalRaycast) originalRaycast = this.constructor.prototype.raycast.bind(this)
      if (originalRaycast) originalRaycast(raycaster, intersects)
    }
  }, [])
  return raycast
}
