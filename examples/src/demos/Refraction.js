import { TextureLoader, WebGLRenderTarget, Object3D, LinearFilter } from 'three'
import * as React from 'react'
import { Canvas, useLoader, useThree, useFrame } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import BackfaceMaterial from '../resources/shaders/Backface'
import RefractionMaterial from '../resources/shaders/Refraction'
import diamondUrl from '../resources/gltf/diamond.glb'
import textureUrl from '../resources/images/backdrop.jpg'

function Background() {
  const { viewport, aspect } = useThree()
  const texture = useLoader(TextureLoader, textureUrl)

  React.useMemo(() => (texture.minFilter = LinearFilter), [texture]) // Isn't useEffect fore correct in this place instead of useMemo?
  // Calculates a plane filling the screen similar to background-size: cover
  const { width, height } = viewport()

  const scale = React.useMemo(
    () => [
      5000 * (aspect > 5000 / 3800 ? width / 5000 : height / 3800),
      3800 * (aspect > 5000 / 3800 ? width / 5000 : height / 3800),
      1,
    ],
    [width, height, aspect]
  )

  return (
    <mesh layers={1} scale={scale}>
      <planeBufferGeometry attach="geometry" />
      <meshBasicMaterial attach="material" map={texture} depthTest={false} />
    </mesh>
  )
}

function Diamonds() {
  const { size, viewport, gl, scene, camera, clock } = useThree()
  const model = React.useRef()
  const { nodes } = useLoader(GLTFLoader, diamondUrl)
  // Create Fbo's and materials
  const [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial] = React.useMemo(() => {
    const envFbo = new WebGLRenderTarget(size.width, size.height)
    const backfaceFbo = new WebGLRenderTarget(size.width, size.height)
    const backfaceMaterial = new BackfaceMaterial()
    const refractionMaterial = new RefractionMaterial({
      envMap: envFbo.texture,
      backfaceMap: backfaceFbo.texture,
      resolution: [size.width, size.height],
    })
    return [envFbo, backfaceFbo, backfaceMaterial, refractionMaterial]
  }, [size])

  // Create random position data
  const dummy = React.useMemo(() => new Object3D(), [])
  const diamonds = React.useMemo(() => {
    const { width } = viewport()
    return new Array(80).fill().map((_, i) => ({
      position: [
        i < 5 ? 0 : width / 2 - Math.random() * width,
        40 - Math.random() * 40,
        i < 5 ? 26 : 10 - Math.random() * 20,
      ],
      factor: 0.1 + Math.random(),
      direction: Math.random() < 0.5 ? -1 : 1,
      rotation: [
        Math.sin(Math.random()) * Math.PI,
        Math.sin(Math.random()) * Math.PI,
        Math.cos(Math.random()) * Math.PI,
      ],
    }))
  }, [viewport])

  // Render-loop
  useFrame(() => {
    // Update instanced diamonds
    diamonds.forEach((data, i) => {
      const t = clock.getElapsedTime()
      data.position[1] -= (data.factor / 5) * data.direction
      if (data.direction === 1 ? data.position[1] < -50 : data.position[1] > 50)
        data.position = [
          i < 5 ? 0 : viewport.width / 2 - Math.random() * viewport.width,
          50 * data.direction,
          data.position[2],
        ]
      const { position, rotation, factor } = data
      dummy.position.set(position[0], position[1], position[2])
      dummy.rotation.set(rotation[0] + t * factor, rotation[1] + t * factor, rotation[2] + t * factor)
      dummy.scale.set(1 + factor, 1 + factor, 1 + factor)
      dummy.updateMatrix()
      model.current.setMatrixAt(i, dummy.matrix)
    })
    model.current.instanceMatrix.needsUpdate = true
    // Render env to fbo
    gl.autoClear = false
    camera.layers.set(1)
    gl.setRenderTarget(envFbo)
    gl.render(scene, camera)
    // Render cube backfaces to fbo
    camera.layers.set(0)
    model.current.material = backfaceMaterial
    gl.setRenderTarget(backfaceFbo)
    gl.clearDepth()
    gl.render(scene, camera)
    // Render env to screen
    camera.layers.set(1)
    gl.setRenderTarget(null)
    gl.render(scene, camera)
    gl.clearDepth()
    // Render cube with refraction material to screen
    camera.layers.set(0)
    model.current.material = refractionMaterial
    gl.render(scene, camera)
  }, 1)

  const args = React.useMemo(() => [nodes.Cylinder.geometry, null, diamonds.length], [
    nodes.Cylinder.geometry,
    diamonds.length,
  ])

  return (
    <instancedMesh ref={model} args={args} dispose={false}>
      <meshBasicMaterial attach="material" />
    </instancedMesh>
  )
}

const camera = { fov: 50, position: [0, 0, 30] }

function Refraction() {
  return (
    <Canvas colorManagement={false} camera={camera}>
      <React.Suspense fallback={null}>
        <Background />
        <Diamonds />
      </React.Suspense>
    </Canvas>
  )
}

export default React.memo(Refraction)
