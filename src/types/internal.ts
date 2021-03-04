export type ConditionalType<Child, Parent, Truthy, Falsy> = Child extends Parent ? Truthy : Falsy

export type BranchingReturn<T, Parent, Coerced> = ConditionalType<T, Parent, Coerced, T>

export type Extensions = (loader: THREE.Loader) => void

export type LoaderResult<T> = T extends any[] ? Loader<T[number]> : Loader<T>

export interface Loader<T> extends THREE.Loader {
  load(
    url: string,
    onLoad?: (result: T) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): unknown
}

export interface Intersection extends THREE.Intersection {
  eventObject: THREE.Object3D
}

export type Camera = THREE.OrthographicCamera | THREE.PerspectiveCamera

export type ThreeEvent<T> = T &
  Intersection & {
    intersections: Intersection[]
    stopped: boolean
    unprojectedPoint: THREE.Vector3
    ray: THREE.Ray
    camera: Camera
    stopPropagation: () => void
    sourceEvent: T
    delta: number
  }

export type DomEvent = PointerEvent | MouseEvent | WheelEvent

export type GlobalRenderCallback = (timeStamp: number) => boolean

export interface ObjectHash {
  [name: string]: object
}

export type ThreeScene = THREE.Scene & {
  __interaction?: THREE.Object3D[]
  __objects?: THREE.Object3D[]
}
