import { Canvas, type ThreeElements } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const redMaterial = new THREE.MeshBasicMaterial({ color: 'aquamarine', toneMapped: false })

function ReuseMaterial(props: ThreeElements['mesh']) {
  return (
    <mesh {...props}>
      <sphereGeometry args={[0.25, 64, 64]} />
      <primitive attach="material" object={redMaterial} />
    </mesh>
  )
}

function TestReuse() {
  const [okay, setOkay] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setOkay((okay) => !okay), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {okay && <ReuseMaterial position={[-1.5, 0, 0]} />}
      <ReuseMaterial position={[1.5, 0, 0]} />
    </>
  )
}

function TestMultiMaterial(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [okay, setOkay] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setOkay((okay) => !okay), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    console.log(ref.current.material)
  }, [okay])

  return (
    <mesh ref={ref} {...props}>
      <boxGeometry args={[0.75, 0.75, 0.75]} />
      <meshBasicMaterial attach="material-0" color="hotpink" toneMapped={false} />
      <meshBasicMaterial attach="material-1" color="lightgreen" toneMapped={false} />
      {okay ? (
        <meshBasicMaterial attach="material-2" color="lightblue" toneMapped={false} />
      ) : (
        <meshNormalMaterial attach="material-2" />
      )}
      <meshBasicMaterial attach="material-3" color="pink" toneMapped={false} />
      <meshBasicMaterial attach="material-4" color="orange" toneMapped={false} />
      <meshBasicMaterial attach="material-5" color="lavender" toneMapped={false} />
    </mesh>
  )
}

function TestMultiDelete(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [okay, setOkay] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setOkay((okay) => !okay), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    console.log(ref.current.material)
  }, [okay])

  return (
    <mesh ref={ref} {...props}>
      <boxGeometry args={[0.75, 0.75, 0.75]} />
      <meshBasicMaterial attach="material-0" color="hotpink" side={THREE.DoubleSide} toneMapped={false} />
      <meshBasicMaterial attach="material-1" color="lightgreen" side={THREE.DoubleSide} toneMapped={false} />
      {okay && <meshBasicMaterial attach="material-2" color="lightblue" side={THREE.DoubleSide} toneMapped={false} />}
      <meshBasicMaterial attach="material-3" color="pink" side={THREE.DoubleSide} toneMapped={false} />
      <meshBasicMaterial attach="material-4" color="orange" side={THREE.DoubleSide} toneMapped={false} />
      <meshBasicMaterial attach="material-5" color="lavender" side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  )
}

function TestMix(props: ThreeElements['mesh']) {
  const [size, setSize] = useState(0.1)
  const geometry = useMemo(() => new THREE.SphereGeometry(size, 64, 64), [size])

  useEffect(() => {
    const timeout = setInterval(
      () =>
        setSize((s) => {
          return s < 0.4 ? s + 0.025 : 0
        }),
      1000,
    )
    return () => clearTimeout(timeout)
  }, [])

  return (
    <mesh args={[geometry]} {...props}>
      <meshBasicMaterial color="hotpink" toneMapped={false} />
    </mesh>
  )
}

export default function Test() {
  return (
    <Canvas camera={{ position: [2, 2, 2] }}>
      <TestMultiMaterial position={[0, 0, 0.5]} />
      <TestMultiDelete position={[0, 0, -0.5]} />
      <TestReuse />
      <TestMix position={[0, 1, 0]} />
    </Canvas>
  )
}
