import * as THREE from 'three'
import { MouseEvent, PointerEvent, WheelEvent } from './canvas'

export type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
export type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O
/**
 * Allows using a TS v4 labeled tuple even with older typescript versions
 */
export type NamedArrayTuple<T extends (...args: any) => any> = Parameters<T>

/**
 * If **T** contains a constructor, @see ConstructorParameters must be used, otherwise **T**.
 */
type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : T

export type Euler = ReactThreeFiber.Euler
export type Matrix4 = ReactThreeFiber.Matrix4
export type Vector2 = ReactThreeFiber.Vector2
export type Vector3 = ReactThreeFiber.Vector3
export type Color = ReactThreeFiber.Color
export type Layers = ReactThreeFiber.Layers
export type Quaternion = ReactThreeFiber.Quaternion

export type EventHandlers = ReactThreeFiber.EventHandlers

export type NodeProps<T, P> = ReactThreeFiber.NodeProps<T, P>

export type Node<T, P> = ReactThreeFiber.Node<T, P>

export type Object3DNode<T, P> = ReactThreeFiber.Object3DNode<T, P>

export type GeometryNode<T extends THREE.Geometry, P> = ReactThreeFiber.GeometryNode<T, P>
export type BufferGeometryNode<T extends THREE.BufferGeometry, P> = ReactThreeFiber.BufferGeometryNode<T, P>
export type MaterialNode<T extends THREE.Material, P> = ReactThreeFiber.MaterialNode<T, P>
export type LightNode<T extends THREE.Light, P> = ReactThreeFiber.LightNode<T, P>

// export type AudioProps = ReactThreeFiber.AudioProps
export type AudioListenerProps = ReactThreeFiber.AudioListenerProps
export type PositionalAudioProps = ReactThreeFiber.PositionalAudioProps
export type MeshProps = ReactThreeFiber.MeshProps
export type InstancedMeshProps = ReactThreeFiber.InstancedMeshProps
export type SceneProps = ReactThreeFiber.SceneProps
export type SpriteProps = ReactThreeFiber.SpriteProps
export type LODProps = ReactThreeFiber.LODProps
export type SkinnedMeshProps = ReactThreeFiber.SkinnedMeshProps
export type SkeletonProps = ReactThreeFiber.SkeletonProps
export type BoneProps = ReactThreeFiber.BoneProps
export type LineSegmentsProps = ReactThreeFiber.LineSegmentsProps
export type LineLoopProps = ReactThreeFiber.LineLoopProps
// export type LineProps = ReactThreeFiber.LineProps
export type PointsProps = ReactThreeFiber.PointsProps
export type GroupProps = ReactThreeFiber.GroupProps
export type ImmediateRenderObjectProps = ReactThreeFiber.ImmediateRenderObjectProps
export type CameraProps = ReactThreeFiber.CameraProps
export type PerspectiveCameraProps = ReactThreeFiber.PerspectiveCameraProps
export type OrthographicCameraProps = ReactThreeFiber.OrthographicCameraProps
export type CubeCameraProps = ReactThreeFiber.CubeCameraProps
export type ArrayCameraProps = ReactThreeFiber.ArrayCameraProps
export type GeometryProps = ReactThreeFiber.GeometryProps
export type InstancedBufferGeometryProps = ReactThreeFiber.InstancedBufferGeometryProps
export type BufferGeometryProps = ReactThreeFiber.BufferGeometryProps
export type BoxBufferGeometryProps = ReactThreeFiber.BoxBufferGeometryProps
export type CircleBufferGeometryProps = ReactThreeFiber.CircleBufferGeometryProps
export type ConeBufferGeometryProps = ReactThreeFiber.ConeBufferGeometryProps
export type CylinderBufferGeometryProps = ReactThreeFiber.CylinderBufferGeometryProps
export type DodecahedronBufferGeometryProps = ReactThreeFiber.DodecahedronBufferGeometryProps
export type ExtrudeBufferGeometryProps = ReactThreeFiber.ExtrudeBufferGeometryProps
export type IcosahedronBufferGeometryProps = ReactThreeFiber.IcosahedronBufferGeometryProps
export type LatheBufferGeometryProps = ReactThreeFiber.LatheBufferGeometryProps
export type OctahedronBufferGeometryProps = ReactThreeFiber.OctahedronBufferGeometryProps
export type ParametricBufferGeometryProps = ReactThreeFiber.ParametricBufferGeometryProps
export type PlaneBufferGeometryProps = ReactThreeFiber.PlaneBufferGeometryProps
export type PolyhedronBufferGeometryProps = ReactThreeFiber.PolyhedronBufferGeometryProps
export type RingBufferGeometryProps = ReactThreeFiber.RingBufferGeometryProps
export type ShapeBufferGeometryProps = ReactThreeFiber.ShapeBufferGeometryProps
export type SphereBufferGeometryProps = ReactThreeFiber.SphereBufferGeometryProps
export type TetrahedronBufferGeometryProps = ReactThreeFiber.TetrahedronBufferGeometryProps
export type TextBufferGeometryProps = ReactThreeFiber.TextBufferGeometryProps
export type TorusBufferGeometryProps = ReactThreeFiber.TorusBufferGeometryProps
export type TorusKnotBufferGeometryProps = ReactThreeFiber.TorusKnotBufferGeometryProps
export type TubeBufferGeometryProps = ReactThreeFiber.TubeBufferGeometryProps
export type WireframeGeometryProps = ReactThreeFiber.WireframeGeometryProps
export type ParametricGeometryProps = ReactThreeFiber.ParametricGeometryProps
export type TetrahedronGeometryProps = ReactThreeFiber.TetrahedronGeometryProps
export type OctahedronGeometryProps = ReactThreeFiber.OctahedronGeometryProps
export type IcosahedronGeometryProps = ReactThreeFiber.IcosahedronGeometryProps
export type DodecahedronGeometryProps = ReactThreeFiber.DodecahedronGeometryProps
export type PolyhedronGeometryProps = ReactThreeFiber.PolyhedronGeometryProps
export type TubeGeometryProps = ReactThreeFiber.TubeGeometryProps
export type TorusKnotGeometryProps = ReactThreeFiber.TorusKnotGeometryProps
export type TorusGeometryProps = ReactThreeFiber.TorusGeometryProps
export type TextGeometryProps = ReactThreeFiber.TextGeometryProps
export type SphereGeometryProps = ReactThreeFiber.SphereGeometryProps
export type RingGeometryProps = ReactThreeFiber.RingGeometryProps
export type PlaneGeometryProps = ReactThreeFiber.PlaneGeometryProps
export type LatheGeometryProps = ReactThreeFiber.LatheGeometryProps
export type ShapeGeometryProps = ReactThreeFiber.ShapeGeometryProps
export type ExtrudeGeometryProps = ReactThreeFiber.ExtrudeGeometryProps
export type EdgesGeometryProps = ReactThreeFiber.EdgesGeometryProps
export type ConeGeometryProps = ReactThreeFiber.ConeGeometryProps
export type CylinderGeometryProps = ReactThreeFiber.CylinderGeometryProps
export type CircleGeometryProps = ReactThreeFiber.CircleGeometryProps
export type BoxGeometryProps = ReactThreeFiber.BoxGeometryProps
export type MaterialProps = ReactThreeFiber.MaterialProps
export type ShadowMaterialProps = ReactThreeFiber.ShadowMaterialProps
export type SpriteMaterialProps = ReactThreeFiber.SpriteMaterialProps
export type RawShaderMaterialProps = ReactThreeFiber.RawShaderMaterialProps
export type ShaderMaterialProps = ReactThreeFiber.ShaderMaterialProps
export type PointsMaterialProps = ReactThreeFiber.PointsMaterialProps
export type MeshPhysicalMaterialProps = ReactThreeFiber.MeshPhysicalMaterialProps
export type MeshStandardMaterialProps = ReactThreeFiber.MeshStandardMaterialProps
export type MeshPhongMaterialProps = ReactThreeFiber.MeshPhongMaterialProps
export type MeshToonMaterialProps = ReactThreeFiber.MeshToonMaterialProps
export type MeshNormalMaterialProps = ReactThreeFiber.MeshNormalMaterialProps
export type MeshLambertMaterialProps = ReactThreeFiber.MeshLambertMaterialProps
export type MeshDepthMaterialProps = ReactThreeFiber.MeshDepthMaterialProps
export type MeshDistanceMaterialProps = ReactThreeFiber.MeshDistanceMaterialProps
export type MeshBasicMaterialProps = ReactThreeFiber.MeshBasicMaterialProps
export type MeshMatcapMaterialProps = ReactThreeFiber.MeshMatcapMaterialProps
export type LineDashedMaterialProps = ReactThreeFiber.LineDashedMaterialProps
export type LineBasicMaterialProps = ReactThreeFiber.LineBasicMaterialProps
export type PrimitiveProps = ReactThreeFiber.PrimitiveProps
export type LightProps = ReactThreeFiber.LightProps
export type SpotLightShadowProps = ReactThreeFiber.SpotLightShadowProps
export type SpotLightProps = ReactThreeFiber.SpotLightProps
export type PointLightProps = ReactThreeFiber.PointLightProps
export type RectAreaLightProps = ReactThreeFiber.RectAreaLightProps
export type HemisphereLightProps = ReactThreeFiber.HemisphereLightProps
export type DirectionalLightShadowProps = ReactThreeFiber.DirectionalLightShadowProps
export type DirectionalLightProps = ReactThreeFiber.DirectionalLightProps
export type AmbientLightProps = ReactThreeFiber.AmbientLightProps
export type LightShadowProps = ReactThreeFiber.LightShadowProps
export type AmbientLightProbeProps = ReactThreeFiber.AmbientLightProbeProps
export type HemisphereLightProbeProps = ReactThreeFiber.HemisphereLightProbeProps
export type LightProbeProps = ReactThreeFiber.LightProbeProps
export type SpotLightHelperProps = ReactThreeFiber.SpotLightHelperProps
export type SkeletonHelperProps = ReactThreeFiber.SkeletonHelperProps
export type PointLightHelperProps = ReactThreeFiber.PointLightHelperProps
export type HemisphereLightHelperProps = ReactThreeFiber.HemisphereLightHelperProps
export type GridHelperProps = ReactThreeFiber.GridHelperProps
export type PolarGridHelperProps = ReactThreeFiber.PolarGridHelperProps
export type DirectionalLightHelperProps = ReactThreeFiber.DirectionalLightHelperProps
export type CameraHelperProps = ReactThreeFiber.CameraHelperProps
export type BoxHelperProps = ReactThreeFiber.BoxHelperProps
export type Box3HelperProps = ReactThreeFiber.Box3HelperProps
export type PlaneHelperProps = ReactThreeFiber.PlaneHelperProps
export type ArrowHelperProps = ReactThreeFiber.ArrowHelperProps
export type AxesHelperProps = ReactThreeFiber.AxesHelperProps
export type TextureProps = ReactThreeFiber.TextureProps
export type VideoTextureProps = ReactThreeFiber.VideoTextureProps
export type DataTextureProps = ReactThreeFiber.DataTextureProps
export type DataTexture3DProps = ReactThreeFiber.DataTexture3DProps
export type CompressedTextureProps = ReactThreeFiber.CompressedTextureProps
export type CubeTextureProps = ReactThreeFiber.CubeTextureProps
export type CanvasTextureProps = ReactThreeFiber.CanvasTextureProps
export type DepthTextureProps = ReactThreeFiber.DepthTextureProps
export type RaycasterProps = ReactThreeFiber.RaycasterProps
export type Vector2Props = ReactThreeFiber.Vector2Props
export type Vector3Props = ReactThreeFiber.Vector3Props
export type Vector4Props = ReactThreeFiber.Vector4Props
export type EulerProps = ReactThreeFiber.EulerProps
export type Matrix3Props = ReactThreeFiber.Matrix3Props
export type Matrix4Props = ReactThreeFiber.Matrix4Props
export type QuaternionProps = ReactThreeFiber.QuaternionProps
export type BufferAttributeProps = ReactThreeFiber.BufferAttributeProps
export type InstancedBufferAttributeProps = ReactThreeFiber.InstancedBufferAttributeProps
export type Face3Props = ReactThreeFiber.Face3Props
export type ColorProps = ReactThreeFiber.ColorProps
export type FogProps = ReactThreeFiber.FogProps

export declare namespace ReactThreeFiber {
  type Euler = THREE.Euler | Parameters<THREE.Euler['set']>
  type Matrix4 = THREE.Matrix4 | Parameters<THREE.Matrix4['set']>
  type Vector2 = THREE.Vector2 | Parameters<THREE.Vector2['set']>
  type Vector3 = THREE.Vector3 | Parameters<THREE.Vector3['set']>
  type Color = THREE.Color | number | string // Parameters<T> will not work here because of multiple function signatures in three.js types
  type Layers = THREE.Layers | Parameters<THREE.Layers['set']>
  type Quaternion = THREE.Quaternion | Parameters<THREE.Quaternion['set']>

  type EventHandlers = {
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

  interface NodeProps<T, P> {
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

  type Node<T, P> = Overwrite<Partial<T>, NodeProps<T, P>>

  type Object3DNode<T, P> = Overwrite<
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

  type GeometryNode<T extends THREE.Geometry, P> = Overwrite<Node<T, P>, { vertices?: Vector3[] }>
  type BufferGeometryNode<T extends THREE.BufferGeometry, P> = Overwrite<Node<T, P>, {}>
  type MaterialNode<T extends THREE.Material, P> = Overwrite<Node<T, P>, { color?: Color }>
  type LightNode<T extends THREE.Light, P> = Overwrite<Object3DNode<T, P>, { color?: Color }>

  // type AudioProps = Object3DNode<THREE.Audio, typeof THREE.Audio>
  type AudioListenerProps = Object3DNode<THREE.AudioListener, typeof THREE.AudioListener>
  type PositionalAudioProps = Object3DNode<THREE.PositionalAudio, typeof THREE.PositionalAudio>

  type MeshProps = Object3DNode<THREE.Mesh, typeof THREE.Mesh>
  type InstancedMeshProps = Object3DNode<THREE.InstancedMesh, typeof THREE.InstancedMesh>
  type SceneProps = Object3DNode<THREE.Scene, typeof THREE.Scene>
  type SpriteProps = Object3DNode<THREE.Sprite, typeof THREE.Sprite>
  type LODProps = Object3DNode<THREE.LOD, typeof THREE.LOD>
  type SkinnedMeshProps = Object3DNode<THREE.SkinnedMesh, typeof THREE.SkinnedMesh>

  type SkeletonProps = Object3DNode<THREE.Skeleton, typeof THREE.Skeleton>
  type BoneProps = Object3DNode<THREE.Bone, typeof THREE.Bone>
  type LineSegmentsProps = Object3DNode<THREE.LineSegments, typeof THREE.LineSegments>
  type LineLoopProps = Object3DNode<THREE.LineLoop, typeof THREE.LineLoop>
  // type LineProps = Object3DNode<THREE.Line, typeof THREE.Line>
  type PointsProps = Object3DNode<THREE.Points, typeof THREE.Points>
  type GroupProps = Object3DNode<THREE.Group, typeof THREE.Group>
  type ImmediateRenderObjectProps = Object3DNode<THREE.ImmediateRenderObject, typeof THREE.ImmediateRenderObject>

  type CameraProps = Object3DNode<THREE.Camera, typeof THREE.Camera>
  type PerspectiveCameraProps = Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera>
  type OrthographicCameraProps = Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
  type CubeCameraProps = Object3DNode<THREE.CubeCamera, typeof THREE.CubeCamera>
  type ArrayCameraProps = Object3DNode<THREE.ArrayCamera, typeof THREE.ArrayCamera>

  type GeometryProps = GeometryNode<THREE.Geometry, typeof THREE.Geometry>
  type InstancedBufferGeometryProps = BufferGeometryNode<
    THREE.InstancedBufferGeometry,
    typeof THREE.InstancedBufferGeometry
  >
  type BufferGeometryProps = BufferGeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>
  type BoxBufferGeometryProps = BufferGeometryNode<THREE.BoxBufferGeometry, typeof THREE.BoxBufferGeometry>
  type CircleBufferGeometryProps = BufferGeometryNode<THREE.CircleBufferGeometry, typeof THREE.CircleBufferGeometry>
  type ConeBufferGeometryProps = BufferGeometryNode<THREE.ConeBufferGeometry, typeof THREE.ConeBufferGeometry>
  type CylinderBufferGeometryProps = BufferGeometryNode<
    THREE.CylinderBufferGeometry,
    typeof THREE.CylinderBufferGeometry
  >
  type DodecahedronBufferGeometryProps = BufferGeometryNode<
    THREE.DodecahedronBufferGeometry,
    typeof THREE.DodecahedronBufferGeometry
  >
  type ExtrudeBufferGeometryProps = BufferGeometryNode<THREE.ExtrudeBufferGeometry, typeof THREE.ExtrudeBufferGeometry>
  type IcosahedronBufferGeometryProps = BufferGeometryNode<
    THREE.IcosahedronBufferGeometry,
    typeof THREE.IcosahedronBufferGeometry
  >
  type LatheBufferGeometryProps = BufferGeometryNode<THREE.LatheBufferGeometry, typeof THREE.LatheBufferGeometry>
  type OctahedronBufferGeometryProps = BufferGeometryNode<
    THREE.OctahedronBufferGeometry,
    typeof THREE.OctahedronBufferGeometry
  >
  type ParametricBufferGeometryProps = BufferGeometryNode<
    THREE.ParametricBufferGeometry,
    typeof THREE.ParametricBufferGeometry
  >
  type PlaneBufferGeometryProps = BufferGeometryNode<THREE.PlaneBufferGeometry, typeof THREE.PlaneBufferGeometry>
  type PolyhedronBufferGeometryProps = BufferGeometryNode<
    THREE.PolyhedronBufferGeometry,
    typeof THREE.PolyhedronBufferGeometry
  >
  type RingBufferGeometryProps = BufferGeometryNode<THREE.RingBufferGeometry, typeof THREE.RingBufferGeometry>
  type ShapeBufferGeometryProps = BufferGeometryNode<THREE.ShapeBufferGeometry, typeof THREE.ShapeBufferGeometry>
  type SphereBufferGeometryProps = BufferGeometryNode<THREE.SphereBufferGeometry, typeof THREE.SphereBufferGeometry>
  type TetrahedronBufferGeometryProps = BufferGeometryNode<
    THREE.TetrahedronBufferGeometry,
    typeof THREE.TetrahedronBufferGeometry
  >
  type TextBufferGeometryProps = BufferGeometryNode<THREE.TextBufferGeometry, typeof THREE.TextBufferGeometry>
  type TorusBufferGeometryProps = BufferGeometryNode<THREE.TorusBufferGeometry, typeof THREE.TorusBufferGeometry>
  type TorusKnotBufferGeometryProps = BufferGeometryNode<
    THREE.TorusKnotBufferGeometry,
    typeof THREE.TorusKnotBufferGeometry
  >
  type TubeBufferGeometryProps = BufferGeometryNode<THREE.TubeBufferGeometry, typeof THREE.TubeBufferGeometry>
  type WireframeGeometryProps = BufferGeometryNode<THREE.WireframeGeometry, typeof THREE.WireframeGeometry>
  type ParametricGeometryProps = GeometryNode<THREE.ParametricGeometry, typeof THREE.ParametricGeometry>
  type TetrahedronGeometryProps = GeometryNode<THREE.TetrahedronGeometry, typeof THREE.TetrahedronGeometry>
  type OctahedronGeometryProps = GeometryNode<THREE.OctahedronGeometry, typeof THREE.OctahedronGeometry>
  type IcosahedronGeometryProps = GeometryNode<THREE.IcosahedronGeometry, typeof THREE.IcosahedronGeometry>
  type DodecahedronGeometryProps = GeometryNode<THREE.DodecahedronGeometry, typeof THREE.DodecahedronGeometry>
  type PolyhedronGeometryProps = GeometryNode<THREE.PolyhedronGeometry, typeof THREE.PolyhedronGeometry>
  type TubeGeometryProps = GeometryNode<THREE.TubeGeometry, typeof THREE.TubeGeometry>
  type TorusKnotGeometryProps = GeometryNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>
  type TorusGeometryProps = GeometryNode<THREE.TorusGeometry, typeof THREE.TorusGeometry>
  type TextGeometryProps = GeometryNode<THREE.TextGeometry, typeof THREE.TextGeometry>
  type SphereGeometryProps = GeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
  type RingGeometryProps = GeometryNode<THREE.RingGeometry, typeof THREE.RingGeometry>
  type PlaneGeometryProps = GeometryNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
  type LatheGeometryProps = GeometryNode<THREE.LatheGeometry, typeof THREE.LatheGeometry>
  type ShapeGeometryProps = GeometryNode<THREE.ShapeGeometry, typeof THREE.ShapeGeometry>
  type ExtrudeGeometryProps = GeometryNode<THREE.ExtrudeGeometry, typeof THREE.ExtrudeGeometry>
  type EdgesGeometryProps = BufferGeometryNode<THREE.EdgesGeometry, typeof THREE.EdgesGeometry>
  type ConeGeometryProps = GeometryNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>
  type CylinderGeometryProps = GeometryNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
  type CircleGeometryProps = GeometryNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>
  type BoxGeometryProps = GeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>

  type MaterialProps = MaterialNode<THREE.Material, [THREE.MaterialParameters]>
  type ShadowMaterialProps = MaterialNode<THREE.ShadowMaterial, [THREE.ShaderMaterialParameters]>
  type SpriteMaterialProps = MaterialNode<THREE.SpriteMaterial, [THREE.SpriteMaterialParameters]>
  type RawShaderMaterialProps = MaterialNode<THREE.RawShaderMaterial, [THREE.ShaderMaterialParameters]>
  type ShaderMaterialProps = MaterialNode<THREE.ShaderMaterial, [THREE.ShaderMaterialParameters]>
  type PointsMaterialProps = MaterialNode<THREE.PointsMaterial, [THREE.PointsMaterialParameters]>
  type MeshPhysicalMaterialProps = MaterialNode<THREE.MeshPhysicalMaterial, [THREE.MeshPhysicalMaterialParameters]>
  type MeshStandardMaterialProps = MaterialNode<THREE.MeshStandardMaterial, [THREE.MeshStandardMaterialParameters]>
  type MeshPhongMaterialProps = MaterialNode<THREE.MeshPhongMaterial, [THREE.MeshPhongMaterialParameters]>
  type MeshToonMaterialProps = MaterialNode<THREE.MeshToonMaterial, [THREE.MeshToonMaterialParameters]>
  type MeshNormalMaterialProps = MaterialNode<THREE.MeshNormalMaterial, [THREE.MeshNormalMaterialParameters]>
  type MeshLambertMaterialProps = MaterialNode<THREE.MeshLambertMaterial, [THREE.MeshLambertMaterialParameters]>
  type MeshDepthMaterialProps = MaterialNode<THREE.MeshDepthMaterial, [THREE.MeshDepthMaterialParameters]>
  type MeshDistanceMaterialProps = MaterialNode<THREE.MeshDistanceMaterial, [THREE.MeshDistanceMaterialParameters]>
  type MeshBasicMaterialProps = MaterialNode<THREE.MeshBasicMaterial, [THREE.MeshBasicMaterialParameters]>
  type MeshMatcapMaterialProps = MaterialNode<THREE.MeshMatcapMaterial, [THREE.MeshMatcapMaterialParameters]>
  type LineDashedMaterialProps = MaterialNode<THREE.LineDashedMaterial, [THREE.LineDashedMaterialParameters]>
  type LineBasicMaterialProps = MaterialNode<THREE.LineBasicMaterial, [THREE.LineBasicMaterialParameters]>

  type PrimitiveProps = { object: any } & { [properties: string]: any }

  type LightProps = LightNode<THREE.Light, typeof THREE.Light>
  type SpotLightShadowProps = Node<THREE.SpotLightShadow, typeof THREE.SpotLightShadow>
  type SpotLightProps = LightNode<THREE.SpotLight, typeof THREE.SpotLight>
  type PointLightProps = LightNode<THREE.PointLight, typeof THREE.PointLight>
  type RectAreaLightProps = LightNode<THREE.RectAreaLight, typeof THREE.RectAreaLight>
  type HemisphereLightProps = LightNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>
  type DirectionalLightShadowProps = Node<THREE.DirectionalLightShadow, typeof THREE.DirectionalLightShadow>
  type DirectionalLightProps = LightNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
  type AmbientLightProps = LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
  type LightShadowProps = Node<THREE.LightShadow, typeof THREE.LightShadow>
  type AmbientLightProbeProps = LightNode<THREE.AmbientLightProbe, typeof THREE.AmbientLightProbe>
  type HemisphereLightProbeProps = LightNode<THREE.HemisphereLightProbe, typeof THREE.HemisphereLightProbe>
  type LightProbeProps = LightNode<THREE.LightProbe, typeof THREE.LightProbe>

  type SpotLightHelperProps = Object3DNode<THREE.SpotLightHelper, typeof THREE.SpotLightHelper>
  type SkeletonHelperProps = Object3DNode<THREE.SkeletonHelper, typeof THREE.SkeletonHelper>
  type PointLightHelperProps = Object3DNode<THREE.PointLightHelper, typeof THREE.PointLightHelper>
  type HemisphereLightHelperProps = Object3DNode<THREE.HemisphereLightHelper, typeof THREE.HemisphereLightHelper>
  type GridHelperProps = Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>
  type PolarGridHelperProps = Object3DNode<THREE.PolarGridHelper, typeof THREE.PolarGridHelper>
  type DirectionalLightHelperProps = Object3DNode<THREE.DirectionalLightHelper, typeof THREE.DirectionalLightHelper>
  type CameraHelperProps = Object3DNode<THREE.CameraHelper, typeof THREE.CameraHelper>
  type BoxHelperProps = Object3DNode<THREE.BoxHelper, typeof THREE.BoxHelper>
  type Box3HelperProps = Object3DNode<THREE.Box3Helper, typeof THREE.Box3Helper>
  type PlaneHelperProps = Object3DNode<THREE.PlaneHelper, typeof THREE.PlaneHelper>
  type ArrowHelperProps = Object3DNode<THREE.ArrowHelper, typeof THREE.ArrowHelper>
  type AxesHelperProps = Object3DNode<THREE.AxesHelper, typeof THREE.AxesHelper>

  type TextureProps = Node<THREE.Texture, typeof THREE.Texture>
  type VideoTextureProps = Node<THREE.VideoTexture, typeof THREE.VideoTexture>
  type DataTextureProps = Node<THREE.DataTexture, typeof THREE.DataTexture>
  type DataTexture3DProps = Node<THREE.DataTexture3D, typeof THREE.DataTexture3D>
  type CompressedTextureProps = Node<THREE.CompressedTexture, typeof THREE.CompressedTexture>
  type CubeTextureProps = Node<THREE.CubeTexture, typeof THREE.CubeTexture>
  type CanvasTextureProps = Node<THREE.CanvasTexture, typeof THREE.CanvasTexture>
  type DepthTextureProps = Node<THREE.DepthTexture, typeof THREE.DepthTexture>

  type RaycasterProps = Node<THREE.Raycaster, typeof THREE.Raycaster>
  type Vector2Props = Node<THREE.Vector2, typeof THREE.Vector2>
  type Vector3Props = Node<THREE.Vector3, typeof THREE.Vector3>
  type Vector4Props = Node<THREE.Vector4, typeof THREE.Vector4>
  type EulerProps = Node<THREE.Euler, typeof THREE.Euler>
  type Matrix3Props = Node<THREE.Matrix3, typeof THREE.Matrix3>
  type Matrix4Props = Node<THREE.Matrix4, typeof THREE.Matrix4>
  type QuaternionProps = Node<THREE.Quaternion, typeof THREE.Quaternion>
  type BufferAttributeProps = Node<THREE.BufferAttribute, typeof THREE.BufferAttribute>
  type InstancedBufferAttributeProps = Node<THREE.InstancedBufferAttribute, typeof THREE.InstancedBufferAttribute>
  type Face3Props = Node<THREE.Face3, typeof THREE.Face3>
  type ColorProps = Node<THREE.Color, typeof THREE.Color>
  type FogProps = Node<THREE.Fog, typeof THREE.Fog>
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // `audio` works but conflicts with @types/react. Try using Audio from react-three-fiber/components instead
      // audio: AudioProps
      audioListener: AudioListenerProps
      positionalAudio: PositionalAudioProps

      mesh: MeshProps
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
      immediateRenderObject: ImmediateRenderObjectProps

      // cameras
      camera: CameraProps
      perspectiveCamera: PerspectiveCameraProps
      orthographicCamera: OrthographicCameraProps
      cubeCamera: CubeCameraProps
      arrayCamera: ArrayCameraProps

      // geometry
      geometry: GeometryProps
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
      parametricBufferGeometry: ParametricBufferGeometryProps
      planeBufferGeometry: PlaneBufferGeometryProps
      polyhedronBufferGeometry: PolyhedronBufferGeometryProps
      ringBufferGeometry: RingBufferGeometryProps
      shapeBufferGeometry: ShapeBufferGeometryProps
      sphereBufferGeometry: SphereBufferGeometryProps
      tetrahedronBufferGeometry: TetrahedronBufferGeometryProps
      textBufferGeometry: TextBufferGeometryProps
      torusBufferGeometry: TorusBufferGeometryProps
      torusKnotBufferGeometry: TorusKnotBufferGeometryProps
      tubeBufferGeometry: TubeBufferGeometryProps
      wireframeGeometry: WireframeGeometryProps
      parametricGeometry: ParametricGeometryProps
      tetrahedronGeometry: TetrahedronGeometryProps
      octahedronGeometry: OctahedronGeometryProps
      icosahedronGeometry: IcosahedronGeometryProps
      dodecahedronGeometry: DodecahedronGeometryProps
      polyhedronGeometry: PolyhedronGeometryProps
      tubeGeometry: TubeGeometryProps
      torusKnotGeometry: TorusKnotGeometryProps
      torusGeometry: TorusGeometryProps
      textGeometry: TextGeometryProps
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
      instancedBufferAttribute: InstancedBufferAttributeProps
      face3: Face3Props
      color: ColorProps
      fog: FogProps
    }
  }
}
