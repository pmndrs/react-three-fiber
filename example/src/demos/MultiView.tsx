import * as THREE from 'three'
import * as React from 'react'
import { useCallback, useEffect, useState, useRef } from 'react'
import { Canvas, useFrame, useThree, createPortal } from '@react-three/fiber'
import {
  useGLTF,
  PerspectiveCamera,
  Environment,
  OrbitControls,
  ArcballControls,
  TransformControls,
  CameraShake,
  Bounds,
} from '@react-three/drei'

export function Soda(props: any) {
  const [hovered, spread] = useHover()
  const { nodes, materials } = useGLTF(
    'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/soda-bottle/model.gltf',
  ) as any
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
  const camera = useRef<THREE.PerspectiveCamera>(null!)
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
        position.set(0.5, 0.5)
        el.style.top = el.style.right = '0px'
        break
      case 'topleft':
        position.set(0, 0.5)
        el.style.top = el.style.left = '0px'
        break
      case 'bottomright':
        position.set(0.5, 0)
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

  useFrame((state) => {
    const left = Math.floor(size.width * position.x)
    const bottom = Math.floor(size.height * position.y)
    const width = Math.floor(size.width * 0.5)
    const height = Math.floor(size.height * 0.5)
    state.gl.setViewport(left, bottom, width, height)
    state.gl.setScissor(left, bottom, width, height)
    state.gl.setScissorTest(true)
    if (clearColor) state.gl.setClearColor(clearColor)
    state.gl.render(scene, camera.current)
  }, index)

  const compute = useCallback((event, state) => {
    if (event.target === el) {
      const width = state.size.width / 2
      const height = state.size.height / 2
      state.pointer.set((event.offsetX / width) * 2 - 1, -(event.offsetY / height) * 2 + 1)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    }
  }, [])

  return (
    <>
      {createPortal(
        <>
          {children}
          <PerspectiveCamera ref={camera} makeDefault />
        </>,
        scene,
        { events: { compute, priority: events.priority + index, connected: el } },
      )}
    </>
  )
}

const App = () => (
  <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5] }}>
    <View index={1} placement="bottomleft" clearColor={new THREE.Color('orange').convertLinearToSRGB()}>
      <Scene preset="lobby" />
    </View>
    <View index={2} placement="bottomright" clearColor={new THREE.Color('hotpink').convertLinearToSRGB()}>
      <Scene controls={false} preset="city" />
      <ArcballControls />
    </View>
    <View index={3} placement="topleft" clearColor={new THREE.Color('aquamarine').convertLinearToSRGB()}>
      <Scene preset="dawn" />
      <CameraShake intensity={2} />
    </View>
    <View index={4} placement="topright" clearColor={new THREE.Color('lightblue').convertLinearToSRGB()}>
      <Scene preset="warehouse" />
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
      {controls && <OrbitControls makeDefault />}
    </Bounds>
  )
}

export default App
