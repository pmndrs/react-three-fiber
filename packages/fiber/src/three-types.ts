import * as THREE from 'three'
import { EventHandlers } from './core/events'
import { AttachType } from './core/renderer'

export type Properties<T> = Pick<T, { [K in keyof T]: T[K] extends (_: any) => any ? never : K }[keyof T]>
export type NonFunctionKeys<T> = { [K in keyof T]-?: T[K] extends Function ? never : K }[keyof T]
export type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O

/**
 * If **T** contains a constructor, @see ConstructorParameters must be used, otherwise **T**.
 */
type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : T

export type Euler = THREE.Euler | Parameters<THREE.Euler['set']>
export type Matrix4 = THREE.Matrix4 | Parameters<THREE.Matrix4['set']> | Readonly<THREE.Matrix4['set']>

/**
 * Turn an implementation of THREE.Vector in to the type that an r3f component would accept as a prop.
 */
type VectorLike<VectorClass extends THREE.Vector2 | THREE.Vector3 | THREE.Vector4> =
  | VectorClass
  | Parameters<VectorClass['set']>
  | Readonly<Parameters<VectorClass['set']>>
  | Parameters<VectorClass['setScalar']>[0]

export type Vector2 = VectorLike<THREE.Vector2>
export type Vector3 = VectorLike<THREE.Vector3>
export type Vector4 = VectorLike<THREE.Vector4>
export type Color = ConstructorParameters<typeof THREE.Color> | THREE.Color | number | string // Parameters<T> will not work here because of multiple function signatures in three.js types
// r153 compat, same issue as above
// https://github.com/pmndrs/react-three-fiber/issues/2926
export type ColorArray = typeof THREE.Color | [color: THREE.ColorRepresentation]
export type Layers = THREE.Layers | Parameters<THREE.Layers['set']>[0]
export type Quaternion = THREE.Quaternion | Parameters<THREE.Quaternion['set']>

export type AttachCallback = string | ((child: any, parentInstance: any) => void)

export interface NodeProps<T, P> {
  attach?: AttachType
  /** Constructor arguments */
  args?: Args<P>
  children?: React.ReactNode
  ref?: React.Ref<T>
  key?: React.Key
  onUpdate?: (self: T) => void
}

export type ExtendedColors<T> = { [K in keyof T]: T[K] extends THREE.Color | undefined ? Color : T[K] }
export type Node<T, P> = [T] extends [{ thisShouldNeverHappen: 'unless the object is of type any' }]
  ? ExtendedColors<Overwrite<Partial<{}>, NodeProps<{}, {}>>>
  : ExtendedColors<Overwrite<Partial<T>, NodeProps<T, P>>>

export type Object3DNode<T, P> = Overwrite<
  Node<T, P>,
  {
    position?: Vector3
    up?: Vector3
    scale?: Vector3
    rotation?: Euler
    matrix?: Matrix4
    quaternion?: Quaternion
    layers?: Layers
    dispose?: (() => void) | null
  }
> &
  EventHandlers

export type BufferGeometryNode<T extends THREE.BufferGeometry, P> = Node<T, P>
export type MaterialNode<T extends THREE.Material, P> = Node<T, P>
export type LightNode<T extends THREE.Light, P> = Object3DNode<T, P>

export type Object3DProps = Object3DNode<THREE.Object3D, typeof THREE.Object3D>
// export type AudioProps = Object3DNode<THREE.Audio, typeof THREE.Audio>
export type AudioListenerProps = Object3DNode<THREE.AudioListener, typeof THREE.AudioListener>
export type PositionalAudioProps = Object3DNode<THREE.PositionalAudio, typeof THREE.PositionalAudio>

export type MeshProps = Object3DNode<THREE.Mesh, typeof THREE.Mesh>
export type InstancedMeshProps = Object3DNode<THREE.InstancedMesh, typeof THREE.InstancedMesh>
/** @ts-ignore */
export type BatchedMeshProps = Object3DNode<THREE.BatchedMesh, typeof THREE.BatchedMesh>
export type SceneProps = Object3DNode<THREE.Scene, typeof THREE.Scene>
export type SpriteProps = Object3DNode<THREE.Sprite, typeof THREE.Sprite>
export type LODProps = Object3DNode<THREE.LOD, typeof THREE.LOD>
export type SkinnedMeshProps = Object3DNode<THREE.SkinnedMesh, typeof THREE.SkinnedMesh>

export type SkeletonProps = Object3DNode<THREE.Skeleton, typeof THREE.Skeleton>
export type BoneProps = Object3DNode<THREE.Bone, typeof THREE.Bone>
export type LineSegmentsProps = Object3DNode<THREE.LineSegments, typeof THREE.LineSegments>
export type LineLoopProps = Object3DNode<THREE.LineLoop, typeof THREE.LineLoop>
// export type LineProps = Object3DNode<THREE.Line, typeof THREE.Line>
export type PointsProps = Object3DNode<THREE.Points, typeof THREE.Points>
export type GroupProps = Object3DNode<THREE.Group, typeof THREE.Group>

export type CameraProps = Object3DNode<THREE.Camera, typeof THREE.Camera>
export type PerspectiveCameraProps = Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera>
export type OrthographicCameraProps = Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
export type CubeCameraProps = Object3DNode<THREE.CubeCamera, typeof THREE.CubeCamera>
export type ArrayCameraProps = Object3DNode<THREE.ArrayCamera, typeof THREE.ArrayCamera>

export type InstancedBufferGeometryProps = BufferGeometryNode<
  THREE.InstancedBufferGeometry,
  typeof THREE.InstancedBufferGeometry
>
export type BufferGeometryProps = BufferGeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>
/** @ts-ignore */
export type BoxBufferGeometryProps = BufferGeometryNode<THREE.BoxBufferGeometry, typeof THREE.BoxBufferGeometry>
export type CircleBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.CircleBufferGeometry,
  /** @ts-ignore */
  typeof THREE.CircleBufferGeometry
>
/** @ts-ignore */
export type ConeBufferGeometryProps = BufferGeometryNode<THREE.ConeBufferGeometry, typeof THREE.ConeBufferGeometry>
export type CylinderBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.CylinderBufferGeometry,
  /** @ts-ignore */
  typeof THREE.CylinderBufferGeometry
>
export type DodecahedronBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.DodecahedronBufferGeometry,
  /** @ts-ignore */
  typeof THREE.DodecahedronBufferGeometry
>
export type ExtrudeBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.ExtrudeBufferGeometry,
  /** @ts-ignore */
  typeof THREE.ExtrudeBufferGeometry
>
export type IcosahedronBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.IcosahedronBufferGeometry,
  /** @ts-ignore */
  typeof THREE.IcosahedronBufferGeometry
>
/** @ts-ignore */
export type LatheBufferGeometryProps = BufferGeometryNode<THREE.LatheBufferGeometry, typeof THREE.LatheBufferGeometry>
export type OctahedronBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.OctahedronBufferGeometry,
  /** @ts-ignore */
  typeof THREE.OctahedronBufferGeometry
>
/** @ts-ignore */
export type PlaneBufferGeometryProps = BufferGeometryNode<THREE.PlaneBufferGeometry, typeof THREE.PlaneBufferGeometry>
export type PolyhedronBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.PolyhedronBufferGeometry,
  /** @ts-ignore */
  typeof THREE.PolyhedronBufferGeometry
>
/** @ts-ignore */
export type RingBufferGeometryProps = BufferGeometryNode<THREE.RingBufferGeometry, typeof THREE.RingBufferGeometry>
/** @ts-ignore */
export type ShapeBufferGeometryProps = BufferGeometryNode<THREE.ShapeBufferGeometry, typeof THREE.ShapeBufferGeometry>
export type SphereBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.SphereBufferGeometry,
  /** @ts-ignore */
  typeof THREE.SphereBufferGeometry
>
export type TetrahedronBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.TetrahedronBufferGeometry,
  /** @ts-ignore */
  typeof THREE.TetrahedronBufferGeometry
>
/** @ts-ignore */
export type TorusBufferGeometryProps = BufferGeometryNode<THREE.TorusBufferGeometry, typeof THREE.TorusBufferGeometry>
export type TorusKnotBufferGeometryProps = BufferGeometryNode<
  /** @ts-ignore */
  THREE.TorusKnotBufferGeometry,
  /** @ts-ignore */
  typeof THREE.TorusKnotBufferGeometry
>
/** @ts-ignore */
export type TubeBufferGeometryProps = BufferGeometryNode<THREE.TubeBufferGeometry, typeof THREE.TubeBufferGeometry>
export type WireframeGeometryProps = BufferGeometryNode<THREE.WireframeGeometry, typeof THREE.WireframeGeometry>
export type TetrahedronGeometryProps = BufferGeometryNode<THREE.TetrahedronGeometry, typeof THREE.TetrahedronGeometry>
export type OctahedronGeometryProps = BufferGeometryNode<THREE.OctahedronGeometry, typeof THREE.OctahedronGeometry>
export type IcosahedronGeometryProps = BufferGeometryNode<THREE.IcosahedronGeometry, typeof THREE.IcosahedronGeometry>
export type DodecahedronGeometryProps = BufferGeometryNode<
  THREE.DodecahedronGeometry,
  typeof THREE.DodecahedronGeometry
>
export type PolyhedronGeometryProps = BufferGeometryNode<THREE.PolyhedronGeometry, typeof THREE.PolyhedronGeometry>
export type TubeGeometryProps = BufferGeometryNode<THREE.TubeGeometry, typeof THREE.TubeGeometry>
export type TorusKnotGeometryProps = BufferGeometryNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>
export type TorusGeometryProps = BufferGeometryNode<THREE.TorusGeometry, typeof THREE.TorusGeometry>
export type SphereGeometryProps = BufferGeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
export type RingGeometryProps = BufferGeometryNode<THREE.RingGeometry, typeof THREE.RingGeometry>
export type PlaneGeometryProps = BufferGeometryNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
export type LatheGeometryProps = BufferGeometryNode<THREE.LatheGeometry, typeof THREE.LatheGeometry>
export type ShapeGeometryProps = BufferGeometryNode<THREE.ShapeGeometry, typeof THREE.ShapeGeometry>
export type ExtrudeGeometryProps = BufferGeometryNode<THREE.ExtrudeGeometry, typeof THREE.ExtrudeGeometry>
export type EdgesGeometryProps = BufferGeometryNode<THREE.EdgesGeometry, typeof THREE.EdgesGeometry>
export type ConeGeometryProps = BufferGeometryNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>
export type CylinderGeometryProps = BufferGeometryNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
export type CircleGeometryProps = BufferGeometryNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>
export type BoxGeometryProps = BufferGeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
export type CapsuleGeometryProps = BufferGeometryNode<THREE.CapsuleGeometry, typeof THREE.CapsuleGeometry>

export type MaterialProps = MaterialNode<THREE.Material, [THREE.MaterialParameters]>
export type ShadowMaterialProps = MaterialNode<THREE.ShadowMaterial, [THREE.ShaderMaterialParameters]>
export type SpriteMaterialProps = MaterialNode<THREE.SpriteMaterial, [THREE.SpriteMaterialParameters]>
export type RawShaderMaterialProps = MaterialNode<THREE.RawShaderMaterial, [THREE.ShaderMaterialParameters]>
export type ShaderMaterialProps = MaterialNode<THREE.ShaderMaterial, [THREE.ShaderMaterialParameters]>
export type PointsMaterialProps = MaterialNode<THREE.PointsMaterial, [THREE.PointsMaterialParameters]>
export type MeshPhysicalMaterialProps = MaterialNode<THREE.MeshPhysicalMaterial, [THREE.MeshPhysicalMaterialParameters]>
export type MeshStandardMaterialProps = MaterialNode<THREE.MeshStandardMaterial, [THREE.MeshStandardMaterialParameters]>
export type MeshPhongMaterialProps = MaterialNode<THREE.MeshPhongMaterial, [THREE.MeshPhongMaterialParameters]>
export type MeshToonMaterialProps = MaterialNode<THREE.MeshToonMaterial, [THREE.MeshToonMaterialParameters]>
export type MeshNormalMaterialProps = MaterialNode<THREE.MeshNormalMaterial, [THREE.MeshNormalMaterialParameters]>
export type MeshLambertMaterialProps = MaterialNode<THREE.MeshLambertMaterial, [THREE.MeshLambertMaterialParameters]>
export type MeshDepthMaterialProps = MaterialNode<THREE.MeshDepthMaterial, [THREE.MeshDepthMaterialParameters]>
export type MeshDistanceMaterialProps = MaterialNode<THREE.MeshDistanceMaterial, [THREE.MeshDistanceMaterialParameters]>
export type MeshBasicMaterialProps = MaterialNode<THREE.MeshBasicMaterial, [THREE.MeshBasicMaterialParameters]>
export type MeshMatcapMaterialProps = MaterialNode<THREE.MeshMatcapMaterial, [THREE.MeshMatcapMaterialParameters]>
export type LineDashedMaterialProps = MaterialNode<THREE.LineDashedMaterial, [THREE.LineDashedMaterialParameters]>
export type LineBasicMaterialProps = MaterialNode<THREE.LineBasicMaterial, [THREE.LineBasicMaterialParameters]>

export type PrimitiveProps = { object: object } & { [properties: string]: any }

export type LightProps = LightNode<THREE.Light, typeof THREE.Light>
export type SpotLightShadowProps = Node<THREE.SpotLightShadow, typeof THREE.SpotLightShadow>
export type SpotLightProps = LightNode<THREE.SpotLight, typeof THREE.SpotLight>
export type PointLightProps = LightNode<THREE.PointLight, typeof THREE.PointLight>
export type RectAreaLightProps = LightNode<THREE.RectAreaLight, typeof THREE.RectAreaLight>
export type HemisphereLightProps = LightNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>
export type DirectionalLightShadowProps = Node<THREE.DirectionalLightShadow, typeof THREE.DirectionalLightShadow>
export type DirectionalLightProps = LightNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
export type AmbientLightProps = LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
export type LightShadowProps = Node<THREE.LightShadow, typeof THREE.LightShadow>
/** @ts-ignore */
export type AmbientLightProbeProps = LightNode<THREE.AmbientLightProbe, typeof THREE.AmbientLightProbe>
/** @ts-ignore */
export type HemisphereLightProbeProps = LightNode<THREE.HemisphereLightProbe, typeof THREE.HemisphereLightProbe>
export type LightProbeProps = LightNode<THREE.LightProbe, typeof THREE.LightProbe>

export type SpotLightHelperProps = Object3DNode<THREE.SpotLightHelper, typeof THREE.SpotLightHelper>
export type SkeletonHelperProps = Object3DNode<THREE.SkeletonHelper, typeof THREE.SkeletonHelper>
export type PointLightHelperProps = Object3DNode<THREE.PointLightHelper, typeof THREE.PointLightHelper>
export type HemisphereLightHelperProps = Object3DNode<THREE.HemisphereLightHelper, typeof THREE.HemisphereLightHelper>
export type GridHelperProps = Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>
export type PolarGridHelperProps = Object3DNode<THREE.PolarGridHelper, typeof THREE.PolarGridHelper>
export type DirectionalLightHelperProps = Object3DNode<
  THREE.DirectionalLightHelper,
  typeof THREE.DirectionalLightHelper
>
export type CameraHelperProps = Object3DNode<THREE.CameraHelper, typeof THREE.CameraHelper>
export type BoxHelperProps = Object3DNode<THREE.BoxHelper, typeof THREE.BoxHelper>
export type Box3HelperProps = Object3DNode<THREE.Box3Helper, typeof THREE.Box3Helper>
export type PlaneHelperProps = Object3DNode<THREE.PlaneHelper, typeof THREE.PlaneHelper>
export type ArrowHelperProps = Object3DNode<THREE.ArrowHelper, typeof THREE.ArrowHelper>
export type AxesHelperProps = Object3DNode<THREE.AxesHelper, typeof THREE.AxesHelper>

export type TextureProps = Node<THREE.Texture, typeof THREE.Texture>
export type VideoTextureProps = Node<THREE.VideoTexture, typeof THREE.VideoTexture>
export type DataTextureProps = Node<THREE.DataTexture, typeof THREE.DataTexture>
/** @ts-ignore */
export type DataTexture3DProps = Node<THREE.DataTexture3D, typeof THREE.DataTexture3D>
export type CompressedTextureProps = Node<THREE.CompressedTexture, typeof THREE.CompressedTexture>
export type CubeTextureProps = Node<THREE.CubeTexture, typeof THREE.CubeTexture>
export type CanvasTextureProps = Node<THREE.CanvasTexture, typeof THREE.CanvasTexture>
export type DepthTextureProps = Node<THREE.DepthTexture, typeof THREE.DepthTexture>

export type RaycasterProps = Node<THREE.Raycaster, typeof THREE.Raycaster>
export type Vector2Props = Node<THREE.Vector2, typeof THREE.Vector2>
export type Vector3Props = Node<THREE.Vector3, typeof THREE.Vector3>
export type Vector4Props = Node<THREE.Vector4, typeof THREE.Vector4>
export type EulerProps = Node<THREE.Euler, typeof THREE.Euler>
export type Matrix3Props = Node<THREE.Matrix3, typeof THREE.Matrix3>
export type Matrix4Props = Node<THREE.Matrix4, typeof THREE.Matrix4>
export type QuaternionProps = Node<THREE.Quaternion, typeof THREE.Quaternion>
export type BufferAttributeProps = Node<THREE.BufferAttribute, typeof THREE.BufferAttribute>
export type Float16BufferAttributeProps = Node<THREE.Float16BufferAttribute, typeof THREE.Float16BufferAttribute>
export type Float32BufferAttributeProps = Node<THREE.Float32BufferAttribute, typeof THREE.Float32BufferAttribute>
/** @ts-ignore */
export type Float64BufferAttributeProps = Node<THREE.Float64BufferAttribute, typeof THREE.Float64BufferAttribute>
export type Int8BufferAttributeProps = Node<THREE.Int8BufferAttribute, typeof THREE.Int8BufferAttribute>
export type Int16BufferAttributeProps = Node<THREE.Int16BufferAttribute, typeof THREE.Int16BufferAttribute>
export type Int32BufferAttributeProps = Node<THREE.Int32BufferAttribute, typeof THREE.Int32BufferAttribute>
export type Uint8BufferAttributeProps = Node<THREE.Uint8BufferAttribute, typeof THREE.Uint8BufferAttribute>
export type Uint16BufferAttributeProps = Node<THREE.Uint16BufferAttribute, typeof THREE.Uint16BufferAttribute>
export type Uint32BufferAttributeProps = Node<THREE.Uint32BufferAttribute, typeof THREE.Uint32BufferAttribute>
export type InstancedBufferAttributeProps = Node<THREE.InstancedBufferAttribute, typeof THREE.InstancedBufferAttribute>
export type ColorProps = Node<THREE.Color, ColorArray>
export type FogProps = Node<THREE.Fog, typeof THREE.Fog>
export type FogExp2Props = Node<THREE.FogExp2, typeof THREE.FogExp2>
export type ShapeProps = Node<THREE.Shape, typeof THREE.Shape>

export interface ThreeElements {
  object3D: Object3DProps

  // `audio` works but conflicts with @types/react. Try using PositionalAudio from @react-three/drei instead
  // audio: AudioProps
  audioListener: AudioListenerProps
  positionalAudio: PositionalAudioProps

  mesh: MeshProps
  batchedMesh: BatchedMeshProps
  instancedMesh: InstancedMeshProps
  scene: SceneProps
  sprite: SpriteProps
  lOD: LODProps
  skinnedMesh: SkinnedMeshProps
  skeleton: SkeletonProps
  bone: BoneProps
  lineSegments: LineSegmentsProps
  lineLoop: LineLoopProps
  // see `audio`
  // line: LineProps
  points: PointsProps
  group: GroupProps

  // cameras
  camera: CameraProps
  perspectiveCamera: PerspectiveCameraProps
  orthographicCamera: OrthographicCameraProps
  cubeCamera: CubeCameraProps
  arrayCamera: ArrayCameraProps

  // geometry
  instancedBufferGeometry: InstancedBufferGeometryProps
  bufferGeometry: BufferGeometryProps
  boxBufferGeometry: BoxBufferGeometryProps
  circleBufferGeometry: CircleBufferGeometryProps
  coneBufferGeometry: ConeBufferGeometryProps
  cylinderBufferGeometry: CylinderBufferGeometryProps
  dodecahedronBufferGeometry: DodecahedronBufferGeometryProps
  extrudeBufferGeometry: ExtrudeBufferGeometryProps
  icosahedronBufferGeometry: IcosahedronBufferGeometryProps
  latheBufferGeometry: LatheBufferGeometryProps
  octahedronBufferGeometry: OctahedronBufferGeometryProps
  planeBufferGeometry: PlaneBufferGeometryProps
  polyhedronBufferGeometry: PolyhedronBufferGeometryProps
  ringBufferGeometry: RingBufferGeometryProps
  shapeBufferGeometry: ShapeBufferGeometryProps
  sphereBufferGeometry: SphereBufferGeometryProps
  tetrahedronBufferGeometry: TetrahedronBufferGeometryProps
  torusBufferGeometry: TorusBufferGeometryProps
  torusKnotBufferGeometry: TorusKnotBufferGeometryProps
  tubeBufferGeometry: TubeBufferGeometryProps
  wireframeGeometry: WireframeGeometryProps
  tetrahedronGeometry: TetrahedronGeometryProps
  octahedronGeometry: OctahedronGeometryProps
  icosahedronGeometry: IcosahedronGeometryProps
  dodecahedronGeometry: DodecahedronGeometryProps
  polyhedronGeometry: PolyhedronGeometryProps
  tubeGeometry: TubeGeometryProps
  torusKnotGeometry: TorusKnotGeometryProps
  torusGeometry: TorusGeometryProps
  sphereGeometry: SphereGeometryProps
  ringGeometry: RingGeometryProps
  planeGeometry: PlaneGeometryProps
  latheGeometry: LatheGeometryProps
  shapeGeometry: ShapeGeometryProps
  extrudeGeometry: ExtrudeGeometryProps
  edgesGeometry: EdgesGeometryProps
  coneGeometry: ConeGeometryProps
  cylinderGeometry: CylinderGeometryProps
  circleGeometry: CircleGeometryProps
  boxGeometry: BoxGeometryProps
  capsuleGeometry: CapsuleGeometryProps

  // materials
  material: MaterialProps
  shadowMaterial: ShadowMaterialProps
  spriteMaterial: SpriteMaterialProps
  rawShaderMaterial: RawShaderMaterialProps
  shaderMaterial: ShaderMaterialProps
  pointsMaterial: PointsMaterialProps
  meshPhysicalMaterial: MeshPhysicalMaterialProps
  meshStandardMaterial: MeshStandardMaterialProps
  meshPhongMaterial: MeshPhongMaterialProps
  meshToonMaterial: MeshToonMaterialProps
  meshNormalMaterial: MeshNormalMaterialProps
  meshLambertMaterial: MeshLambertMaterialProps
  meshDepthMaterial: MeshDepthMaterialProps
  meshDistanceMaterial: MeshDistanceMaterialProps
  meshBasicMaterial: MeshBasicMaterialProps
  meshMatcapMaterial: MeshMatcapMaterialProps
  lineDashedMaterial: LineDashedMaterialProps
  lineBasicMaterial: LineBasicMaterialProps

  // primitive
  primitive: PrimitiveProps

  // lights and other
  light: LightProps
  spotLightShadow: SpotLightShadowProps
  spotLight: SpotLightProps
  pointLight: PointLightProps
  rectAreaLight: RectAreaLightProps
  hemisphereLight: HemisphereLightProps
  directionalLightShadow: DirectionalLightShadowProps
  directionalLight: DirectionalLightProps
  ambientLight: AmbientLightProps
  lightShadow: LightShadowProps
  ambientLightProbe: AmbientLightProbeProps
  hemisphereLightProbe: HemisphereLightProbeProps
  lightProbe: LightProbeProps

  // helpers
  spotLightHelper: SpotLightHelperProps
  skeletonHelper: SkeletonHelperProps
  pointLightHelper: PointLightHelperProps
  hemisphereLightHelper: HemisphereLightHelperProps
  gridHelper: GridHelperProps
  polarGridHelper: PolarGridHelperProps
  directionalLightHelper: DirectionalLightHelperProps
  cameraHelper: CameraHelperProps
  boxHelper: BoxHelperProps
  box3Helper: Box3HelperProps
  planeHelper: PlaneHelperProps
  arrowHelper: ArrowHelperProps
  axesHelper: AxesHelperProps

  // textures
  texture: TextureProps
  videoTexture: VideoTextureProps
  dataTexture: DataTextureProps
  dataTexture3D: DataTexture3DProps
  compressedTexture: CompressedTextureProps
  cubeTexture: CubeTextureProps
  canvasTexture: CanvasTextureProps
  depthTexture: DepthTextureProps

  // misc
  raycaster: RaycasterProps
  vector2: Vector2Props
  vector3: Vector3Props
  vector4: Vector4Props
  euler: EulerProps
  matrix3: Matrix3Props
  matrix4: Matrix4Props
  quaternion: QuaternionProps
  bufferAttribute: BufferAttributeProps
  float16BufferAttribute: Float16BufferAttributeProps
  float32BufferAttribute: Float32BufferAttributeProps
  float64BufferAttribute: Float64BufferAttributeProps
  int8BufferAttribute: Int8BufferAttributeProps
  int16BufferAttribute: Int16BufferAttributeProps
  int32BufferAttribute: Int32BufferAttributeProps
  uint8BufferAttribute: Uint8BufferAttributeProps
  uint16BufferAttribute: Uint16BufferAttributeProps
  uint32BufferAttribute: Uint32BufferAttributeProps
  instancedBufferAttribute: InstancedBufferAttributeProps
  color: ColorProps
  fog: FogProps
  fogExp2: FogExp2Props
  shape: ShapeProps
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
