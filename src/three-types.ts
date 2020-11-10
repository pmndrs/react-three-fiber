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

  // `audio` works but conflicts with @types/react. Try using Audio from react-three-fiber/components instead
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
  // see `audio`
  // type LineProps = Object3DNode<THREE.Line, typeof THREE.Line>
  type PointsProps = Object3DNode<THREE.Points, typeof THREE.Points>
  type GroupProps = Object3DNode<THREE.Group, typeof THREE.Group>
  type ImmediateRenderObjectProps = Object3DNode<THREE.ImmediateRenderObject, typeof THREE.ImmediateRenderObject>

  // cameras
  type CameraProps = Object3DNode<THREE.Camera, typeof THREE.Camera>
  type PerspectiveCameraProps = Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera>
  type OrthographicCameraProps = Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
  type CubeCameraProps = Object3DNode<THREE.CubeCamera, typeof THREE.CubeCamera>
  type ArrayCameraProps = Object3DNode<THREE.ArrayCamera, typeof THREE.ArrayCamera>

  // geometry
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

  // materials
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

  // primitive
  type PrimitiveProps = { object: any } & { [properties: string]: any }

  // lights and other
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

  // helpers
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

  // textures
  type TextureProps = Node<THREE.Texture, typeof THREE.Texture>
  type VideoTextureProps = Node<THREE.VideoTexture, typeof THREE.VideoTexture>
  type DataTextureProps = Node<THREE.DataTexture, typeof THREE.DataTexture>
  type DataTexture3DProps = Node<THREE.DataTexture3D, typeof THREE.DataTexture3D>
  type CompressedTextureProps = Node<THREE.CompressedTexture, typeof THREE.CompressedTexture>
  type CubeTextureProps = Node<THREE.CubeTexture, typeof THREE.CubeTexture>
  type CanvasTextureProps = Node<THREE.CanvasTexture, typeof THREE.CanvasTexture>
  type DepthTextureProps = Node<THREE.DepthTexture, typeof THREE.DepthTexture>

  // misc
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
      // audio: ReactThreeFiber.AudioProps
      audioListener: ReactThreeFiber.AudioListenerProps
      positionalAudio: ReactThreeFiber.PositionalAudioProps

      mesh: ReactThreeFiber.MeshProps
      instancedMesh: ReactThreeFiber.InstancedMeshProps
      scene: ReactThreeFiber.SceneProps
      sprite: ReactThreeFiber.SpriteProps
      lOD: ReactThreeFiber.LODProps
      skinnedMesh: ReactThreeFiber.SkinnedMeshProps
      skeleton: ReactThreeFiber.SkeletonProps
      bone: ReactThreeFiber.BoneProps
      lineSegments: ReactThreeFiber.LineSegmentsProps
      lineLoop: ReactThreeFiber.LineLoopProps
      // see `audio`
      // line: ReactThreeFiber.LineProps
      points: ReactThreeFiber.PointsProps
      group: ReactThreeFiber.GroupProps
      immediateRenderObject: ReactThreeFiber.ImmediateRenderObjectProps

      // cameras
      camera: ReactThreeFiber.CameraProps
      perspectiveCamera: ReactThreeFiber.PerspectiveCameraProps
      orthographicCamera: ReactThreeFiber.OrthographicCameraProps
      cubeCamera: ReactThreeFiber.CubeCameraProps
      arrayCamera: ReactThreeFiber.ArrayCameraProps

      // geometry
      geometry: ReactThreeFiber.GeometryProps
      instancedBufferGeometry: ReactThreeFiber.InstancedBufferGeometryProps
      bufferGeometry: ReactThreeFiber.BufferGeometryProps
      boxBufferGeometry: ReactThreeFiber.BoxBufferGeometryProps
      circleBufferGeometry: ReactThreeFiber.CircleBufferGeometryProps
      coneBufferGeometry: ReactThreeFiber.ConeBufferGeometryProps
      cylinderBufferGeometry: ReactThreeFiber.CylinderBufferGeometryProps
      dodecahedronBufferGeometry: ReactThreeFiber.DodecahedronBufferGeometryProps
      extrudeBufferGeometry: ReactThreeFiber.ExtrudeBufferGeometryProps
      icosahedronBufferGeometry: ReactThreeFiber.IcosahedronBufferGeometryProps
      latheBufferGeometry: ReactThreeFiber.LatheBufferGeometryProps
      octahedronBufferGeometry: ReactThreeFiber.OctahedronBufferGeometryProps
      parametricBufferGeometry: ReactThreeFiber.ParametricBufferGeometryProps
      planeBufferGeometry: ReactThreeFiber.PlaneBufferGeometryProps
      polyhedronBufferGeometry: ReactThreeFiber.PolyhedronBufferGeometryProps
      ringBufferGeometry: ReactThreeFiber.RingBufferGeometryProps
      shapeBufferGeometry: ReactThreeFiber.ShapeBufferGeometryProps
      sphereBufferGeometry: ReactThreeFiber.SphereBufferGeometryProps
      tetrahedronBufferGeometry: ReactThreeFiber.TetrahedronBufferGeometryProps
      textBufferGeometry: ReactThreeFiber.TextBufferGeometryProps
      torusBufferGeometry: ReactThreeFiber.TorusBufferGeometryProps
      torusKnotBufferGeometry: ReactThreeFiber.TorusKnotBufferGeometryProps
      tubeBufferGeometry: ReactThreeFiber.TubeBufferGeometryProps
      wireframeGeometry: ReactThreeFiber.WireframeGeometryProps
      parametricGeometry: ReactThreeFiber.ParametricGeometryProps
      tetrahedronGeometry: ReactThreeFiber.TetrahedronGeometryProps
      octahedronGeometry: ReactThreeFiber.OctahedronGeometryProps
      icosahedronGeometry: ReactThreeFiber.IcosahedronGeometryProps
      dodecahedronGeometry: ReactThreeFiber.DodecahedronGeometryProps
      polyhedronGeometry: ReactThreeFiber.PolyhedronGeometryProps
      tubeGeometry: ReactThreeFiber.TubeGeometryProps
      torusKnotGeometry: ReactThreeFiber.TorusKnotGeometryProps
      torusGeometry: ReactThreeFiber.TorusGeometryProps
      textGeometry: ReactThreeFiber.TextGeometryProps
      sphereGeometry: ReactThreeFiber.SphereGeometryProps
      ringGeometry: ReactThreeFiber.RingGeometryProps
      planeGeometry: ReactThreeFiber.PlaneGeometryProps
      latheGeometry: ReactThreeFiber.LatheGeometryProps
      shapeGeometry: ReactThreeFiber.ShapeGeometryProps
      extrudeGeometry: ReactThreeFiber.ExtrudeGeometryProps
      edgesGeometry: ReactThreeFiber.EdgesGeometryProps
      coneGeometry: ReactThreeFiber.ConeGeometryProps
      cylinderGeometry: ReactThreeFiber.CylinderGeometryProps
      circleGeometry: ReactThreeFiber.CircleGeometryProps
      boxGeometry: ReactThreeFiber.BoxGeometryProps

      // materials
      material: ReactThreeFiber.MaterialProps
      shadowMaterial: ReactThreeFiber.ShadowMaterialProps
      spriteMaterial: ReactThreeFiber.SpriteMaterialProps
      rawShaderMaterial: ReactThreeFiber.RawShaderMaterialProps
      shaderMaterial: ReactThreeFiber.ShaderMaterialProps
      pointsMaterial: ReactThreeFiber.PointsMaterialProps
      meshPhysicalMaterial: ReactThreeFiber.MeshPhysicalMaterialProps
      meshStandardMaterial: ReactThreeFiber.MeshStandardMaterialProps
      meshPhongMaterial: ReactThreeFiber.MeshPhongMaterialProps
      meshToonMaterial: ReactThreeFiber.MeshToonMaterialProps
      meshNormalMaterial: ReactThreeFiber.MeshNormalMaterialProps
      meshLambertMaterial: ReactThreeFiber.MeshLambertMaterialProps
      meshDepthMaterial: ReactThreeFiber.MeshDepthMaterialProps
      meshDistanceMaterial: ReactThreeFiber.MeshDistanceMaterialProps
      meshBasicMaterial: ReactThreeFiber.MeshBasicMaterialProps
      meshMatcapMaterial: ReactThreeFiber.MeshMatcapMaterialProps
      lineDashedMaterial: ReactThreeFiber.LineDashedMaterialProps
      lineBasicMaterial: ReactThreeFiber.LineBasicMaterialProps

      // primitive
      primitive: ReactThreeFiber.PrimitiveProps

      // lights and other
      light: ReactThreeFiber.LightProps
      spotLightShadow: ReactThreeFiber.SpotLightShadowProps
      spotLight: ReactThreeFiber.SpotLightProps
      pointLight: ReactThreeFiber.PointLightProps
      rectAreaLight: ReactThreeFiber.RectAreaLightProps
      hemisphereLight: ReactThreeFiber.HemisphereLightProps
      directionalLightShadow: ReactThreeFiber.DirectionalLightShadowProps
      directionalLight: ReactThreeFiber.DirectionalLightProps
      ambientLight: ReactThreeFiber.AmbientLightProps
      lightShadow: ReactThreeFiber.LightShadowProps
      ambientLightProbe: ReactThreeFiber.AmbientLightProbeProps
      hemisphereLightProbe: ReactThreeFiber.HemisphereLightProbeProps
      lightProbe: ReactThreeFiber.LightProbeProps

      // helpers
      spotLightHelper: ReactThreeFiber.SpotLightHelperProps
      skeletonHelper: ReactThreeFiber.SkeletonHelperProps
      pointLightHelper: ReactThreeFiber.PointLightHelperProps
      hemisphereLightHelper: ReactThreeFiber.HemisphereLightHelperProps
      gridHelper: ReactThreeFiber.GridHelperProps
      polarGridHelper: ReactThreeFiber.PolarGridHelperProps
      directionalLightHelper: ReactThreeFiber.DirectionalLightHelperProps
      cameraHelper: ReactThreeFiber.CameraHelperProps
      boxHelper: ReactThreeFiber.BoxHelperProps
      box3Helper: ReactThreeFiber.Box3HelperProps
      planeHelper: ReactThreeFiber.PlaneHelperProps
      arrowHelper: ReactThreeFiber.ArrowHelperProps
      axesHelper: ReactThreeFiber.AxesHelperProps

      // textures
      texture: ReactThreeFiber.TextureProps
      videoTexture: ReactThreeFiber.VideoTextureProps
      dataTexture: ReactThreeFiber.DataTextureProps
      dataTexture3D: ReactThreeFiber.DataTexture3DProps
      compressedTexture: ReactThreeFiber.CompressedTextureProps
      cubeTexture: ReactThreeFiber.CubeTextureProps
      canvasTexture: ReactThreeFiber.CanvasTextureProps
      depthTexture: ReactThreeFiber.DepthTextureProps

      // misc
      raycaster: ReactThreeFiber.RaycasterProps
      vector2: ReactThreeFiber.Vector2Props
      vector3: ReactThreeFiber.Vector3Props
      vector4: ReactThreeFiber.Vector4Props
      euler: ReactThreeFiber.EulerProps
      matrix3: ReactThreeFiber.Matrix3Props
      matrix4: ReactThreeFiber.Matrix4Props
      quaternion: ReactThreeFiber.QuaternionProps
      bufferAttribute: ReactThreeFiber.BufferAttributeProps
      instancedBufferAttribute: ReactThreeFiber.InstancedBufferAttributeProps
      face3: ReactThreeFiber.Face3Props
      color: ReactThreeFiber.ColorProps
      fog: ReactThreeFiber.FogProps
    }
  }
}
