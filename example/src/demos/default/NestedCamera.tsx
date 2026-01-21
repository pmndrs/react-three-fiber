import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo, useEffect } from 'react'
import { PerspectiveCamera } from '@react-three/drei'

// Create a figure-8 (lemniscate) curve
function createFigure8Curve(scale = 10) {
  const points: THREE.Vector3[] = []
  const segments = 100

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    // Lemniscate of Bernoulli parametric equations
    const x = scale * Math.sin(t)
    const z = scale * Math.sin(t) * Math.cos(t)
    const y = 1 // Keep camera at constant height above floor
    points.push(new THREE.Vector3(x, y, z))
  }

  return new THREE.CatmullRomCurve3(points, true) // true = closed loop
}

// Build ribbon geometry in vanilla Three.js
function createRibbonGeometry(curve: THREE.CatmullRomCurve3, width: number, segments: number) {
  const geometry = new THREE.BufferGeometry()

  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const up = new THREE.Vector3(0, 1, 0)
  const tangent = new THREE.Vector3()
  const binormal = new THREE.Vector3()
  const point = new THREE.Vector3()
  const left = new THREE.Vector3()
  const right = new THREE.Vector3()

  const halfWidth = width / 2

  // Generate vertices along the curve
  for (let i = 0; i <= segments; i++) {
    const t = i / segments

    // Get point and tangent at this position
    curve.getPointAt(t, point)
    curve.getTangentAt(t, tangent)

    // Binormal = perpendicular to tangent in XZ plane (for flat ribbon)
    // Cross tangent with up to get the sideways direction
    binormal.crossVectors(tangent, up).normalize()

    // Left and right edge vertices
    left.copy(point).addScaledVector(binormal, -halfWidth)
    right.copy(point).addScaledVector(binormal, halfWidth)

    // Slight Y offset to sit just above the floor
    const y = 0.01

    positions.push(left.x, y, left.z)
    positions.push(right.x, y, right.z)

    // UVs: u goes across width, v goes along length
    uvs.push(0, t)
    uvs.push(1, t)
  }

  // Generate triangle indices (two triangles per quad)
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    const b = i * 2 + 1
    const c = (i + 1) * 2
    const d = (i + 1) * 2 + 1

    // Two triangles: a-b-d and a-d-c
    indices.push(a, b, d)
    indices.push(a, d, c)
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
}

function Figure8Ribbon({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const geometry = useMemo(() => createRibbonGeometry(curve, 1.5, 200), [curve])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="yellow" side={THREE.DoubleSide} />
    </mesh>
  )
}

function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const progressRef = useRef(0)

  const targetLeftRef = useRef<THREE.Object3D>(null!)
  const targetRightRef = useRef<THREE.Object3D>(null!)
  const spotLightLeftRef = useRef<THREE.SpotLight>(null!)
  const spotLightRightRef = useRef<THREE.SpotLight>(null!)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!)

  // Set spotlight targets after mount
  useEffect(() => {
    if (!spotLightLeftRef.current! || !targetLeftRef.current) return
    spotLightLeftRef.current.target = targetLeftRef.current
    spotLightRightRef.current.target = targetRightRef.current
  }, [])

  useFrame((_, delta) => {
    const camera = cameraRef.current
    const progress = progressRef.current
    if (!camera) return

    // Move along the curve
    progressRef.current = (progress + delta * 0.05) % 1

    // Get current position and look-ahead position for direction
    const position = curve.getPointAt(progress)
    const lookAhead = curve.getPointAt((progress + 0.01) % 1)

    // Update camera position and orientation
    camera.position.copy(position)
    camera.lookAt(lookAhead)
  })

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1, 0]} fov={75}>
        {/* Targets: in camera space, -Z is forward. Position ahead and down to illuminate the ground */}
        <group ref={targetLeftRef} position={[-3, -2, -15]} />
        <group ref={targetRightRef} position={[3, -2, -15]} />

        {/* Left headlight: positioned at bottom-left of camera view */}
        <spotLight
          ref={spotLightLeftRef}
          position={[-0.5, -0.3, 0]}
          color="#ffffee"
          intensity={100}
          angle={0.5}
          penumbra={0.3}
          distance={30}
          castShadow
        />

        {/* Right headlight: positioned at bottom-right of camera view */}
        <spotLight
          ref={spotLightRightRef}
          position={[0.5, -0.3, 0]}
          color="#ffffee"
          intensity={100}
          angle={0.5}
          penumbra={0.3}
          distance={30}
          castShadow
        />
      </PerspectiveCamera>
    </>
  )
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#333" roughness={0.8} />
    </mesh>
  )
}

function Obstacles() {
  // Add some objects to see the headlights illuminate
  const positions = [
    [-5, 0.5, 3],
    [5, 0.5, -3],
    [0, 0.5, 6],
    [0, 0.5, -6],
    [-8, 0.5, 0],
    [8, 0.5, 0],
    [-3, 0.5, -5],
    [3, 0.5, 5],
  ] as const

  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={`hsl(${i * 45}, 70%, 50%)`} />
        </mesh>
      ))}
    </>
  )
}

export default function App() {
  const curve = useMemo(() => createFigure8Curve(8), [])

  return (
    <Canvas shadows camera={{ fov: 75, near: 0.1, far: 100 }} renderer>
      <color attach="background" args={['#111']} />
      <ambientLight intensity={0.1} />
      <Figure8Ribbon curve={curve} />
      <Floor />
      <Obstacles />
      <CameraRig curve={curve} />
    </Canvas>
  )
}
