import * as THREE from 'three'
import React, { Suspense, useMemo } from 'react'
import { Canvas, useLoader } from 'react-three-fiber'
import { Physics, usePlane, useConvexPolyhedron } from 'use-cannon'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry'

function Diamond(props) {
  const { nodes } = useLoader(GLTFLoader, '/diamond.glb')
  const geo = useMemo(() => {
    const g = new THREE.Geometry().fromBufferGeometry(nodes.Cylinder.geometry)
    // Merge duplicate vertices resulting from glTF export.
    // Cannon assumes contiguous, closed meshes to work
    g.mergeVertices()
    // Ensure loaded mesh is convex and create faces if necessary
    return new ConvexGeometry(g.vertices)
  }, [nodes])

  const [ref] = useConvexPolyhedron(() => ({ mass: 100, ...props, args: geo }))
  return (
    <mesh castShadow receiveShadow ref={ref} geometry={geo} {...props} dispose={null}>
      <meshStandardMaterial attach="material" wireframe />
    </mesh>
  )
}

// A cone is a convex shape by definition...
function Cone({ sides, ...props }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.7, 0.7, sides, 1)
    g.mergeVertices()
    return g
  }, [])
  const [ref] = useConvexPolyhedron(() => ({ mass: 100, ...props, args: geo }))
  return (
    <mesh castShadow ref={ref} {...props} geometry={geo} dispose={null}>
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

// ...And so is a cube!
function Cube({ size, ...props }) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(size, size, size)
    g.mergeVertices()
    return g
  }, [])
  const [ref] = useConvexPolyhedron(() => ({ mass: 100, ...props, args: geo }))
  return (
    <mesh castShadow ref={ref} {...props} geometry={geo} dispose={null}>
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Plane(props) {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeBufferGeometry attach="geometry" args={[5, 5]} />
      <shadowMaterial attach="material" color="#171717" />
    </mesh>
  )
}

export default () => (
  <Canvas shadowMap gl={{ alpha: false }} camera={{ position: [-1, 1, 5], fov: 50 }}>
    <color attach="background" args={['lightpink']} />
    <hemisphereLight intensity={0.35} />
    <spotLight
      position={[5, 5, 5]}
      angle={0.3}
      penumbra={1}
      intensity={2}
      castShadow
      shadow-mapSize-width={1028}
      shadow-mapSize-height={1028}
    />
    <Suspense fallback={null}>
      <Physics iterations={6}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Diamond position={[1, 5, 0]} rotation={[0.4, 0.1, 0.1]} />
        <Cone position={[-1, 5, 0.5]} rotation={[0.1, 0.2, 0.1]} sides={6} />
        <Cone position={[-1, 6, 0]} rotation={[0.5, 0.1, 0.1]} sides={8} />
        <Cube position={[2, 3, -0.3]} rotation={[0.5, 0.4, -1]} size={0.4} />
        <Cone position={[-0.3, 7, 1]} rotation={[1, 0.4, 0.1]} sides={7} />
      </Physics>
    </Suspense>
  </Canvas>
)
