/* eslint-disable @typescript-eslint/ban-ts-ignore */

import * as THREE from 'three'
import { MouseEvent, PointerEvent, WheelEvent } from './canvas'

export type NonFunctionKeys<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]
export type Overwrite<T, O> = Omit<T, NonFunctionKeys<O>> & O

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

  export type EventHandlers = {
    onClick?: (event: MouseEvent) => void
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
    attachObject?: [string, string]
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

  export type GeometryNode<T extends THREE.Geometry, P> = Overwrite<Node<T, P>, { vertices?: Vector3[] }>
  export type BufferGeometryNode<T extends THREE.BufferGeometry, P> = Overwrite<Node<T, P>, {}>
  export type MaterialNode<T extends THREE.Material, P> = Overwrite<Node<T, P>, { color?: Color }>
  export type LightNode<T extends THREE.Light, P> = Overwrite<Node<T, P>, { color?: Color }>
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // `audio` works but conflicts with @types/react. Try using Audio from react-three-fiber/components instead
      // audio: ReactThreeFiber.Object3DNode<THREE.Audio, typeof THREE.Audio>
      audioListener: ReactThreeFiber.Object3DNode<THREE.AudioListener, typeof THREE.AudioListener>
      positionalAudio: ReactThreeFiber.Object3DNode<THREE.PositionalAudio, typeof THREE.PositionalAudio>

      mesh: ReactThreeFiber.Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      instancedMesh: ReactThreeFiber.Object3DNode<THREE.InstancedMesh, typeof THREE.InstancedMesh>
      scene: ReactThreeFiber.Object3DNode<THREE.Scene, typeof THREE.Scene>
      sprite: ReactThreeFiber.Object3DNode<THREE.Sprite, typeof THREE.Sprite>
      lOD: ReactThreeFiber.Object3DNode<THREE.LOD, typeof THREE.LOD>
      skinnedMesh: ReactThreeFiber.Object3DNode<THREE.SkinnedMesh, typeof THREE.SkinnedMesh>
      // @ts-ignore
      skeleton: ReactThreeFiber.Object3DNode<THREE.Skeleton, typeof THREE.Skeleton>
      bone: ReactThreeFiber.Object3DNode<THREE.Bone, typeof THREE.Bone>
      lineSegments: ReactThreeFiber.Object3DNode<THREE.LineSegments, typeof THREE.LineSegments>
      lineLoop: ReactThreeFiber.Object3DNode<THREE.LineLoop, typeof THREE.LineLoop>
      // see `audio`
      // line: ReactThreeFiber.Object3DNode<THREE.Line, typeof THREE.Line>
      points: ReactThreeFiber.Object3DNode<THREE.Points, typeof THREE.Points>
      group: ReactThreeFiber.Object3DNode<THREE.Group, typeof THREE.Group>
      immediateRenderObject: ReactThreeFiber.Object3DNode<
        THREE.ImmediateRenderObject,
        typeof THREE.ImmediateRenderObject
      >

      // cameras
      camera: ReactThreeFiber.Object3DNode<THREE.Camera, typeof THREE.Camera>
      perspectiveCamera: ReactThreeFiber.Object3DNode<THREE.PerspectiveCamera, typeof THREE.PerspectiveCamera>
      orthographicCamera: ReactThreeFiber.Object3DNode<THREE.OrthographicCamera, typeof THREE.OrthographicCamera>
      cubeCamera: ReactThreeFiber.Object3DNode<THREE.CubeCamera, typeof THREE.CubeCamera>
      arrayCamera: ReactThreeFiber.Object3DNode<THREE.ArrayCamera, typeof THREE.ArrayCamera>

      // geometry
      geometry: ReactThreeFiber.GeometryNode<THREE.Geometry, typeof THREE.Geometry>
      instancedBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.InstancedBufferGeometry,
        typeof THREE.InstancedBufferGeometry
      >
      bufferGeometry: ReactThreeFiber.BufferGeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>
      boxBufferGeometry: ReactThreeFiber.BufferGeometryNode<THREE.BoxBufferGeometry, typeof THREE.BoxBufferGeometry>
      circleBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.CircleBufferGeometry,
        typeof THREE.CircleBufferGeometry
      >
      coneBufferGeometry: ReactThreeFiber.BufferGeometryNode<THREE.ConeBufferGeometry, typeof THREE.ConeBufferGeometry>
      cylinderBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.CylinderBufferGeometry,
        typeof THREE.CylinderBufferGeometry
      >
      dodecahedronBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.DodecahedronBufferGeometry,
        typeof THREE.DodecahedronBufferGeometry
      >
      extrudeBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.ExtrudeBufferGeometry,
        typeof THREE.ExtrudeBufferGeometry
      >
      icosahedronBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.IcosahedronBufferGeometry,
        typeof THREE.IcosahedronBufferGeometry
      >
      latheBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.LatheBufferGeometry,
        typeof THREE.LatheBufferGeometry
      >
      octahedronBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.OctahedronBufferGeometry,
        typeof THREE.OctahedronBufferGeometry
      >
      parametricBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.ParametricBufferGeometry,
        typeof THREE.ParametricBufferGeometry
      >
      planeBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.PlaneBufferGeometry,
        typeof THREE.PlaneBufferGeometry
      >
      polyhedronBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.PolyhedronBufferGeometry,
        typeof THREE.PolyhedronBufferGeometry
      >
      ringBufferGeometry: ReactThreeFiber.BufferGeometryNode<THREE.RingBufferGeometry, typeof THREE.RingBufferGeometry>
      shapeBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.ShapeBufferGeometry,
        typeof THREE.ShapeBufferGeometry
      >
      sphereBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.SphereBufferGeometry,
        typeof THREE.SphereBufferGeometry
      >
      tetrahedronBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.TetrahedronBufferGeometry,
        typeof THREE.TetrahedronBufferGeometry
      >
      textBufferGeometry: ReactThreeFiber.BufferGeometryNode<THREE.TextBufferGeometry, typeof THREE.TextBufferGeometry>
      torusBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.TorusBufferGeometry,
        typeof THREE.TorusBufferGeometry
      >
      torusKnotBufferGeometry: ReactThreeFiber.BufferGeometryNode<
        THREE.TorusKnotBufferGeometry,
        typeof THREE.TorusKnotBufferGeometry
      >
      tubeBufferGeometry: ReactThreeFiber.BufferGeometryNode<THREE.TubeBufferGeometry, typeof THREE.TubeBufferGeometry>
      wireframeGeometry: ReactThreeFiber.BufferGeometryNode<THREE.WireframeGeometry, typeof THREE.WireframeGeometry>
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
      edgesGeometry: ReactThreeFiber.BufferGeometryNode<THREE.EdgesGeometry, typeof THREE.EdgesGeometry>
      coneGeometry: ReactThreeFiber.GeometryNode<THREE.ConeGeometry, typeof THREE.ConeGeometry>
      cylinderGeometry: ReactThreeFiber.GeometryNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>
      circleGeometry: ReactThreeFiber.GeometryNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>
      boxGeometry: ReactThreeFiber.GeometryNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>

      // materials
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

      // primitive
      primitive: { object: any } & { [properties: string]: any }

      // lights and other
      light: ReactThreeFiber.LightNode<THREE.Light, typeof THREE.Light>
      spotLightShadow: ReactThreeFiber.Node<THREE.SpotLightShadow, typeof THREE.SpotLightShadow>
      spotLight: ReactThreeFiber.LightNode<THREE.SpotLight, typeof THREE.SpotLight>
      pointLight: ReactThreeFiber.LightNode<THREE.PointLight, typeof THREE.PointLight>
      rectAreaLight: ReactThreeFiber.LightNode<THREE.RectAreaLight, typeof THREE.RectAreaLight>
      hemisphereLight: ReactThreeFiber.LightNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>
      directionalLightShadow: ReactThreeFiber.Node<THREE.DirectionalLightShadow, typeof THREE.DirectionalLightShadow>
      directionalLight: ReactThreeFiber.LightNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
      ambientLight: ReactThreeFiber.LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      lightShadow: ReactThreeFiber.Node<THREE.LightShadow, typeof THREE.LightShadow>
      ambientLightProbe: ReactThreeFiber.LightNode<THREE.AmbientLightProbe, typeof THREE.AmbientLightProbe>
      hemisphereLightProbe: ReactThreeFiber.LightNode<THREE.HemisphereLightProbe, typeof THREE.HemisphereLightProbe>
      lightProbe: ReactThreeFiber.LightNode<THREE.LightProbe, typeof THREE.LightProbe>

      // helpers
      spotLightHelper: ReactThreeFiber.Object3DNode<THREE.SpotLightHelper, typeof THREE.SpotLightHelper>
      skeletonHelper: ReactThreeFiber.Object3DNode<THREE.SkeletonHelper, typeof THREE.SkeletonHelper>
      pointLightHelper: ReactThreeFiber.Object3DNode<THREE.PointLightHelper, typeof THREE.PointLightHelper>
      hemisphereLightHelper: ReactThreeFiber.Object3DNode<
        THREE.HemisphereLightHelper,
        typeof THREE.HemisphereLightHelper
      >
      gridHelper: ReactThreeFiber.Object3DNode<THREE.GridHelper, typeof THREE.GridHelper>
      polarGridHelper: ReactThreeFiber.Object3DNode<THREE.PolarGridHelper, typeof THREE.PolarGridHelper>
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

      // textures
      texture: ReactThreeFiber.Node<THREE.Texture, typeof THREE.Texture>
      videoTexture: ReactThreeFiber.Node<THREE.VideoTexture, typeof THREE.VideoTexture>
      dataTexture: ReactThreeFiber.Node<THREE.DataTexture, typeof THREE.DataTexture>
      dataTexture3D: ReactThreeFiber.Node<THREE.DataTexture3D, typeof THREE.DataTexture3D>
      compressedTexture: ReactThreeFiber.Node<THREE.CompressedTexture, typeof THREE.CompressedTexture>
      cubeTexture: ReactThreeFiber.Node<THREE.CubeTexture, typeof THREE.CubeTexture>
      canvasTexture: ReactThreeFiber.Node<THREE.CanvasTexture, typeof THREE.CanvasTexture>
      depthTexture: ReactThreeFiber.Node<THREE.DepthTexture, typeof THREE.DepthTexture>

      // misc
      raycaster: ReactThreeFiber.Node<THREE.Raycaster, typeof THREE.Raycaster>
      vector2: ReactThreeFiber.Node<THREE.Vector2, typeof THREE.Vector2>
      vector3: ReactThreeFiber.Node<THREE.Vector3, typeof THREE.Vector3>
      vector4: ReactThreeFiber.Node<THREE.Vector4, typeof THREE.Vector4>
      euler: ReactThreeFiber.Node<THREE.Euler, typeof THREE.Euler>
      matrix3: ReactThreeFiber.Node<THREE.Matrix3, typeof THREE.Matrix3>
      matrix4: ReactThreeFiber.Node<THREE.Matrix4, typeof THREE.Matrix4>
      quaternion: ReactThreeFiber.Node<THREE.Quaternion, typeof THREE.Quaternion>
      bufferAttribute: ReactThreeFiber.Node<THREE.BufferAttribute, typeof THREE.BufferAttribute>
      face3: ReactThreeFiber.Node<THREE.Face3, typeof THREE.Face3>
      color: ReactThreeFiber.Node<THREE.Color, typeof THREE.Color>
      fog: ReactThreeFiber.Node<THREE.Fog, typeof THREE.Fog>
    }
  }
}
