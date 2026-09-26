import * as THREE from 'three'
import { Canvas, Portal, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, type ReactElement } from 'react'

const colors = ['hotpink', 'aquamarine', 'lightblue', 'orange'] as const

const geometries: ReactElement[] = [
  <boxGeometry args={[0.34, 0.34, 0.34]} />,
  <sphereGeometry args={[0.22, 24, 24]} />,
  <coneGeometry args={[0.22, 0.44, 16]} />,
  <octahedronGeometry args={[0.27]} />,
]

function CameraRig({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const { camera } = useThree()
  const sphereRef = useRef<THREE.Mesh>(null!)
  const progressRef = useRef(0.4)
  const positionRef = useRef(new THREE.Vector3())
  const lookAheadRef = useRef(new THREE.Vector3())

  useFrame(({ elapsed }, delta) => {
    progressRef.current = (progressRef.current + delta * 0.045) % 1
    curve.getPointAt(progressRef.current, positionRef.current)
    curve.getPointAt((progressRef.current + 0.015) % 1, lookAheadRef.current)
    positionRef.current.y = 1.1
    lookAheadRef.current.y = 1.1
    camera.position.copy(positionRef.current)
    camera.lookAt(lookAheadRef.current)

    sphereRef.current.position.set(Math.sin(elapsed * 1.5) * 1.1, Math.cos(elapsed * 1.5) * 0.55, -2.5)
  })

  return (
    <Portal container={camera}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color="hotpink" toneMapped={false} />
      </mesh>
    </Portal>
  )
}

function Track({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  return (
    <mesh>
      <tubeGeometry args={[curve, 160, 0.09, 8, true]} />
      <meshBasicMaterial color="#d9d9d5" />
    </mesh>
  )
}

function FloatingShape({
  position,
  color,
  speed,
  geometry,
}: {
  position: [number, number, number]
  color: string
  speed: number
  geometry: ReactElement
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const offsetRef = useRef(Math.random() * Math.PI * 2)

  useFrame(({ elapsed }) => {
    const time = elapsed * speed + offsetRef.current
    meshRef.current.position.y = position[1] + Math.sin(time) * 0.14
    meshRef.current.rotation.set(time * 0.3, time * 0.4, 0)
  })

  return (
    <mesh ref={meshRef} position={position}>
      {geometry}
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

function Objects({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const shapes = useMemo(() => {
    const point = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    const count = 18

    return Array.from({ length: count }, (_, index) => {
      const progress = index / count
      curve.getPointAt(progress, point)
      curve.getTangentAt(progress, tangent)
      // Offset sideways from the track so each shape sweeps past the camera up close
      const side = index % 2 === 0 ? 1 : -1
      const distance = 0.55 + (index % 3) * 0.22

      return {
        position: [
          point.x - tangent.z * side * distance,
          0.85 + (index % 4) * 0.2,
          point.z + tangent.x * side * distance,
        ] as [number, number, number],
        color: colors[index % colors.length],
        geometry: geometries[index % geometries.length],
        speed: 1.1 + (index % 5) * 0.15,
      }
    })
  }, [curve])

  return (
    <>
      {shapes.map((shape, index) => (
        <FloatingShape key={index} {...shape} />
      ))}
    </>
  )
}

export default function App() {
  const curve = useMemo(() => createFigure8Curve(3.5), [])

  return (
    <Canvas camera={{ fov: 60, near: 0.1, far: 50 }} renderer>
      <color attach="background" args={['#eeeeec']} />
      <Track curve={curve} />
      <Objects curve={curve} />
      <CameraRig curve={curve} />
    </Canvas>
  )
}

function createFigure8Curve(scale: number) {
  const points = Array.from({ length: 65 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2
    return new THREE.Vector3(scale * Math.sin(angle), 0.08, scale * Math.sin(angle) * Math.cos(angle))
  })
  return new THREE.CatmullRomCurve3(points, true)
}
