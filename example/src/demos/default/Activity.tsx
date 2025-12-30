import { useRef, useEffectEvent, Suspense, use, useState, Activity } from 'react'
import { useFrame, Canvas } from '@react-three/fiber'
import { Mesh, Group } from 'three'
import { DRACOLoader, GLTFLoader } from 'three-stdlib'
import { Environment } from '@react-three/drei'

const colors = ['orange', 'hotpink', 'cyan', 'lime', 'yellow', 'red', 'blue', 'purple', 'green', 'coral']

function SceneA({ onSelect }: { onSelect: Function }) {
  const ref = useRef<Mesh>(null)
  const [scale, setScale] = useState(1)
  const [color, setColor] = useState(colors[0])

  // Stable event handler using the new React 19.2 API
  const handleSelect = useEffectEvent(() => onSelect())

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 1.2
  })

  return (
    <mesh
      ref={ref}
      scale={scale}
      position={[-1.5, 0, 0]}
      onClick={handleSelect}
      onPointerOver={() => {
        setScale(1.2)
        setColor(colors[Math.floor(Math.random() * colors.length)])
      }}
      onPointerOut={() => setScale(1)}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

const modelPromise = gltfLoader.loadAsync('/models/apple.gltf')

function SceneB({ onSelect }: { onSelect: Function }) {
  const gltf = use(modelPromise)
  const ref = useRef<Group>(null)

  const [scale, setScale] = useState(5)
  const handleSelect = useEffectEvent(() => onSelect())

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= dt * 0.8
  })

  return (
    <primitive
      object={gltf.scene}
      ref={ref}
      scale={scale}
      position={[1.5, 0, 0]}
      onClick={handleSelect}
      onPointerOver={() => setScale(6)}
      onPointerOut={() => setScale(5)}
    />
  )
}

export default function App() {
  const [active, setActive] = useState('A')

  return (
    <Canvas renderer camera={{ position: [4, 3, 6], fov: 50 }}>
      <ambientLight intensity={Math.PI} />

      <Environment preset="apartment" />

      <Activity mode={active === 'A' ? 'visible' : 'hidden'}>
        <Suspense fallback={null}>
          <SceneA onSelect={() => setActive('B')} />
        </Suspense>
      </Activity>

      <Activity mode={active === 'B' ? 'visible' : 'hidden'}>
        <Suspense fallback={null}>
          <SceneB onSelect={() => setActive('A')} />
        </Suspense>
      </Activity>
    </Canvas>
  )
}
