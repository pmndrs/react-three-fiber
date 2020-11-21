import * as THREE from 'three'
import * as React from 'react'
import { Canvas } from 'react-three-fiber'

const args = [0.5, 64, 64]

function Sphere() {
  const [hovered, set] = React.useState(false)
  console.log('sphere', hovered)

  const onPointerOver = React.useCallback(function callback(e) {
    e.stopPropagation()
    set(true)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    set(false)
  }, [])

  return (
    <mesh onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <sphereBufferGeometry attach="geometry" args={args} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'indianred'} />
    </mesh>
  )
}

const args2 = [1, 64]

function Circle() {
  const [hovered, set] = React.useState(false)
  console.log('circle', hovered)
  const onPointerOver = React.useCallback(function callback(e) {
    e.stopPropagation()
    set(true)
  }, [])

  const onPointerOut = React.useCallback(function callback(e) {
    set(false)
  }, [])

  return (
    <mesh onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <circleBufferGeometry attach="geometry" args={args2} />
      <meshBasicMaterial attach="material" color={hovered ? 'lightgreen' : 'grey'} />
    </mesh>
  )
}

const camera = { position: [0, 0, 20], zoom: 150 }
const style1 = { background: '#272730' }
const position = [-1.25, 0, 0]
const args3 = [1, 32, 32]
const args4 = [0.7, 32, 32]
const args5 = [0.4, 32, 32]
const position2 = [1.25, 0, 0]

function Selection() {
  const onPointerOverGroup = React.useCallback(function callback(e) {
    console.log('group1 over')
  }, [])
  const onPointerOutGroup = React.useCallback(function callback(e) {
    console.log('group1 out')
  }, [])
  const onPointerOverGroup2 = React.useCallback(function callback(e) {
    console.log('group2 over')
  }, [])
  const onPointerOutGroup2 = React.useCallback(function callback(e) {
    console.log('group2 out')
  }, [])

  const onPointerOverMeshWhite = React.useCallback(function callback(e) {
    console.log('white mesh over')
  }, [])
  const onPointerOutMeshWhite = React.useCallback(function callback(e) {
    console.log('white mesh out')
  }, [])

  const onPointerOverMeshBlack = React.useCallback(function callback(e) {
    console.log('black mesh over')
  }, [])
  const onPointerOutMeshBlack = React.useCallback(function callback(e) {
    console.log('black mesh out')
  }, [])

  const onPointerOverMeshRed = React.useCallback(function callback(e) {
    console.log('red mesh over')
  }, [])
  const onPointerOutMeshRed = React.useCallback(function callback(e) {
    console.log('red mesh out')
  }, [])

  return (
    <Canvas orthographic camera={camera} style={style1}>
      <group position={position} onPointerOver={onPointerOverGroup} onPointerOut={onPointerOutGroup}>
        <group onPointerOver={onPointerOverGroup2} onPointerOut={onPointerOutGroup2}>
          <mesh renderOrder={8} onPointerOver={onPointerOverMeshWhite} onPointerOut={onPointerOutMeshWhite}>
            <sphereBufferGeometry attach="geometry" args={args3} />
            <meshBasicMaterial attach="material" color="white" transparent opacity={0.2} />
          </mesh>
          <mesh renderOrder={7} onPointerOver={onPointerOverMeshBlack} onPointerOut={onPointerOutMeshBlack}>
            <sphereBufferGeometry attach="geometry" args={args4} />
            <meshBasicMaterial attach="material" color="black" transparent opacity={0.2} />
          </mesh>
          <new object={THREE.Object3D}>
            <mesh renderOrder={6} onPointerOver={onPointerOverMeshRed} onPointerOut={onPointerOutMeshRed}>
              <sphereBufferGeometry attach="geometry" args={args5} />
              <meshBasicMaterial attach="material" color="red" transparent opacity={1} />
            </mesh>
          </new>
        </group>
      </group>
      <group position={position2}>
        <Circle />
        <Sphere />
      </group>
    </Canvas>
  )
}

export default React.memo(Selection)
