type InputLike = string | string[] | string[][] | Readonly<string | string[] | string[][]>
// Define a loader-like interface that matches THREE.Loader's load signature
// This works for both generic and non-generic THREE.Loader instances
interface LoaderLike {
  load(
    url: InputLike,
    onLoad?: (result: any) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (error: unknown) => void,
  ): any
}
type GLTFLike = { scene: THREE.Object3D }

type LoaderInstance<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> =
  T extends ConstructorRepresentation<LoaderLike> ? InstanceType<T> : T

// Infer result type from the load method's callback parameter
type InferLoadResult<T> = T extends {
  load(url: any, onLoad?: (result: infer R) => void, ...args: any[]): any
}
  ? R
  : T extends ConstructorRepresentation<any>
  ? InstanceType<T> extends {
      load(url: any, onLoad?: (result: infer R) => void, ...args: any[]): any
    }
    ? R
    : any
  : any

export type LoaderResult<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = InferLoadResult<
  LoaderInstance<T>
> extends infer R
  ? R extends GLTFLike
    ? R & ObjectMap
    : R
  : never

export type Extensions<T extends LoaderLike | ConstructorRepresentation<LoaderLike>> = (
  loader: LoaderInstance<T>,
) => void
