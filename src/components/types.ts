// These values were automatically generated. Do not manually edit this file.
// See scripts/gen-components/
import * as React from 'react'
import * as THREE from 'three'

export type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
export type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O

/**
 * Allows using a TS v4 labeled tuple even with older typescript versions
 */
export type NamedArrayTuple<T extends (...args: any) => any> = Parameters<T>

/**
 * If **T** contains a constructor, @see ConstructorParameters must be used, otherwise **T**.
 */
type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : T

export type Euler = THREE.Euler | Parameters<THREE.Euler['set']>
export type Matrix4 = THREE.Matrix4 | Parameters<THREE.Matrix4['set']>
export type Vector2 = THREE.Vector2 | Parameters<THREE.Vector2['set']>
export type Vector3 = THREE.Vector3 | Parameters<THREE.Vector3['set']>
export type Color = THREE.Color | Parameters<THREE.Color['set']>
export type Layers = THREE.Layers | Parameters<THREE.Layers['set']>
export type Quaternion = THREE.Quaternion | Parameters<THREE.Quaternion['set']>

export interface EventHandlers {
  onClick?: (event: MouseEvent) => void
  onContextMenu?: (event: MouseEvent) => void
  onDoubleClick?: (event: MouseEvent) => void
  onPointerUp?: (event: PointerEvent) => void
  onPointerDown?: (event: PointerEvent) => void
  onPointerOver?: (event: PointerEvent) => void
  onPointerOut?: (event: PointerEvent) => void
  onPointerMove?: (event: PointerEvent) => void
  onWheel?: (event: WheelEvent) => void
}

export interface NodeProps<T, P> {
  /** Attaches this class onto the parent under the given name and nulls it on unmount */
  attach?: string
  /** Appends this class to an array on the parent under the given name and removes it on unmount */
  attachArray?: string
  /** Adds this class to an object on the parent under the given name and deletes it on unmount */
  attachObject?: NamedArrayTuple<(target: string, name: string) => void>
  /** Constructor arguments */
  args?: Args<P>
  children?: React.ReactNode
  ref?: React.Ref<React.ReactNode>
  key?: React.Key
  onUpdate?: (self: T) => void
}

export type Node<T, P> = Overwrite<Partial<T>, NodeProps<T, P>>

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

export type GeometryNode<T extends THREE.Geometry, P> = Overwrite<
  Node<T, P>,
  {
    vertices?: Vector3[]
  }
>

export type MaterialNode<T extends THREE.Material, P> = Overwrite<
  Node<T, P>,
  {
    color?: Color
  }
>

export type LightNode<T extends THREE.Light, P> = Overwrite<
  Object3DNode<T, P>,
  {
    color?: Color
  }
>

export type PrimitiveProps<T extends Record<string, any>> = { object: T } & Partial<T>
export type NewProps<T extends new (...args: any[]) => unknown> = Partial<InstanceType<T>> & {
  object: T
  args: ConstructorParameters<T>
}

// Automatically generated
export type WebGLMultisampleRenderTargetProps = Node<
  THREE.WebGLMultisampleRenderTarget,
  typeof THREE.WebGLMultisampleRenderTarget
>
export type WebGLCubeRenderTargetProps = Node<THREE.WebGLCubeRenderTarget, typeof THREE.WebGLCubeRenderTarget>
export type WebGLRenderTargetProps = Node<THREE.WebGLRenderTarget, typeof THREE.WebGLRenderTarget>
export type WebGLRendererProps = Node<THREE.WebGLRenderer, typeof THREE.WebGLRenderer>
export type WebGL1RendererProps = Node<THREE.WebGL1Renderer, typeof THREE.WebGL1Renderer>
export type FogExp2Props = Node<THREE.FogExp2, typeof THREE.FogExp2>
export type FogProps = Node<THREE.Fog, typeof THREE.Fog>
export type SceneProps = Object3DNode<THREE.Scene, typeof THREE.Scene>
export type SpriteProps = Object3DNode<THREE.Sprite, typeof THREE.Sprite>
export type LODProps = Object3DNode<THREE.LOD, typeof THREE.LOD>
export type InstancedMeshProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.InstancedMesh<TGeometry, TMaterial>, typeof THREE.InstancedMesh>
export type SkinnedMeshProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.SkinnedMesh<TGeometry, TMaterial>, typeof THREE.SkinnedMesh>
export type SkeletonProps = Node<THREE.Skeleton, typeof THREE.Skeleton>
export type BoneProps = Object3DNode<THREE.Bone, typeof THREE.Bone>
export type MeshProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.Mesh<TGeometry, TMaterial>, typeof THREE.Mesh>
export type LineSegmentsProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.LineSegments<TGeometry, TMaterial>, typeof THREE.LineSegments>
export type LineLoopProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.LineLoop<TGeometry, TMaterial>, typeof THREE.LineLoop>
export type LineProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.Line<TGeometry, TMaterial>, typeof THREE.Line>
export type PointsProps<
  TGeometry extends THREE.Geometry | THREE.BufferGeometry = THREE.Geometry | THREE.BufferGeometry,
  TMaterial extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]
> = Object3DNode<THREE.Points<TGeometry, TMaterial>, typeof THREE.Points>
export type GroupProps = Object3DNode<THREE.Group, typeof THREE.Group>
export type VideoTextureProps = Node<THREE.VideoTexture, typeof THREE.VideoTexture>
export type DataTextureProps = Node<THREE.DataTexture, typeof THREE.DataTexture>
export type DataTexture2DArrayProps = Node<THREE.DataTexture2DArray, typeof THREE.DataTexture2DArray>
export type DataTexture3DProps = Node<THREE.DataTexture3D, typeof THREE.DataTexture3D>
export type CompressedTextureProps = Node<THREE.CompressedTexture, typeof THREE.CompressedTexture>
export type CubeTextureProps = Node<THREE.CubeTexture, typeof THREE.CubeTexture>
export type CanvasTextureProps = Node<THREE.CanvasTexture, typeof THREE.CanvasTexture>
export type DepthTextureProps = Node<THREE.DepthTexture, typeof THREE.DepthTexture>
export type TextureProps = Node<THREE.Texture, typeof THREE.Texture>
export type BoxGeometryProps = GeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
export type BoxBufferGeometryProps = Node<THREE.BoxBufferGeometry, typeof THREE.BoxBufferGeometry>
export type CircleGeometryProps = GeometryNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>
export type CircleBufferGeometryProps = Node<THREE.CircleBufferGeometry, typeof THREE.CircleBufferGeometry>
export type ConeGeometryProps = GeometryNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>
export type ConeBufferGeometryProps = Node<THREE.ConeBufferGeometry, typeof THREE.ConeBufferGeometry>
export type CylinderGeometryProps = GeometryNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
export type CylinderBufferGeometryProps = Node<THREE.CylinderBufferGeometry, typeof THREE.CylinderBufferGeometry>
export type DodecahedronGeometryProps = GeometryNode<THREE.DodecahedronGeometry, typeof THREE.DodecahedronGeometry>
export type DodecahedronBufferGeometryProps = Node<
  THREE.DodecahedronBufferGeometry,
  typeof THREE.DodecahedronBufferGeometry
>
export type EdgesGeometryProps = Node<THREE.EdgesGeometry, typeof THREE.EdgesGeometry>
export type ExtrudeGeometryProps = GeometryNode<THREE.ExtrudeGeometry, typeof THREE.ExtrudeGeometry>
export type ExtrudeBufferGeometryProps = Node<THREE.ExtrudeBufferGeometry, typeof THREE.ExtrudeBufferGeometry>
export type IcosahedronGeometryProps = GeometryNode<THREE.IcosahedronGeometry, typeof THREE.IcosahedronGeometry>
export type IcosahedronBufferGeometryProps = Node<
  THREE.IcosahedronBufferGeometry,
  typeof THREE.IcosahedronBufferGeometry
>
export type LatheGeometryProps = GeometryNode<THREE.LatheGeometry, typeof THREE.LatheGeometry>
export type LatheBufferGeometryProps = Node<THREE.LatheBufferGeometry, typeof THREE.LatheBufferGeometry>
export type OctahedronGeometryProps = GeometryNode<THREE.OctahedronGeometry, typeof THREE.OctahedronGeometry>
export type OctahedronBufferGeometryProps = Node<THREE.OctahedronBufferGeometry, typeof THREE.OctahedronBufferGeometry>
export type ParametricGeometryProps = GeometryNode<THREE.ParametricGeometry, typeof THREE.ParametricGeometry>
export type ParametricBufferGeometryProps = Node<THREE.ParametricBufferGeometry, typeof THREE.ParametricBufferGeometry>
export type PlaneGeometryProps = GeometryNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
export type PlaneBufferGeometryProps = Node<THREE.PlaneBufferGeometry, typeof THREE.PlaneBufferGeometry>
export type PolyhedronGeometryProps = GeometryNode<THREE.PolyhedronGeometry, typeof THREE.PolyhedronGeometry>
export type PolyhedronBufferGeometryProps = Node<THREE.PolyhedronBufferGeometry, typeof THREE.PolyhedronBufferGeometry>
export type RingGeometryProps = GeometryNode<THREE.RingGeometry, typeof THREE.RingGeometry>
export type RingBufferGeometryProps = Node<THREE.RingBufferGeometry, typeof THREE.RingBufferGeometry>
export type ShapeGeometryProps = GeometryNode<THREE.ShapeGeometry, typeof THREE.ShapeGeometry>
export type ShapeBufferGeometryProps = Node<THREE.ShapeBufferGeometry, typeof THREE.ShapeBufferGeometry>
export type SphereGeometryProps = GeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
export type SphereBufferGeometryProps = Node<THREE.SphereBufferGeometry, typeof THREE.SphereBufferGeometry>
export type TetrahedronGeometryProps = GeometryNode<THREE.TetrahedronGeometry, typeof THREE.TetrahedronGeometry>
export type TetrahedronBufferGeometryProps = Node<
  THREE.TetrahedronBufferGeometry,
  typeof THREE.TetrahedronBufferGeometry
>
export type TextGeometryProps = GeometryNode<THREE.TextGeometry, typeof THREE.TextGeometry>
export type TextBufferGeometryProps = Node<THREE.TextBufferGeometry, typeof THREE.TextBufferGeometry>
export type TorusGeometryProps = GeometryNode<THREE.TorusGeometry, typeof THREE.TorusGeometry>
export type TorusBufferGeometryProps = Node<THREE.TorusBufferGeometry, typeof THREE.TorusBufferGeometry>
export type TorusKnotGeometryProps = GeometryNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>
export type TorusKnotBufferGeometryProps = Node<THREE.TorusKnotBufferGeometry, typeof THREE.TorusKnotBufferGeometry>
export type TubeGeometryProps = GeometryNode<THREE.TubeGeometry, typeof THREE.TubeGeometry>
export type TubeBufferGeometryProps = Node<THREE.TubeBufferGeometry, typeof THREE.TubeBufferGeometry>
export type WireframeGeometryProps = Node<THREE.WireframeGeometry, typeof THREE.WireframeGeometry>
export type ShadowMaterialProps = MaterialNode<THREE.ShadowMaterial, typeof THREE.ShadowMaterial>
export type SpriteMaterialProps = MaterialNode<THREE.SpriteMaterial, typeof THREE.SpriteMaterial>
export type RawShaderMaterialProps = MaterialNode<THREE.RawShaderMaterial, typeof THREE.RawShaderMaterial>
export type ShaderMaterialProps = MaterialNode<THREE.ShaderMaterial, typeof THREE.ShaderMaterial>
export type PointsMaterialProps = MaterialNode<THREE.PointsMaterial, typeof THREE.PointsMaterial>
export type MeshPhysicalMaterialProps = MaterialNode<THREE.MeshPhysicalMaterial, typeof THREE.MeshPhysicalMaterial>
export type MeshStandardMaterialProps = MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
export type MeshPhongMaterialProps = MaterialNode<THREE.MeshPhongMaterial, typeof THREE.MeshPhongMaterial>
export type MeshToonMaterialProps = MaterialNode<THREE.MeshToonMaterial, typeof THREE.MeshToonMaterial>
export type MeshNormalMaterialProps = MaterialNode<THREE.MeshNormalMaterial, typeof THREE.MeshNormalMaterial>
export type MeshLambertMaterialProps = MaterialNode<THREE.MeshLambertMaterial, typeof THREE.MeshLambertMaterial>
export type MeshDepthMaterialProps = MaterialNode<THREE.MeshDepthMaterial, typeof THREE.MeshDepthMaterial>
export type MeshDistanceMaterialProps = MaterialNode<THREE.MeshDistanceMaterial, typeof THREE.MeshDistanceMaterial>
export type MeshBasicMaterialProps = MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>
export type MeshMatcapMaterialProps = MaterialNode<THREE.MeshMatcapMaterial, typeof THREE.MeshMatcapMaterial>
export type LineDashedMaterialProps = MaterialNode<THREE.LineDashedMaterial, typeof THREE.LineDashedMaterial>
export type LineBasicMaterialProps = MaterialNode<THREE.LineBasicMaterial, typeof THREE.LineBasicMaterial>
export type MaterialProps = MaterialNode<THREE.Material, typeof THREE.Material>
export type AnimationLoaderProps = Node<THREE.AnimationLoader, typeof THREE.AnimationLoader>
export type CompressedTextureLoaderProps = Node<THREE.CompressedTextureLoader, typeof THREE.CompressedTextureLoader>
export type DataTextureLoaderProps = Node<THREE.DataTextureLoader, typeof THREE.DataTextureLoader>
export type CubeTextureLoaderProps = Node<THREE.CubeTextureLoader, typeof THREE.CubeTextureLoader>
export type TextureLoaderProps = Node<THREE.TextureLoader, typeof THREE.TextureLoader>
export type ObjectLoaderProps = Node<THREE.ObjectLoader, typeof THREE.ObjectLoader>
export type MaterialLoaderProps = Node<THREE.MaterialLoader, typeof THREE.MaterialLoader>
export type BufferGeometryLoaderProps = Node<THREE.BufferGeometryLoader, typeof THREE.BufferGeometryLoader>
export type LoadingManagerProps = Node<THREE.LoadingManager, typeof THREE.LoadingManager>
export type ImageLoaderProps = Node<THREE.ImageLoader, typeof THREE.ImageLoader>
export type ImageBitmapLoaderProps = Node<THREE.ImageBitmapLoader, typeof THREE.ImageBitmapLoader>
export type FontLoaderProps = Node<THREE.FontLoader, typeof THREE.FontLoader>
export type FileLoaderProps = Node<THREE.FileLoader, typeof THREE.FileLoader>
export type LoaderProps = Node<THREE.Loader, typeof THREE.Loader>
export type LoaderUtilsProps = Node<THREE.LoaderUtils, typeof THREE.LoaderUtils>
export type AudioLoaderProps = Node<THREE.AudioLoader, typeof THREE.AudioLoader>
export type SpotLightShadowProps = Node<THREE.SpotLightShadow, typeof THREE.SpotLightShadow>
export type SpotLightProps = LightNode<THREE.SpotLight, typeof THREE.SpotLight>
export type PointLightProps = LightNode<THREE.PointLight, typeof THREE.PointLight>
export type PointLightShadowProps = Node<THREE.PointLightShadow, typeof THREE.PointLightShadow>
export type RectAreaLightProps = LightNode<THREE.RectAreaLight, typeof THREE.RectAreaLight>
export type HemisphereLightProps = LightNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>
export type DirectionalLightShadowProps = Node<THREE.DirectionalLightShadow, typeof THREE.DirectionalLightShadow>
export type DirectionalLightProps = LightNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
export type AmbientLightProps = LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
export type LightShadowProps = Node<THREE.LightShadow, typeof THREE.LightShadow>
export type LightProps = LightNode<THREE.Light, typeof THREE.Light>
export type AmbientLightProbeProps = LightNode<THREE.AmbientLightProbe, typeof THREE.AmbientLightProbe>
export type HemisphereLightProbeProps = LightNode<THREE.HemisphereLightProbe, typeof THREE.HemisphereLightProbe>
export type LightProbeProps = LightNode<THREE.LightProbe, typeof THREE.LightProbe>
export type StereoCameraProps = Object3DNode<THREE.StereoCamera, typeof THREE.StereoCamera>
export type PerspectiveCameraProps = Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera>
export type OrthographicCameraProps = Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
export type CubeCameraProps = Object3DNode<THREE.CubeCamera, typeof THREE.CubeCamera>
export type ArrayCameraProps = Object3DNode<THREE.ArrayCamera, typeof THREE.ArrayCamera>
export type CameraProps = Object3DNode<THREE.Camera, typeof THREE.Camera>
export type AudioListenerProps = Object3DNode<THREE.AudioListener, typeof THREE.AudioListener>
export type PositionalAudioProps = Object3DNode<THREE.PositionalAudio, typeof THREE.PositionalAudio>
export type AudioAnalyserProps = Node<THREE.AudioAnalyser, typeof THREE.AudioAnalyser>
export type AudioProps<NodeType extends AudioNode = GainNode> = Object3DNode<THREE.Audio<NodeType>, typeof THREE.Audio>
export type VectorKeyframeTrackProps = Node<THREE.VectorKeyframeTrack, typeof THREE.VectorKeyframeTrack>
export type StringKeyframeTrackProps = Node<THREE.StringKeyframeTrack, typeof THREE.StringKeyframeTrack>
export type QuaternionKeyframeTrackProps = Node<THREE.QuaternionKeyframeTrack, typeof THREE.QuaternionKeyframeTrack>
export type NumberKeyframeTrackProps = Node<THREE.NumberKeyframeTrack, typeof THREE.NumberKeyframeTrack>
export type ColorKeyframeTrackProps = Node<THREE.ColorKeyframeTrack, typeof THREE.ColorKeyframeTrack>
export type BooleanKeyframeTrackProps = Node<THREE.BooleanKeyframeTrack, typeof THREE.BooleanKeyframeTrack>
export type PropertyMixerProps = Node<THREE.PropertyMixer, typeof THREE.PropertyMixer>
export type PropertyBindingProps = Node<THREE.PropertyBinding, typeof THREE.PropertyBinding>
export type KeyframeTrackProps = Node<THREE.KeyframeTrack, typeof THREE.KeyframeTrack>
export type AnimationObjectGroupProps = Node<THREE.AnimationObjectGroup, typeof THREE.AnimationObjectGroup>
export type AnimationMixerProps = Node<THREE.AnimationMixer, typeof THREE.AnimationMixer>
export type AnimationClipProps = Node<THREE.AnimationClip, typeof THREE.AnimationClip>
export type AnimationActionProps = Node<THREE.AnimationAction, typeof THREE.AnimationAction>
export type UniformProps = Node<THREE.Uniform, typeof THREE.Uniform>
export type InstancedBufferGeometryProps = Node<THREE.InstancedBufferGeometry, typeof THREE.InstancedBufferGeometry>
export type BufferGeometryProps = Node<THREE.BufferGeometry, typeof THREE.BufferGeometry>
export type GeometryProps = GeometryNode<THREE.Geometry, typeof THREE.Geometry>
export type InterleavedBufferAttributeProps = Node<
  THREE.InterleavedBufferAttribute,
  typeof THREE.InterleavedBufferAttribute
>
export type InstancedInterleavedBufferProps = Node<
  THREE.InstancedInterleavedBuffer,
  typeof THREE.InstancedInterleavedBuffer
>
export type InterleavedBufferProps = Node<THREE.InterleavedBuffer, typeof THREE.InterleavedBuffer>
export type InstancedBufferAttributeProps = Node<THREE.InstancedBufferAttribute, typeof THREE.InstancedBufferAttribute>
export type BufferAttributeProps = Node<THREE.BufferAttribute, typeof THREE.BufferAttribute>

/**
 * @deprecated Int8Attribute is deprecated in THREE
 */
export type Int8AttributeProps = Node<THREE.Int8Attribute, typeof THREE.Int8Attribute>

/**
 * @deprecated Uint8Attribute is deprecated in THREE
 */
export type Uint8AttributeProps = Node<THREE.Uint8Attribute, typeof THREE.Uint8Attribute>

/**
 * @deprecated Uint8ClampedAttribute is deprecated in THREE
 */
export type Uint8ClampedAttributeProps = Node<THREE.Uint8ClampedAttribute, typeof THREE.Uint8ClampedAttribute>

/**
 * @deprecated Int16Attribute is deprecated in THREE
 */
export type Int16AttributeProps = Node<THREE.Int16Attribute, typeof THREE.Int16Attribute>

/**
 * @deprecated Uint16Attribute is deprecated in THREE
 */
export type Uint16AttributeProps = Node<THREE.Uint16Attribute, typeof THREE.Uint16Attribute>

/**
 * @deprecated Int32Attribute is deprecated in THREE
 */
export type Int32AttributeProps = Node<THREE.Int32Attribute, typeof THREE.Int32Attribute>

/**
 * @deprecated Uint32Attribute is deprecated in THREE
 */
export type Uint32AttributeProps = Node<THREE.Uint32Attribute, typeof THREE.Uint32Attribute>

/**
 * @deprecated Float32Attribute is deprecated in THREE
 */
export type Float32AttributeProps = Node<THREE.Float32Attribute, typeof THREE.Float32Attribute>

/**
 * @deprecated Float64Attribute is deprecated in THREE
 */
export type Float64AttributeProps = Node<THREE.Float64Attribute, typeof THREE.Float64Attribute>
export type Int8BufferAttributeProps = Node<THREE.Int8BufferAttribute, typeof THREE.Int8BufferAttribute>
export type Uint8BufferAttributeProps = Node<THREE.Uint8BufferAttribute, typeof THREE.Uint8BufferAttribute>
export type Uint8ClampedBufferAttributeProps = Node<
  THREE.Uint8ClampedBufferAttribute,
  typeof THREE.Uint8ClampedBufferAttribute
>
export type Int16BufferAttributeProps = Node<THREE.Int16BufferAttribute, typeof THREE.Int16BufferAttribute>
export type Uint16BufferAttributeProps = Node<THREE.Uint16BufferAttribute, typeof THREE.Uint16BufferAttribute>
export type Int32BufferAttributeProps = Node<THREE.Int32BufferAttribute, typeof THREE.Int32BufferAttribute>
export type Uint32BufferAttributeProps = Node<THREE.Uint32BufferAttribute, typeof THREE.Uint32BufferAttribute>
export type Float32BufferAttributeProps = Node<THREE.Float32BufferAttribute, typeof THREE.Float32BufferAttribute>
export type Float64BufferAttributeProps = Node<THREE.Float64BufferAttribute, typeof THREE.Float64BufferAttribute>
export type Face3Props = Node<THREE.Face3, typeof THREE.Face3>
export type Object3DProps = Object3DNode<THREE.Object3D, typeof THREE.Object3D>
export type RaycasterProps = Node<THREE.Raycaster, typeof THREE.Raycaster>
export type LayersProps = Node<THREE.Layers, typeof THREE.Layers>
export type EventDispatcherProps = Node<THREE.EventDispatcher, typeof THREE.EventDispatcher>
export type DirectGeometryProps = Node<THREE.DirectGeometry, typeof THREE.DirectGeometry>
export type ClockProps = Node<THREE.Clock, typeof THREE.Clock>
export type QuaternionLinearInterpolantProps = Node<
  THREE.QuaternionLinearInterpolant,
  typeof THREE.QuaternionLinearInterpolant
>
export type LinearInterpolantProps = Node<THREE.LinearInterpolant, typeof THREE.LinearInterpolant>
export type DiscreteInterpolantProps = Node<THREE.DiscreteInterpolant, typeof THREE.DiscreteInterpolant>
export type CubicInterpolantProps = Node<THREE.CubicInterpolant, typeof THREE.CubicInterpolant>
export type InterpolantProps = Node<THREE.Interpolant, typeof THREE.Interpolant>
export type TriangleProps = Node<THREE.Triangle, typeof THREE.Triangle>
export type SphericalProps = Node<THREE.Spherical, typeof THREE.Spherical>
export type CylindricalProps = Node<THREE.Cylindrical, typeof THREE.Cylindrical>
export type PlaneProps = Node<THREE.Plane, typeof THREE.Plane>
export type FrustumProps = Node<THREE.Frustum, typeof THREE.Frustum>
export type SphereProps = Node<THREE.Sphere, typeof THREE.Sphere>
export type RayProps = Node<THREE.Ray, typeof THREE.Ray>
export type Matrix4Props = Node<THREE.Matrix4, typeof THREE.Matrix4>
export type Matrix3Props = Node<THREE.Matrix3, typeof THREE.Matrix3>
export type Box3Props = Node<THREE.Box3, typeof THREE.Box3>
export type Box2Props = Node<THREE.Box2, typeof THREE.Box2>
export type Line3Props = Node<THREE.Line3, typeof THREE.Line3>
export type EulerProps = Node<THREE.Euler, typeof THREE.Euler>
export type Vector4Props = Node<THREE.Vector4, typeof THREE.Vector4>
export type Vector3Props = Node<THREE.Vector3, typeof THREE.Vector3>
export type Vector2Props = Node<THREE.Vector2, typeof THREE.Vector2>
export type QuaternionProps = Node<THREE.Quaternion, typeof THREE.Quaternion>
export type ColorProps = Node<THREE.Color, typeof THREE.Color>
export type SphericalHarmonics3Props = Node<THREE.SphericalHarmonics3, typeof THREE.SphericalHarmonics3>
export type ImmediateRenderObjectProps = Object3DNode<THREE.ImmediateRenderObject, typeof THREE.ImmediateRenderObject>
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
export type ArcCurveProps = Node<THREE.ArcCurve, typeof THREE.ArcCurve>
export type CatmullRomCurve3Props = Node<THREE.CatmullRomCurve3, typeof THREE.CatmullRomCurve3>
export type CubicBezierCurveProps = Node<THREE.CubicBezierCurve, typeof THREE.CubicBezierCurve>
export type CubicBezierCurve3Props = Node<THREE.CubicBezierCurve3, typeof THREE.CubicBezierCurve3>
export type EllipseCurveProps = Node<THREE.EllipseCurve, typeof THREE.EllipseCurve>
export type LineCurveProps = Node<THREE.LineCurve, typeof THREE.LineCurve>
export type LineCurve3Props = Node<THREE.LineCurve3, typeof THREE.LineCurve3>
export type QuadraticBezierCurveProps = Node<THREE.QuadraticBezierCurve, typeof THREE.QuadraticBezierCurve>
export type QuadraticBezierCurve3Props = Node<THREE.QuadraticBezierCurve3, typeof THREE.QuadraticBezierCurve3>
export type SplineCurveProps = Node<THREE.SplineCurve, typeof THREE.SplineCurve>
export type ShapeProps = Node<THREE.Shape, typeof THREE.Shape>
export type PathProps = Node<THREE.Path, typeof THREE.Path>
export type ShapePathProps = Node<THREE.ShapePath, typeof THREE.ShapePath>
export type FontProps = Node<THREE.Font, typeof THREE.Font>
export type CurvePathProps<T extends THREE.Vector = THREE.Vector> = Node<THREE.CurvePath<T>, typeof THREE.CurvePath>
export type CurveProps<T extends THREE.Vector = THREE.Vector> = Node<THREE.Curve<T>, typeof THREE.Curve>
export type PMREMGeneratorProps = Node<THREE.PMREMGenerator, typeof THREE.PMREMGenerator>
export type WebGLBufferRendererProps = Node<THREE.WebGLBufferRenderer, typeof THREE.WebGLBufferRenderer>
export type WebGLCapabilitiesProps = Node<THREE.WebGLCapabilities, typeof THREE.WebGLCapabilities>
export type WebGLClippingProps = Node<THREE.WebGLClipping, typeof THREE.WebGLClipping>
export type WebGLExtensionsProps = Node<THREE.WebGLExtensions, typeof THREE.WebGLExtensions>
export type WebGLGeometriesProps = Node<THREE.WebGLGeometries, typeof THREE.WebGLGeometries>
export type WebGLIndexedBufferRendererProps = Node<
  THREE.WebGLIndexedBufferRenderer,
  typeof THREE.WebGLIndexedBufferRenderer
>
export type WebGLInfoProps = Node<THREE.WebGLInfo, typeof THREE.WebGLInfo>
export type WebGLLightsProps = Node<THREE.WebGLLights, typeof THREE.WebGLLights>
export type WebGLObjectsProps = Node<THREE.WebGLObjects, typeof THREE.WebGLObjects>
export type WebGLProgramProps = Node<THREE.WebGLProgram, typeof THREE.WebGLProgram>
export type WebGLProgramsProps = Node<THREE.WebGLPrograms, typeof THREE.WebGLPrograms>
export type WebGLPropertiesProps = Node<THREE.WebGLProperties, typeof THREE.WebGLProperties>
export type WebGLRenderListProps = Node<THREE.WebGLRenderList, typeof THREE.WebGLRenderList>
export type WebGLRenderListsProps = Node<THREE.WebGLRenderLists, typeof THREE.WebGLRenderLists>
export type WebGLShaderProps = Node<THREE.WebGLShader, typeof THREE.WebGLShader>
export type WebGLShadowMapProps = Node<THREE.WebGLShadowMap, typeof THREE.WebGLShadowMap>
export type WebGLColorBufferProps = Node<THREE.WebGLColorBuffer, typeof THREE.WebGLColorBuffer>
export type WebGLDepthBufferProps = Node<THREE.WebGLDepthBuffer, typeof THREE.WebGLDepthBuffer>
export type WebGLStencilBufferProps = Node<THREE.WebGLStencilBuffer, typeof THREE.WebGLStencilBuffer>
export type WebGLStateProps = Node<THREE.WebGLState, typeof THREE.WebGLState>
export type WebGLTexturesProps = Node<THREE.WebGLTextures, typeof THREE.WebGLTextures>
export type WebGLUniformsProps = Node<THREE.WebGLUniforms, typeof THREE.WebGLUniforms>
export type XRWebGLLayerProps = Node<THREE.XRWebGLLayer, typeof THREE.XRWebGLLayer>
export type XRRigidTransformProps = Node<THREE.XRRigidTransform, typeof THREE.XRRigidTransform>
export type XRRayProps = Node<THREE.XRRay, typeof THREE.XRRay>
export type XRHandProps = Node<THREE.XRHand, typeof THREE.XRHand>
export type WebXRControllerProps = Node<THREE.WebXRController, typeof THREE.WebXRController>
export type WebXRManagerProps = Node<THREE.WebXRManager, typeof THREE.WebXRManager>

/**
 * @deprecated MultiMaterial is deprecated in THREE
 */
export type MultiMaterialProps = MaterialNode<THREE.MultiMaterial, typeof THREE.MultiMaterial>

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webGLMultisampleRenderTarget: WebGLMultisampleRenderTargetProps
      webGLCubeRenderTarget: WebGLCubeRenderTargetProps
      webGLRenderTarget: WebGLRenderTargetProps
      webGLRenderer: WebGLRendererProps
      webGL1Renderer: WebGL1RendererProps
      fogExp2: FogExp2Props
      fog: FogProps
      scene: SceneProps
      sprite: SpriteProps
      lOD: LODProps
      instancedMesh: InstancedMeshProps
      skinnedMesh: SkinnedMeshProps
      skeleton: SkeletonProps
      bone: BoneProps
      mesh: MeshProps
      lineSegments: LineSegmentsProps
      lineLoop: LineLoopProps
      // This clashes with React's intrinsic elements, but you can use the Line component from react-three-fiber/components
      // line: LineProps;
      points: PointsProps
      group: GroupProps
      videoTexture: VideoTextureProps
      dataTexture: DataTextureProps
      dataTexture2DArray: DataTexture2DArrayProps
      dataTexture3D: DataTexture3DProps
      compressedTexture: CompressedTextureProps
      cubeTexture: CubeTextureProps
      canvasTexture: CanvasTextureProps
      depthTexture: DepthTextureProps
      texture: TextureProps
      boxGeometry: BoxGeometryProps
      boxBufferGeometry: BoxBufferGeometryProps
      circleGeometry: CircleGeometryProps
      circleBufferGeometry: CircleBufferGeometryProps
      coneGeometry: ConeGeometryProps
      coneBufferGeometry: ConeBufferGeometryProps
      cylinderGeometry: CylinderGeometryProps
      cylinderBufferGeometry: CylinderBufferGeometryProps
      dodecahedronGeometry: DodecahedronGeometryProps
      dodecahedronBufferGeometry: DodecahedronBufferGeometryProps
      edgesGeometry: EdgesGeometryProps
      extrudeGeometry: ExtrudeGeometryProps
      extrudeBufferGeometry: ExtrudeBufferGeometryProps
      icosahedronGeometry: IcosahedronGeometryProps
      icosahedronBufferGeometry: IcosahedronBufferGeometryProps
      latheGeometry: LatheGeometryProps
      latheBufferGeometry: LatheBufferGeometryProps
      octahedronGeometry: OctahedronGeometryProps
      octahedronBufferGeometry: OctahedronBufferGeometryProps
      parametricGeometry: ParametricGeometryProps
      parametricBufferGeometry: ParametricBufferGeometryProps
      planeGeometry: PlaneGeometryProps
      planeBufferGeometry: PlaneBufferGeometryProps
      polyhedronGeometry: PolyhedronGeometryProps
      polyhedronBufferGeometry: PolyhedronBufferGeometryProps
      ringGeometry: RingGeometryProps
      ringBufferGeometry: RingBufferGeometryProps
      shapeGeometry: ShapeGeometryProps
      shapeBufferGeometry: ShapeBufferGeometryProps
      sphereGeometry: SphereGeometryProps
      sphereBufferGeometry: SphereBufferGeometryProps
      tetrahedronGeometry: TetrahedronGeometryProps
      tetrahedronBufferGeometry: TetrahedronBufferGeometryProps
      textGeometry: TextGeometryProps
      textBufferGeometry: TextBufferGeometryProps
      torusGeometry: TorusGeometryProps
      torusBufferGeometry: TorusBufferGeometryProps
      torusKnotGeometry: TorusKnotGeometryProps
      torusKnotBufferGeometry: TorusKnotBufferGeometryProps
      tubeGeometry: TubeGeometryProps
      tubeBufferGeometry: TubeBufferGeometryProps
      wireframeGeometry: WireframeGeometryProps
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
      material: MaterialProps
      animationLoader: AnimationLoaderProps
      compressedTextureLoader: CompressedTextureLoaderProps
      dataTextureLoader: DataTextureLoaderProps
      cubeTextureLoader: CubeTextureLoaderProps
      textureLoader: TextureLoaderProps
      objectLoader: ObjectLoaderProps
      materialLoader: MaterialLoaderProps
      bufferGeometryLoader: BufferGeometryLoaderProps
      loadingManager: LoadingManagerProps
      imageLoader: ImageLoaderProps
      imageBitmapLoader: ImageBitmapLoaderProps
      fontLoader: FontLoaderProps
      fileLoader: FileLoaderProps
      loader: LoaderProps
      loaderUtils: LoaderUtilsProps
      audioLoader: AudioLoaderProps
      spotLightShadow: SpotLightShadowProps
      spotLight: SpotLightProps
      pointLight: PointLightProps
      pointLightShadow: PointLightShadowProps
      rectAreaLight: RectAreaLightProps
      hemisphereLight: HemisphereLightProps
      directionalLightShadow: DirectionalLightShadowProps
      directionalLight: DirectionalLightProps
      ambientLight: AmbientLightProps
      lightShadow: LightShadowProps
      light: LightProps
      ambientLightProbe: AmbientLightProbeProps
      hemisphereLightProbe: HemisphereLightProbeProps
      lightProbe: LightProbeProps
      stereoCamera: StereoCameraProps
      perspectiveCamera: PerspectiveCameraProps
      orthographicCamera: OrthographicCameraProps
      cubeCamera: CubeCameraProps
      arrayCamera: ArrayCameraProps
      camera: CameraProps
      audioListener: AudioListenerProps
      positionalAudio: PositionalAudioProps
      audioAnalyser: AudioAnalyserProps
      // This clashes with React's intrinsic elements, but you can use the Audio component from react-three-fiber/components
      // audio: AudioProps;
      vectorKeyframeTrack: VectorKeyframeTrackProps
      stringKeyframeTrack: StringKeyframeTrackProps
      quaternionKeyframeTrack: QuaternionKeyframeTrackProps
      numberKeyframeTrack: NumberKeyframeTrackProps
      colorKeyframeTrack: ColorKeyframeTrackProps
      booleanKeyframeTrack: BooleanKeyframeTrackProps
      propertyMixer: PropertyMixerProps
      propertyBinding: PropertyBindingProps
      keyframeTrack: KeyframeTrackProps
      animationObjectGroup: AnimationObjectGroupProps
      animationMixer: AnimationMixerProps
      animationClip: AnimationClipProps
      animationAction: AnimationActionProps
      uniform: UniformProps
      instancedBufferGeometry: InstancedBufferGeometryProps
      bufferGeometry: BufferGeometryProps
      geometry: GeometryProps
      interleavedBufferAttribute: InterleavedBufferAttributeProps
      instancedInterleavedBuffer: InstancedInterleavedBufferProps
      interleavedBuffer: InterleavedBufferProps
      instancedBufferAttribute: InstancedBufferAttributeProps
      bufferAttribute: BufferAttributeProps
      int8Attribute: Int8AttributeProps
      uint8Attribute: Uint8AttributeProps
      uint8ClampedAttribute: Uint8ClampedAttributeProps
      int16Attribute: Int16AttributeProps
      uint16Attribute: Uint16AttributeProps
      int32Attribute: Int32AttributeProps
      uint32Attribute: Uint32AttributeProps
      float32Attribute: Float32AttributeProps
      float64Attribute: Float64AttributeProps
      int8BufferAttribute: Int8BufferAttributeProps
      uint8BufferAttribute: Uint8BufferAttributeProps
      uint8ClampedBufferAttribute: Uint8ClampedBufferAttributeProps
      int16BufferAttribute: Int16BufferAttributeProps
      uint16BufferAttribute: Uint16BufferAttributeProps
      int32BufferAttribute: Int32BufferAttributeProps
      uint32BufferAttribute: Uint32BufferAttributeProps
      float32BufferAttribute: Float32BufferAttributeProps
      float64BufferAttribute: Float64BufferAttributeProps
      face3: Face3Props
      object3D: Object3DProps
      raycaster: RaycasterProps
      layers: LayersProps
      eventDispatcher: EventDispatcherProps
      directGeometry: DirectGeometryProps
      clock: ClockProps
      quaternionLinearInterpolant: QuaternionLinearInterpolantProps
      linearInterpolant: LinearInterpolantProps
      discreteInterpolant: DiscreteInterpolantProps
      cubicInterpolant: CubicInterpolantProps
      interpolant: InterpolantProps
      triangle: TriangleProps
      spherical: SphericalProps
      cylindrical: CylindricalProps
      plane: PlaneProps
      frustum: FrustumProps
      sphere: SphereProps
      ray: RayProps
      matrix4: Matrix4Props
      matrix3: Matrix3Props
      box3: Box3Props
      box2: Box2Props
      line3: Line3Props
      euler: EulerProps
      vector4: Vector4Props
      vector3: Vector3Props
      vector2: Vector2Props
      quaternion: QuaternionProps
      color: ColorProps
      sphericalHarmonics3: SphericalHarmonics3Props
      immediateRenderObject: ImmediateRenderObjectProps
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
      arcCurve: ArcCurveProps
      catmullRomCurve3: CatmullRomCurve3Props
      cubicBezierCurve: CubicBezierCurveProps
      cubicBezierCurve3: CubicBezierCurve3Props
      ellipseCurve: EllipseCurveProps
      lineCurve: LineCurveProps
      lineCurve3: LineCurve3Props
      quadraticBezierCurve: QuadraticBezierCurveProps
      quadraticBezierCurve3: QuadraticBezierCurve3Props
      splineCurve: SplineCurveProps
      shape: ShapeProps
      // This clashes with React's intrinsic elements, but you can use the Path component from react-three-fiber/components
      // path: PathProps;
      shapePath: ShapePathProps
      font: FontProps
      curvePath: CurvePathProps
      curve: CurveProps
      pMREMGenerator: PMREMGeneratorProps
      webGLBufferRenderer: WebGLBufferRendererProps
      webGLCapabilities: WebGLCapabilitiesProps
      webGLClipping: WebGLClippingProps
      webGLExtensions: WebGLExtensionsProps
      webGLGeometries: WebGLGeometriesProps
      webGLIndexedBufferRenderer: WebGLIndexedBufferRendererProps
      webGLInfo: WebGLInfoProps
      webGLLights: WebGLLightsProps
      webGLObjects: WebGLObjectsProps
      webGLProgram: WebGLProgramProps
      webGLPrograms: WebGLProgramsProps
      webGLProperties: WebGLPropertiesProps
      webGLRenderList: WebGLRenderListProps
      webGLRenderLists: WebGLRenderListsProps
      webGLShader: WebGLShaderProps
      webGLShadowMap: WebGLShadowMapProps
      webGLColorBuffer: WebGLColorBufferProps
      webGLDepthBuffer: WebGLDepthBufferProps
      webGLStencilBuffer: WebGLStencilBufferProps
      webGLState: WebGLStateProps
      webGLTextures: WebGLTexturesProps
      webGLUniforms: WebGLUniformsProps
      xRWebGLLayer: XRWebGLLayerProps
      xRRigidTransform: XRRigidTransformProps
      xRRay: XRRayProps
      xRHand: XRHandProps
      webXRController: WebXRControllerProps
      webXRManager: WebXRManagerProps
      multiMaterial: MultiMaterialProps
    }
  }
}
