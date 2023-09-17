import * as THREE from 'three'
import * as React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import {
  useGLTF,
  PerspectiveCamera,
  OrthographicCamera,
  Environment,
  OrbitControls,
  ArcballControls,
  TransformControls,
  CameraShake,
  Bounds,
} from '@react-three/drei'

export function Soda(props: any) {
  const [hovered, spread] = useHover()
  const { nodes, materials } = useGLTF('/bottle.gltf') as any
  return (
    <group {...props} {...spread} dispose={null}>
      <mesh geometry={nodes.Mesh_sodaBottle.geometry}>
        <meshStandardMaterial color={hovered ? 'red' : 'green'} roughness={0} metalness={0.8} envMapIntensity={2} />
      </mesh>
      <mesh geometry={nodes.Mesh_sodaBottle_1.geometry} material={materials.red} material-envMapIntensity={0} />
    </group>
  )
}

function useHover() {
  const [hovered, hover] = useState(false)
  return [hovered, { onPointerOver: (e: any) => (e.stopPropagation(), hover(true)), onPointerOut: () => hover(false) }]
}

function View({ index = 1, children, clearColor, placement }: any) {
  const { events, size } = useThree()
  const [scene] = useState(() => new THREE.Scene())
  const [position] = useState(() => new THREE.Vector2())
  const [el] = useState(() => {
    const div = document.createElement('div')
    div.style.zIndex = index
    div.style.position = 'absolute'
    div.style.width = div.style.height = '50%'
    return div
  })

  useEffect(() => {
    switch (placement) {
      case 'topright':
        position.set(1, 1)
        el.style.top = el.style.right = '0px'
        break
      case 'topleft':
        position.set(0, 1)
        el.style.top = el.style.left = '0px'
        break
      case 'bottomright':
        position.set(1, 0)
        el.style.bottom = el.style.right = '0px'
        break
      case 'bottomleft':
      default:
        position.set(0, 0)
        el.style.bottom = el.style.left = '0px'
        break
    }
  }, [placement])

  useEffect(() => {
    if (events.connected) {
      const target = events.connected
      target.appendChild(el)
      return () => void target.removeChild(el)
    }
  }, [events, el])

  const compute = useCallback((event, state) => {
    if (event.target === el) {
      const width = state.size.width
      const height = state.size.height
      state.pointer.set((event.offsetX / width) * 2 - 1, -(event.offsetY / height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    }
  }, [])

  return (
    <>
      {createPortal(
        <Container index={index} clearColor={clearColor} position={position}>
          {children}
        </Container>,
        scene,
        {
          events: { compute, priority: events.priority + index, connected: el },
          size: { width: size.width / 2, height: size.height / 2 },
        },
      )}
    </>
  )
}

function Container({ children, index, clearColor, position }: any) {
  const { size, camera, scene } = useThree()

  useFrame((state) => {
    const left = Math.floor(size.width * position.x)
    const bottom = Math.floor(size.height * position.y)
    const width = Math.floor(size.width)
    const height = Math.floor(size.height)
    state.gl.setViewport(left, bottom, width, height)
    state.gl.setScissor(left, bottom, width, height)
    state.gl.setScissorTest(true)
    if (clearColor) state.gl.setClearColor(clearColor)
    state.gl.render(scene, camera)
  }, index)

  return <>{children}</>
}

const App = () => (
  <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5] }}>
    <View index={1} placement="bottomleft" clearColor={new THREE.Color('orange').convertLinearToSRGB()}>
      <OrthographicCamera makeDefault zoom={100} />
      <Scene preset="lobby" />
      <OrbitControls makeDefault />
    </View>
    <View index={2} placement="bottomright" clearColor={new THREE.Color('hotpink').convertLinearToSRGB()}>
      <PerspectiveCamera makeDefault />
      <Scene preset="city" />
      <ArcballControls />
    </View>
    <View index={3} placement="topleft" clearColor={new THREE.Color('aquamarine').convertLinearToSRGB()}>
      <PerspectiveCamera makeDefault />
      <Scene preset="dawn" />
      <OrbitControls makeDefault />
      <CameraShake intensity={2} />
    </View>
    <View index={4} placement="topright" clearColor={new THREE.Color('lightblue').convertLinearToSRGB()}>
      <PerspectiveCamera makeDefault />
      <Scene preset="warehouse" />
      <OrbitControls makeDefault />
      <TransformControls scale={3} position={[0, -0.75, 2]}>
        <Soda />
      </TransformControls>
    </View>
  </Canvas>
)

function Scene({ children, controls = true, preset }: any) {
  return (
    <Bounds fit clip observe>
      <ambientLight intensity={1} />
      <pointLight position={[20, 30, 10]} />
      <pointLight position={[-10, -10, -10]} color="blue" />
      <Soda scale={3} position={[-1, -0.75, 1]} />
      <Soda scale={3} position={[1, -0.75, 1]} />
      <Soda scale={3} position={[0, -0.75, 0]} />
      <Environment preset={preset} />
      {children}
    </Bounds>
  )
}

export default App
