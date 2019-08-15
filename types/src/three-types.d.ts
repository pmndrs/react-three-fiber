/// <reference types="react" />
import * as THREE from 'three'
import { PointerEvent } from './canvas'
export declare type NonFunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
export declare type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O
declare type Args<T> = T extends (new (...args: any) => any) ? ConstructorParameters<T> : T
export declare namespace ReactThreeFiber {
  type Euler = THREE.Euler | number[]
  type Matrix4 = THREE.Matrix4 | number[]
  type Vector3 = THREE.Vector3 | number[]
  type Color = THREE.Color | number | string
  type Events = {
    onClick?: (e: PointerEvent) => void
    onPointerUp?: (e: PointerEvent) => void
    onPointerDown?: (e: PointerEvent) => void
    onPointerOver?: (e: PointerEvent) => void
    onPointerOut?: (e: PointerEvent) => void
    onPointerMove?: (e: PointerEvent) => void
    onWheel?: (e: PointerEvent) => void
  }
  type Node<T, P> = Overwrite<
    Partial<T>,
    {
      attach?: string
      attachArray?: string
      attachObject?: [string, string]
      args?: Args<P>
      children?: React.ReactNode
      ref?: React.Ref<React.ReactNode>
      key?: React.Key
      onUpdate?: (self: T) => void
    }
  >
  type Object3DNode<T, P> = Overwrite<
    Node<T, P>,
    {
      position?: Vector3
      up?: Vector3
      scale?: Vector3
      rotation?: Euler
      matrix?: Matrix4
    }
  > &
    ReactThreeFiber.Events
  type GeometryNode<T, P> = Overwrite<
    Node<T, P>,
    {
      vertices?: Vector3[]
    }
  >
  type MaterialNode<T, P> = Overwrite<
    Node<T, P>,
    {
      color?: Color
    }
  >
}
declare global {
  namespace JSX {
    interface IntrinsicElements {
      audio: ReactThreeFiber.Object3DNode<THREE.Audio, typeof THREE.Audio>
      audioListener: ReactThreeFiber.Object3DNode<THREE.AudioListener, typeof THREE.AudioListener>
      positionalAudio: ReactThreeFiber.Object3DNode<THREE.PositionalAudio, typeof THREE.PositionalAudio>
      mesh: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      scene: ReactThreeFiber.Object3DNode<THREE.Scene, typeof THREE.Scene>
      sprite: ReactThreeFiber.Object3DNode<THREE.Sprite, typeof THREE.Sprite>
      lOD: ReactThreeFiber.Object3DNode<THREE.LOD, typeof THREE.LOD>
      skinnedMesh: ReactThreeFiber.Object3DNode<THREE.SkinnedMesh, typeof THREE.SkinnedMesh>
      skeleton: ReactThreeFiber.Object3DNode<THREE.Skeleton, typeof THREE.Skeleton>
      bone: ReactThreeFiber.Object3DNode<THREE.Bone, typeof THREE.Bone>
      lineSegments: ReactThreeFiber.Object3DNode<THREE.LineSegments, typeof THREE.LineSegments>
      lineLoop: ReactThreeFiber.Object3DNode<THREE.LineLoop, typeof THREE.LineLoop>
      line: ReactThreeFiber.Object3DNode<THREE.Line, typeof THREE.Line>
      points: ReactThreeFiber.Object3DNode<THREE.Points, typeof THREE.Points>
      group: ReactThreeFiber.Object3DNode<THREE.Group, typeof THREE.Group>
      immediateRenderObject: ReactThreeFiber.Object3DNode<
        THREE.ImmediateRenderObject,
        typeof THREE.ImmediateRenderObject
      >
      camera: ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera>
      perspectiveCamera: ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera>
      orthographicCamera: ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
      cubeCamera: ReactThreeFiber.Object3DNode<THREE.CubeCamera, typeof THREE.CubeCamera>
      arrayCamera: ReactThreeFiber.Object3DNode<THREE.ArrayCamera, typeof THREE.ArrayCamera>
      geometry: ReactThreeFiber.GeometryNode<THREE.Geometry, typeof THREE.Geometry>
      instancedBufferGeometry: ReactThreeFiber.GeometryNode<
        THREE.InstancedBufferGeometry,
        typeof THREE.InstancedBufferGeometry
      >
      bufferGeometry: ReactThreeFiber.GeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>
      wireframeGeometry: ReactThreeFiber.GeometryNode<THREE.WireframeGeometry, typeof THREE.WireframeGeometry>
      parametricGeometry: ReactThreeFiber.GeometryNode<THREE.ParametricGeometry, typeof THREE.ParametricGeometry>
      tetrahedronGeometry: ReactThreeFiber.GeometryNode<THREE.TetrahedronGeometry, typeof THREE.TetrahedronGeometry>
      octahedronGeometry: ReactThreeFiber.GeometryNode<THREE.OctahedronGeometry, typeof THREE.OctahedronGeometry>
      icosahedronGeometry: ReactThreeFiber.GeometryNode<THREE.IcosahedronGeometry, typeof THREE.IcosahedronGeometry>
      dodecahedronGeometry: ReactThreeFiber.GeometryNode<THREE.DodecahedronGeometry, typeof THREE.DodecahedronGeometry>
      polyhedronGeometry: ReactThreeFiber.GeometryNode<THREE.PolyhedronGeometry, typeof THREE.PolyhedronGeometry>
      tubeGeometry: ReactThreeFiber.GeometryNode<THREE.TubeGeometry, typeof THREE.TubeGeometry>
      torusKnotGeometry: ReactThreeFiber.GeometryNode<THREE.TorusKnotGeometry, typeof THREE.TorusKnotGeometry>
      torusGeometry: ReactThreeFiber.GeometryNode<THREE.TorusGeometry, typeof THREE.TorusGeometry>
      textGeometry: ReactThreeFiber.GeometryNode<THREE.TextGeometry, typeof THREE.TextGeometry>
      sphereGeometry: ReactThreeFiber.GeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
      ringGeometry: ReactThreeFiber.GeometryNode<THREE.RingGeometry, typeof THREE.RingGeometry>
      planeGeometry: ReactThreeFiber.GeometryNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
      latheGeometry: ReactThreeFiber.GeometryNode<THREE.LatheGeometry, typeof THREE.LatheGeometry>
      shapeGeometry: ReactThreeFiber.GeometryNode<THREE.ShapeGeometry, typeof THREE.ShapeGeometry>
      extrudeGeometry: ReactThreeFiber.GeometryNode<THREE.ExtrudeGeometry, typeof THREE.ExtrudeGeometry>
      edgesGeometry: ReactThreeFiber.GeometryNode<THREE.EdgesGeometry, typeof THREE.EdgesGeometry>
      coneGeometry: ReactThreeFiber.GeometryNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>
      cylinderGeometry: ReactThreeFiber.GeometryNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
      circleGeometry: ReactThreeFiber.GeometryNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>
      boxGeometry: ReactThreeFiber.GeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
      material: ReactThreeFiber.MaterialNode<THREE.Material, [THREE.MaterialParameters]>
      shadowMaterial: ReactThreeFiber.MaterialNode<THREE.ShadowMaterial, [THREE.ShaderMaterialParameters]>
      spriteMaterial: ReactThreeFiber.MaterialNode<THREE.SpriteMaterial, [THREE.SpriteMaterialParameters]>
      rawShaderMaterial: ReactThreeFiber.MaterialNode<THREE.RawShaderMaterial, [THREE.ShaderMaterialParameters]>
      shaderMaterial: ReactThreeFiber.MaterialNode<THREE.ShaderMaterial, [THREE.ShaderMaterialParameters]>
      pointsMaterial: ReactThreeFiber.MaterialNode<THREE.PointsMaterial, [THREE.PointsMaterialParameters]>
      meshPhysicalMaterial: ReactThreeFiber.MaterialNode<
        THREE.MeshPhysicalMaterial,
        [THREE.MeshPhysicalMaterialParameters]
      >
      meshStandardMaterial: ReactThreeFiber.MaterialNode<
        THREE.MeshStandardMaterial,
        [THREE.MeshStandardMaterialParameters]
      >
      meshPhongMaterial: ReactThreeFiber.MaterialNode<THREE.MeshPhongMaterial, [THREE.MeshPhongMaterialParameters]>
      meshToonMaterial: ReactThreeFiber.MaterialNode<THREE.MeshToonMaterial, [THREE.MeshToonMaterialParameters]>
      meshNormalMaterial: ReactThreeFiber.MaterialNode<THREE.MeshNormalMaterial, [THREE.MeshNormalMaterialParameters]>
      meshLambertMaterial: ReactThreeFiber.MaterialNode<
        THREE.MeshLambertMaterial,
        [THREE.MeshLambertMaterialParameters]
      >
      meshDepthMaterial: ReactThreeFiber.MaterialNode<THREE.MeshDepthMaterial, [THREE.MeshDepthMaterialParameters]>
      meshDistanceMaterial: ReactThreeFiber.MaterialNode<
        THREE.MeshDistanceMaterial,
        [THREE.MeshDistanceMaterialParameters]
      >
      meshBasicMaterial: ReactThreeFiber.MaterialNode<THREE.MeshBasicMaterial, [THREE.MeshBasicMaterialParameters]>
      meshMatcapMaterial: ReactThreeFiber.MaterialNode<THREE.MeshMatcapMaterial, [THREE.MeshMatcapMaterialParameters]>
      lineDashedMaterial: ReactThreeFiber.MaterialNode<THREE.LineDashedMaterial, [THREE.LineDashedMaterialParameters]>
      lineBasicMaterial: ReactThreeFiber.MaterialNode<THREE.LineBasicMaterial, [THREE.LineBasicMaterialParameters]>
      light: ReactThreeFiber.Object3DNode<THREE.Light, typeof THREE.Light>
      spotLightShadow: ReactThreeFiber.Object3DNode<THREE.SpotLightShadow, typeof THREE.SpotLightShadow>
      spotLight: ReactThreeFiber.Object3DNode<THREE.SpotLight, typeof THREE.SpotLight>
      pointLight: ReactThreeFiber.Object3DNode<THREE.PointLight, typeof THREE.PointLight>
      rectAreaLight: ReactThreeFiber.Object3DNode<THREE.RectAreaLight, typeof THREE.RectAreaLight>
      hemisphereLight: ReactThreeFiber.Object3DNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>
      directionalLightShadow: ReactThreeFiber.Object3DNode<
        THREE.DirectionalLightShadow,
        typeof THREE.DirectionalLightShadow
      >
      directionalLight: ReactThreeFiber.Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
      ambientLight: ReactThreeFiber.Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      lightShadow: ReactThreeFiber.Object3DNode<THREE.LightShadow, typeof THREE.LightShadow>
      ambientLightProbe: ReactThreeFiber.Object3DNode<THREE.AmbientLightProbe, typeof THREE.AmbientLightProbe>
      hemisphereLightProbe: ReactThreeFiber.Object3DNode<THREE.HemisphereLightProbe, typeof THREE.HemisphereLightProbe>
      lightProbe: ReactThreeFiber.Object3DNode<THREE.LightProbe, typeof THREE.LightProbe>
      vertexNormalsHelper: ReactThreeFiber.Object3DNode<THREE.VertexNormalsHelper, typeof THREE.VertexNormalsHelper>
      spotLightHelper: ReactThreeFiber.Object3DNode<THREE.SpotLightHelper, typeof THREE.SpotLightHelper>
      skeletonHelper: ReactThreeFiber.Object3DNode<THREE.SkeletonHelper, typeof THREE.SkeletonHelper>
      pointLightHelper: ReactThreeFiber.Object3DNode<THREE.PointLightHelper, typeof THREE.PointLightHelper>
      rectAreaLightHelper: ReactThreeFiber.Object3DNode<THREE.RectAreaLightHelper, typeof THREE.RectAreaLightHelper>
      hemisphereLightHelper: ReactThreeFiber.Object3DNode<
        THREE.HemisphereLightHelper,
        typeof THREE.HemisphereLightHelper
      >
      gridHelper: ReactThreeFiber.Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>
      polarGridHelper: ReactThreeFiber.Object3DNode<THREE.PolarGridHelper, typeof THREE.PolarGridHelper>
      positionalAudioHelper: ReactThreeFiber.Object3DNode<
        THREE.PositionalAudioHelper,
        typeof THREE.PositionalAudioHelper
      >
      faceNormalsHelper: ReactThreeFiber.Object3DNode<THREE.FaceNormalsHelper, typeof THREE.FaceNormalsHelper>
      directionalLightHelper: ReactThreeFiber.Object3DNode<
        THREE.DirectionalLightHelper,
        typeof THREE.DirectionalLightHelper
      >
      cameraHelper: ReactThreeFiber.Object3DNode<THREE.CameraHelper, typeof THREE.CameraHelper>
      boxHelper: ReactThreeFiber.Object3DNode<THREE.BoxHelper, typeof THREE.BoxHelper>
      box3Helper: ReactThreeFiber.Object3DNode<THREE.Box3Helper, typeof THREE.Box3Helper>
      planeHelper: ReactThreeFiber.Object3DNode<THREE.PlaneHelper, typeof THREE.PlaneHelper>
      arrowHelper: ReactThreeFiber.Object3DNode<THREE.ArrowHelper, typeof THREE.ArrowHelper>
      axesHelper: ReactThreeFiber.Object3DNode<THREE.AxesHelper, typeof THREE.AxesHelper>
      texture: ReactThreeFiber.Node<THREE.Texture, typeof THREE.Texture>
      videoTexture: ReactThreeFiber.Node<THREE.VideoTexture, typeof THREE.VideoTexture>
      dataTexture: ReactThreeFiber.Node<THREE.DataTexture, typeof THREE.DataTexture>
      dataTexture3D: ReactThreeFiber.Node<THREE.DataTexture3D, typeof THREE.DataTexture3D>
      compressedTexture: ReactThreeFiber.Node<THREE.CompressedTexture, typeof THREE.CompressedTexture>
      cubeTexture: ReactThreeFiber.Node<THREE.CubeTexture, typeof THREE.CubeTexture>
      canvasTexture: ReactThreeFiber.Node<THREE.CanvasTexture, typeof THREE.CanvasTexture>
      depthTexture: ReactThreeFiber.Node<THREE.DepthTexture, typeof THREE.DepthTexture>
    }
  }
}
export {}
