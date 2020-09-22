import React, { Suspense } from 'react'
import { Canvas } from 'react-three-fiber'
import { Physics, usePlane, useCompoundBody } from 'use-cannon'

function Plane(props) {
  const [ref] = usePlane(() => ({ type: 'Static', ...props }))
  return (
    <group ref={ref}>
      <mesh>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <meshBasicMaterial attach="material" color="#ffb385" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <shadowMaterial attach="material" color="lightsalmon" />
      </mesh>
    </group>
  )
}

function CompoundBody(props) {
  const boxSize = [1, 1, 1]
  const sphereRadius = 0.65
  const [ref] = useCompoundBody(() => ({
    mass: 12,
    ...props,
    shapes: [
      { type: 'Box', position: [0, 0, 0], rotation: [0, 0, 0], args: boxSize },
      { type: 'Sphere', position: [1, 0, 0], rotation: [0, 0, 0], args: [sphereRadius] },
    ],
  }))
  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxBufferGeometry attach="geometry" args={boxSize} />
        <meshNormalMaterial attach="material" />
      </mesh>
      <mesh castShadow position={[1, 0, 0]}>
        <sphereBufferGeometry attach="geometry" args={[sphereRadius, 16, 16]} />
        <meshNormalMaterial attach="material" />
      </mesh>
    </group>
  )
}

export default () => (
  <Canvas invalidateFrameloop shadowMap gl={{ alpha: false }} camera={{ position: [-2, 1, 7], fov: 50 }}>
    <color attach="background" args={['#f6d186']} />
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
        <CompoundBody position={[1.5, 5, 0.5]} rotation={[1.25, 0, 0]} />
        <CompoundBody position={[2.5, 3, 0.25]} rotation={[1.25, -1.25, 0]} />
      </Physics>
    </Suspense>
  </Canvas>
)
