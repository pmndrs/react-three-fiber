import lerp from 'lerp'

//export { WebGLMultisampleRenderTarget } from 'three/src/renderers/WebGLMultisampleRenderTarget.js';
//export { WebGLCubeRenderTarget } from 'three/src/renderers/WebGLCubeRenderTarget.js';
export { WebGLRenderTarget } from 'three/src/renderers/WebGLRenderTarget.js'
export { WebGLRenderer } from 'three/src/renderers/WebGLRenderer.js'
export { WebGL1Renderer } from 'three/src/renderers/WebGL1Renderer.js'
export { ShaderLib } from 'three/src/renderers/shaders/ShaderLib.js'
export { UniformsLib } from 'three/src/renderers/shaders/UniformsLib.js'
export { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils.js'
export { ShaderChunk } from 'three/src/renderers/shaders/ShaderChunk.js'
//export { FogExp2 } from 'three/src/scenes/FogExp2.js';
//export { Fog } from 'three/src/scenes/Fog.js';
export { Scene } from 'three/src/scenes/Scene.js'
//export { Sprite } from 'three/src/objects/Sprite.js';
//export { LOD } from 'three/src/objects/LOD.js';
//export { SkinnedMesh } from 'three/src/objects/SkinnedMesh.js';
export class SkinnedMesh {}
//export { Skeleton } from 'three/src/objects/Skeleton.js';
export class Skeleton {}
//export { Bone } from 'three/src/objects/Bone.js';
export class Bone {}
export { Mesh } from 'three/src/objects/Mesh.js'
//export { InstancedMesh } from 'three/src/objects/InstancedMesh.js';
//export { LineSegments } from 'three/src/objects/LineSegments.js';
export class LineSegments {}
//export { LineLoop } from 'three/src/objects/LineLoop.js';
export class LineLoop {}
export { Line } from 'three/src/objects/Line.js'
//export { Points } from 'three/src/objects/Points.js';
export class Points {}
export { Group } from 'three/src/objects/Group.js'
//export { VideoTexture } from 'three/src/textures/VideoTexture.js';
export { DataTexture } from 'three/src/textures/DataTexture.js'
//export { DataTexture2DArray } from 'three/src/textures/DataTexture2DArray.js';
//export { DataTexture3D } from 'three/src/textures/DataTexture3D.js';
//export { CompressedTexture } from 'three/src/textures/CompressedTexture.js';
//export { CubeTexture } from 'three/src/textures/CubeTexture.js';
export { CanvasTexture } from 'three/src/textures/CanvasTexture.js'
//export { DepthTexture } from 'three/src/textures/DepthTexture.js';
export { Texture } from 'three/src/textures/Texture.js'
//export * from 'three/src/geometries/Geometries.js'

export { PlaneBufferGeometry } from 'three/src/geometries/PlaneGeometry'
export { WireframeGeometry } from 'three/src/geometries/WireframeGeometry'

//export * from 'three/src/materials/Materials.js'

export { Material } from 'three/src/materials/Material.js'
export { MeshStandardMaterial } from 'three/src/materials/MeshStandardMaterial.js'
export { MeshPhysicalMaterial } from 'three/src/materials/MeshPhysicalMaterial.js'
export { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial.js'
export { LineBasicMaterial } from 'three/src/materials/LineBasicMaterial.js'
export { ShaderMaterial } from 'three/src/materials/ShaderMaterial.js'
export class PointsMaterial {}

//export { AnimationLoader } from 'three/src/loaders/AnimationLoader.js'
//export { CompressedTextureLoader } from 'three/src/loaders/CompressedTextureLoader.js'
//export { CubeTextureLoader } from 'three/src/loaders/CubeTextureLoader.js'
//export { DataTextureLoader } from 'three/src/loaders/DataTextureLoader.js'
export { TextureLoader } from 'three/src/loaders/TextureLoader.js'
//export { ObjectLoader } from 'three/src/loaders/ObjectLoader.js'
//export { MaterialLoader } from 'three/src/loaders/MaterialLoader.js'
//export { BufferGeometryLoader } from 'three/src/loaders/BufferGeometryLoader.js'
export { DefaultLoadingManager, LoadingManager } from 'three/src/loaders/LoadingManager.js'
export { ImageLoader } from 'three/src/loaders/ImageLoader.js'
export { ImageBitmapLoader } from 'three/src/loaders/ImageBitmapLoader.js'
//export class ImageBitmapLoader {}
//export { FontLoader } from 'three/src/loaders/FontLoader.js'
export { FileLoader } from 'three/src/loaders/FileLoader.js'
export { Loader } from 'three/src/loaders/Loader.js'
export { LoaderUtils } from 'three/src/loaders/LoaderUtils.js'
//export { Cache } from 'three/src/loaders/Cache.js'
//export { AudioLoader } from 'three/src/loaders/AudioLoader.js'
export { SpotLight } from 'three/src/lights/SpotLight.js'
export { PointLight } from 'three/src/lights/PointLight.js'
//export { RectAreaLight } from 'three/src/lights/RectAreaLight.js'
//export { HemisphereLight } from 'three/src/lights/HemisphereLight.js'
//export { HemisphereLightProbe } from 'three/src/lights/HemisphereLightProbe.js'
//export { DirectionalLight } from 'three/src/lights/DirectionalLight.js'
export class DirectionalLight {}
export { AmbientLight } from 'three/src/lights/AmbientLight.js'
//export { AmbientLightProbe } from 'three/src/lights/AmbientLightProbe.js'
//export { LightShadow } from 'three/src/lights/LightShadow.js'
export { Light } from 'three/src/lights/Light.js'
//export { LightProbe } from 'three/src/lights/LightProbe.js'
//export { StereoCamera } from 'three/src/cameras/StereoCamera.js'
export { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera.js'
export { OrthographicCamera } from 'three/src/cameras/OrthographicCamera.js'
//export { CubeCamera } from 'three/src/cameras/CubeCamera.js'
//export { ArrayCamera } from 'three/src/cameras/ArrayCamera.js'
export { Camera } from 'three/src/cameras/Camera.js'
//export { AudioListener } from 'three/src/audio/AudioListener.js'
//export { PositionalAudio } from 'three/src/audio/PositionalAudio.js'
//export { AudioContext } from 'three/src/audio/AudioContext.js'
//export { AudioAnalyser } from 'three/src/audio/AudioAnalyser.js'
//export { Audio } from 'three/src/audio/Audio.js'
//export { VectorKeyframeTrack } from 'three/src/animation/tracks/VectorKeyframeTrack.js'
export class VectorKeyframeTrack {}
//export { StringKeyframeTrack } from 'three/src/animation/tracks/StringKeyframeTrack.js'
//export { QuaternionKeyframeTrack } from 'three/src/animation/tracks/QuaternionKeyframeTrack.js'
export class QuaternionKeyframeTrack {}
//export { NumberKeyframeTrack } from 'three/src/animation/tracks/NumberKeyframeTrack.js'
export class NumberKeyframeTrack {}
//export { ColorKeyframeTrack } from 'three/src/animation/tracks/ColorKeyframeTrack.js'
//export { BooleanKeyframeTrack } from 'three/src/animation/tracks/BooleanKeyframeTrack.js'
//export { PropertyMixer } from 'three/src/animation/PropertyMixer.js'
export { PropertyBinding } from 'three/src/animation/PropertyBinding.js'
//export { KeyframeTrack } from 'three/src/animation/KeyframeTrack.js'
//export { AnimationUtils } from 'three/src/animation/AnimationUtils.js'
//export { AnimationObjectGroup } from 'three/src/animation/AnimationObjectGroup.js'
//export { AnimationMixer } from 'three/src/animation/AnimationMixer.js'
//export { AnimationClip } from 'three/src/animation/AnimationClip.js'
export class AnimationClip {}
export { Uniform } from 'three/src/core/Uniform.js'
export { InstancedBufferGeometry } from 'three/src/core/InstancedBufferGeometry.js'
export { BufferGeometry } from 'three/src/core/BufferGeometry.js'
export { Geometry } from 'three/src/core/Geometry.js'
export { InterleavedBufferAttribute } from 'three/src/core/InterleavedBufferAttribute.js'
export { InstancedInterleavedBuffer } from 'three/src/core/InstancedInterleavedBuffer.js'
export { InterleavedBuffer } from 'three/src/core/InterleavedBuffer.js'
export { InstancedBufferAttribute } from 'three/src/core/InstancedBufferAttribute.js'
//export { GLBufferAttribute } from 'three/src/core/GLBufferAttribute.js'
export * from 'three/src/core/BufferAttribute.js'
//export { Face3 } from 'three/src/core/Face3.js'
export { Object3D } from 'three/src/core/Object3D.js'
//export { Raycaster } from 'three/src/core/Raycaster.js'
export class Raycaster {
  setFromCamera() {}
  intersectObjects() {
    return []
  }
}
//export { Layers } from 'three/src/core/Layers.js'
export class Layers {}
//export { EventDispatcher } from 'three/src/core/EventDispatcher.js'
export { Clock } from 'three/src/core/Clock.js'
//export { QuaternionLinearInterpolant } from 'three/src/math/interpolants/QuaternionLinearInterpolant.js'
//export { LinearInterpolant } from 'three/src/math/interpolants/LinearInterpolant.js'
//export { DiscreteInterpolant } from 'three/src/math/interpolants/DiscreteInterpolant.js'
//export { CubicInterpolant } from 'three/src/math/interpolants/CubicInterpolant.js'
//export { Interpolant } from 'three/src/math/Interpolant.js'
export class Interpolant {}
//export { Triangle } from 'three/src/math/Triangle.js'
//export { MathUtils } from 'three/src/math/MathUtils.js'

export function MathUtils() {}
MathUtils.lerp = lerp

//export { Spherical } from 'three/src/math/Spherical.js'
//export { Cylindrical } from 'three/src/math/Cylindrical.js'
//export { Plane } from 'three/src/math/Plane.js'
//export { Frustum } from 'three/src/math/Frustum.js'
export { Sphere } from 'three/src/math/Sphere.js'
//export { Ray } from 'three/src/math/Ray.js'
export { Matrix4 } from 'three/src/math/Matrix4.js'
export { Matrix3 } from 'three/src/math/Matrix3.js'
export { Box3 } from 'three/src/math/Box3.js'
export { Box2 } from 'three/src/math/Box2.js'
export { Line3 } from 'three/src/math/Line3.js'
export { Euler } from 'three/src/math/Euler.js'
export { Vector4 } from 'three/src/math/Vector4.js'
export { Vector3 } from 'three/src/math/Vector3.js'
export { Vector2 } from 'three/src/math/Vector2.js'
export { Quaternion } from 'three/src/math/Quaternion.js'
export { Color } from 'three/src/math/Color.js'
//export { SphericalHarmonics3 } from 'three/src/math/SphericalHarmonics3.js'
//export { ImmediateRenderObject } from 'three/src/extras/objects/ImmediateRenderObject.js'
//export { SpotLightHelper } from 'three/src/helpers/SpotLightHelper.js'
//export { SkeletonHelper } from 'three/src/helpers/SkeletonHelper.js'
//export { PointLightHelper } from 'three/src/helpers/PointLightHelper.js'
//export { HemisphereLightHelper } from 'three/src/helpers/HemisphereLightHelper.js'
//export { GridHelper } from 'three/src/helpers/GridHelper.js'
//export { PolarGridHelper } from 'three/src/helpers/PolarGridHelper.js'
//export { DirectionalLightHelper } from 'three/src/helpers/DirectionalLightHelper.js'
//export { CameraHelper } from 'three/src/helpers/CameraHelper.js'
//export { BoxHelper } from 'three/src/helpers/BoxHelper.js'
//export { Box3Helper } from 'three/src/helpers/Box3Helper.js'
//export { PlaneHelper } from 'three/src/helpers/PlaneHelper.js'
//export { ArrowHelper } from 'three/src/helpers/ArrowHelper.js'
//export { AxesHelper } from 'three/src/helpers/AxesHelper.js'
//export * from 'three/src/extras/curves/Curves.js'
//export { Shape } from 'three/src/extras/core/Shape.js'
//export { Path } from 'three/src/extras/core/Path.js'
//export { ShapePath } from 'three/src/extras/core/ShapePath.js'
//export { Font } from 'three/src/extras/core/Font.js'
//export { CurvePath } from 'three/src/extras/core/CurvePath.js'
//export { Curve } from 'three/src/extras/core/Curve.js'
//export { ImageUtils } from 'three/src/extras/ImageUtils.js'
//export { ShapeUtils } from 'three/src/extras/ShapeUtils.js'
//export { PMREMGenerator } from 'three/src/extras/PMREMGenerator.js'
//export { WebGLUtils } from 'three/src/renderers/webgl/WebGLUtils.js'

//export * from 'three/src/constants.js'

export const PCFSoftShadowMap = 2
export const FrontSide = 0
export const BackSide = 1
export const DoubleSide = 2
export const FlatShading = 1
export const ACESFilmicToneMapping = 4
export const RepeatWrapping = 1000
export const ClampToEdgeWrapping = 1001
export const MirroredRepeatWrapping = 1002
export const NearestFilter = 1003
export const NearestMipmapNearestFilter = 1004
export const NearestMipMapNearestFilter = 1004
export const NearestMipmapLinearFilter = 1005
export const NearestMipMapLinearFilter = 1005
export const LinearFilter = 1006
export const LinearMipmapNearestFilter = 1007
export const LinearMipMapNearestFilter = 1007
export const LinearMipmapLinearFilter = 1008
export const LinearMipMapLinearFilter = 1008
export const RGBFormat = 1022
export const RGBAFormat = 1023
export const LuminanceFormat = 1024
export const LuminanceAlphaFormat = 1025
export const RGBEFormat = RGBAFormat
export const DepthFormat = 1026
export const DepthStencilFormat = 1027
export const RedFormat = 1028
export const RedIntegerFormat = 1029
export const RGFormat = 1030
export const RGIntegerFormat = 1031
export const RGBIntegerFormat = 1032
export const RGBAIntegerFormat = 1033
export const InterpolateDiscrete = 2300
export const InterpolateLinear = 2301
export const InterpolateSmooth = 2302
export const ZeroCurvatureEnding = 2400
export const ZeroSlopeEnding = 2401
export const WrapAroundEnding = 2402
export const NormalAnimationBlendMode = 2500
export const AdditiveAnimationBlendMode = 2501
export const TrianglesDrawMode = 0
export const TriangleStripDrawMode = 1
export const TriangleFanDrawMode = 2
export const LinearEncoding = 3000
export const sRGBEncoding = 3001
export const GammaEncoding = 3007
export const RGBEEncoding = 3002
export const LogLuvEncoding = 3003
export const RGBM7Encoding = 3004
export const RGBM16Encoding = 3005
export const RGBDEncoding = 3006
export const BasicDepthPacking = 3200
export const RGBADepthPacking = 3201
export const TangentSpaceNormalMap = 0
export const ObjectSpaceNormalMap = 1
