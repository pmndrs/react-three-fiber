import { Environment, OrbitControls, PerspectiveCamera, Preload, TransformControls, useGLTF } from '@react-three/drei'
import {
  Canvas,
  type ComputeFunction,
  createPortal,
  type ThreeElements,
  type ThreeEvent,
  useFrame,
  useThree,
} from '@react-three/fiber'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import useRefs from 'react-use-refs'
import * as THREE from 'three'

function useHover() {
  const [hovered, setHovered] = useState(false)
  const props = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setHovered(true)
    },
    onPointerOut: () => setHovered(false),
  }
  return [hovered, props] as const
}

function Soda(props: ThreeElements['group']) {
  const ref = useRef<THREE.Group>(null!)
  const [hovered, spread] = useHover()
  const { meshes, materials } = useGLTF('/bottle.gltf')

  useFrame((state, delta) => (ref.current.rotation.y += delta))

  return (
    <group ref={ref} {...props} {...spread} dispose={null}>
      <mesh geometry={meshes.Mesh_sodaBottle.geometry}>
        <meshStandardMaterial color={hovered ? 'red' : 'green'} roughness={0} metalness={0.8} envMapIntensity={2} />
      </mesh>
      <mesh geometry={meshes.Mesh_sodaBottle_1.geometry} material={materials.red} material-envMapIntensity={0} />
    </group>
  )
}

function Duck(props: ThreeElements['group']) {
  const { scene } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/duck/model.gltf')
  useFrame((state, delta) => (scene.rotation.x = scene.rotation.y += delta))
  return <primitive object={scene} {...props} />
}

function Candy(props: ThreeElements['group']) {
  const { scene } = useGLTF(
    'https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/candy-bucket/model.gltf',
  )
  useFrame((state, delta) => (scene.rotation.z = scene.rotation.y += delta))
  return <primitive object={scene} {...props} />
}

function Flash(props: ThreeElements['group']) {
  const { scene } = useGLTF('/lightning.gltf')
  useFrame((state, delta) => (scene.rotation.y += delta))
  return <primitive object={scene} {...props} />
}

function Apple(props: ThreeElements['group']) {
  const { scene } = useGLTF('/apple.gltf')
  useFrame((state, delta) => (scene.rotation.x = scene.rotation.y += delta))
  return <primitive object={scene} {...props} />
}

const isOrthographicCamera = (def: THREE.Camera): def is THREE.OrthographicCamera =>
  def && (def as THREE.OrthographicCamera).isOrthographicCamera
const col = new THREE.Color()

function Container({
  scene,
  index,
  children,
  frames,
  rect,
  track,
}: {
  scene: THREE.Scene
  index: number
  children: React.ReactNode
  frames: number
  rect: React.RefObject<DOMRect>
  track: React.RefObject<HTMLElement>
}) {
  const { camera } = useThree()

  let frameCount = 0
  useFrame((state) => {
    if (frames === Infinity || frameCount <= frames) {
      rect.current = track.current?.getBoundingClientRect()
      frameCount++
    }

    const { left = 0, right = 0, top = 0, bottom = 0, width = 0, height = 0 } = rect.current || {}
    const isOffscreen = bottom < 0 || top > state.size.height || right < 0 || left > state.size.width

    const positiveYUpBottom = state.size.height - bottom
    const aspect = width / height

    if (isOrthographicCamera(camera)) {
      camera.left = width / -2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = height / -2
    } else {
      camera.aspect = aspect
    }

    camera.updateProjectionMatrix()
    state.gl.setViewport(left, positiveYUpBottom, width, height)
    state.gl.setScissor(left, positiveYUpBottom, width, height)
    state.gl.setScissorTest(true)

    if (isOffscreen) {
      state.gl.getClearColor(col)
      state.gl.setClearColor(col, state.gl.getClearAlpha())
      state.gl.clear(true, true)
      return
    }

    state.gl.render(scene, camera)
  }, index)

  const get = useThree((state) => state.get)
  const setEvents = useThree((state) => state.setEvents)
  const [ready, toggle] = useReducer(() => true, false)

  useEffect(() => {
    const old = get().events.connected
    setEvents({ connected: track.current })
    toggle()
    return () => setEvents({ connected: old })
  }, [])

  return ready && children
}

export const View = ({ track, index = 1, frames = Infinity, children, ...props }: any) => {
  const rect = useRef<DOMRect>(null!)
  const [scene] = useState(() => new THREE.Scene())

  const compute = useCallback<ComputeFunction>(
    (event, state) => {
      if (track.current && event.target === track.current) {
        if (!rect.current) return
        const { width, height, left, top } = rect.current
        const x = event.clientX - left
        const y = event.clientY - top
        state.pointer.set((x / width) * 2 - 1, -(y / height) * 2 + 1)
        state.raycaster.setFromCamera(state.pointer, state.camera)
      }
    },
    [rect],
  )

  return (
    <>
      {createPortal(
        <Container frames={frames} scene={scene} track={track} rect={rect} index={index}>
          {children}
        </Container>,
        scene,
        { events: { compute } },
      )}
    </>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={Math.PI} />
      <pointLight decay={0} position={[20, 30, 10]} intensity={1} />
      <pointLight decay={0} position={[-10, -10, -10]} color="blue" />
      <Environment preset="dawn" />
    </>
  )
}

export default function App() {
  const ref = useRef<HTMLDivElement>(null!)
  const [view1, view2, view3, view4, view5] = useRefs() as any
  return (
    <div ref={ref} className="container">
      <div className="text">
        Work on version 8 has begun 3 Sep 2021.
        <div
          ref={view1}
          className="translateX"
          style={{ margin: '0.2em', width: 400, height: 200, display: 'inline-block' }}
        />
        This is perhaps the biggest update to Fiber yet.
        <div
          ref={view2}
          className="scale"
          style={{ margin: '0.2em', width: 400, height: 200, display: 'inline-block' }}
        />
        We've tried our best to keep breaking-changes to a minimum,
        <div
          ref={view3}
          className="translateY"
          style={{ margin: '0.2em', width: 400, height: 200, display: 'inline-block' }}
        />
        they mostly affect rarely used api's like attach.
        <div
          ref={view4}
          className="scale"
          style={{ margin: '0.2em', width: 400, height: 200, display: 'inline-block' }}
        />
        This release brings a ton of performance related fixes,
        <div
          ref={view5}
          className="translateX"
          style={{ margin: '0.2em', width: 400, height: 200, display: 'inline-block' }}
        />
        but also includes some new and ground-breaking features.
      </div>
      <Canvas
        onCreated={(state) => state.events.connect?.(ref.current)}
        style={{
          pointerEvents: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
        }}>
        <View track={view1}>
          <color attach="background" args={['lightpink']} />
          <Scene />
          <TransformControls>
            <Soda scale={6} position={[0, -1.6, 0]} />
          </TransformControls>
          <PerspectiveCamera makeDefault fov={40} position={[0, 0, 6]} />
          <OrbitControls makeDefault />
        </View>
        <View track={view2}>
          <color attach="background" args={['lightblue']} />
          <Scene />
          <TransformControls>
            <Apple scale={10} />
          </TransformControls>
          <PerspectiveCamera makeDefault fov={40} position={[0, 0, 6]} />
        </View>
        <View track={view3}>
          <color attach="background" args={['lightgreen']} />
          <Scene />
          <Duck scale={2} />
          <PerspectiveCamera makeDefault fov={40} position={[0, 0, 6]} />
        </View>
        <View track={view4}>
          <color attach="background" args={['peachpuff']} />
          <Scene />
          <Candy scale={3} />
          <PerspectiveCamera makeDefault fov={40} position={[0, 0, 6]} />
        </View>
        <View track={view5}>
          <color attach="background" args={['orange']} />
          <Scene />
          <Flash scale={3} />
          <PerspectiveCamera makeDefault fov={40} position={[0, 0, 6]} />
        </View>
        <Preload all />
      </Canvas>
    </div>
  )
}
