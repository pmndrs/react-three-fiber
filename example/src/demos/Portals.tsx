import * as THREE from 'three'
import * as React from 'react'
import { useCallback, useLayoutEffect, useRef, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import { useGLTF, OrbitControls, useFBO, Environment } from '@react-three/drei'

export function Lights() {
  return (
    <>
      <color attach="background" args={['#f0f0f0']} />
      <ambientLight intensity={1} />
      <pointLight position={[20, 30, 10]} />
      <pointLight position={[-10, -10, -10]} color="blue" />
    </>
  )
}

export function Farm(props: any) {
  const { scene } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/low-poly-farm/model.gltf',
  )
  return <primitive object={scene} {...props} />
}

export function Ramen(props: any) {
  const { scene } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/bowl-broth/model.gltf',
  )
  return <primitive object={scene} {...props} />
}

export function Soda(props: any) {
  const [hovered, spread] = useHover()
  const { nodes, materials } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/soda-bottle/model.gltf',
  ) as any
  return (
    <group {...props} {...spread} dispose={null}>
      <mesh geometry={nodes.Mesh_sodaBottle.geometry}>
        <meshStandardMaterial color={hovered ? 'red' : 'green'} />
      </mesh>
      <mesh geometry={nodes.Mesh_sodaBottle_1.geometry} material={materials.red} />
    </group>
  )
}

function useHover() {
  const [hovered, hover] = useState(false)
  return [hovered, { onPointerOver: (e: any) => (e.stopPropagation(), hover(true)), onPointerOut: () => hover(false) }]
}

function Portal({ children, scale = [1, 1, 1], clearColor = 'white', ...props }: any) {
  const ref = useRef<THREE.Mesh>(null!)
  const fbo = useFBO()
  const { events } = useThree()
  // The portal will render into this scene
  const [scene] = useState(() => new THREE.Scene())
  // We have our own camera in here, separate from the default
  const [camera] = useState(() => new THREE.PerspectiveCamera(50, 1, 0.1, 1000))

  useLayoutEffect(() => {
    camera.aspect = ref.current.scale.x / ref.current.scale.y
    camera.updateProjectionMatrix()
  }, [scale])

  useFrame((state) => {
    // Copy the default cameras whereabous
    camera.position.copy(state.camera.position)
    camera.rotation.copy(state.camera.rotation)
    camera.scale.copy(state.camera.scale)
    // Render into a WebGLRenderTarget as a texture (the FBO above)
    state.gl.clearColor()
    state.gl.setRenderTarget(fbo)
    state.gl.render(scene, camera)
    state.gl.setRenderTarget(null)
  })

  // This is a custom raycast-compute function, it controls how the raycaster functions.
  const compute = useCallback((event, state, previous) => {
    // First we call the previous state-onion-layers compute, this is what makes it possible to nest portals
    if (!previous.raycaster.camera) previous.events.compute(event, previous, previous.previousRoot?.getState())
    // We run a quick check against the textured plane itself, if it isn't hit there's no need to raycast at all
    const [intersection] = previous.raycaster.intersectObject(ref.current)
    if (!intersection) return false
    // We take that hits uv coords, set up this layers raycaster, et voilà, we have raycasting with perspective shift
    const uv = intersection.uv
    state.raycaster.setFromCamera(state.pointer.set(uv.x * 2 - 1, uv.y * 2 - 1), camera)
  }, [])

  return (
    <>
      {/* This mesh receives the render-targets texture and draws it onto a plane */}
      <mesh scale={scale} ref={ref} {...props}>
        <planeGeometry />
        <meshBasicMaterial map={fbo.texture} map-encoding={THREE.sRGBEncoding} />
      </mesh>
      {/* A portal by default now has its own state, separate from the root state.
          The third argument to createPortal allows you to override parts of it, in here for example 
          we place our own camera and override the events definition with a lower proprity than
          the previous layer, and our custom compute function. */}
      {createPortal(children, scene, { camera, events: { compute, priority: events.priority - 1 } })}
    </>
  )
}

const App = () => (
  <Canvas dpr={[1, 2]} camera={{ position: [0, 3, 7] }}>
    <group position={[0, -1, 0]}>
      <Lights />
      {/* First layer, a portal */}
      <Portal scale={[4, 5, 1]} position={[0, 2.5, 0]} rotation={[0, 0, 0]}>
        <Lights />
        <Suspense fallback={null}>
          <Farm scale={10} rotation={[0, 0, 0]} position={[-1, -2, -10]} />
          <Soda scale={5} position={[2, -2, -1.5]} />
        </Suspense>
        <Portal scale={[4, 5, 1]} position={[2, 0, -5]} rotation={[0, 0, 0]}>
          <Lights />
          <Suspense fallback={null}>
            <Soda scale={8} position={[0, -2, -1.5]} />
            <Environment preset="city" background="only" />
          </Suspense>
        </Portal>
      </Portal>
      <Suspense fallback={null}>
        <Ramen scale={4} position={[-2, 0, 2]} />
        <Soda scale={5} position={[1.5, 0, 3]} />
      </Suspense>
    </group>
    <OrbitControls />
  </Canvas>
)

export default App
