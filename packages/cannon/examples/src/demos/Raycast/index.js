import React, { Suspense, useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree, extend } from 'react-three-fiber'
import { HTML } from 'drei'
import { Physics, useSphere, useBox, useRaycastAll } from 'use-cannon'
import { Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { prettyPrint } from './prettyPrint'

extend({ OrbitControls })

function Plane(props) {
  return (
    <group {...props}>
      <mesh>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <meshBasicMaterial attach="material" color="#FFD3A5" />
      </mesh>
      <mesh receiveShadow>
        <planeBufferGeometry attach="geometry" args={[8, 8]} />
        <shadowMaterial attach="material" color="#f8cd7e" />
      </mesh>
    </group>
  )
}

function Sphere({ radius, position }) {
  const [ref, api] = useSphere(() => ({ type: 'Static', args: radius, position }))
  useFrame(({ clock: { elapsedTime } }) => {
    api.position.set(position[0], position[1], Math.sin(elapsedTime / 3) * 2)
  })
  return (
    <mesh castShadow ref={ref}>
      <sphereBufferGeometry attach="geometry" args={[radius, 32, 32]} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Cube({ size, position }) {
  const [ref, api] = useBox(() => ({ type: 'Static', args: size, position }))
  useFrame(({ clock: { elapsedTime } }) => {
    api.position.set(Math.sin(elapsedTime / 2) * 2, position[1], position[2])
  })
  return (
    <mesh castShadow ref={ref} position={position}>
      <boxBufferGeometry attach="geometry" args={size} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

function Ray({ from, to, setHit }) {
  useRaycastAll({ from, to }, (result) => setHit(result))
  return (
    <line>
      <geometry
        attach="geometry"
        vertices={[from, to].map((v) => new Vector3(...v))}
        onUpdate={(self) => (self.verticesNeedUpdate = true)}
      />
      <lineBasicMaterial attach="material" color="black" />
    </line>
  )
}

function Text({ hit }) {
  return (
    <HTML center style={{ pointerEvents: 'none' }}>
      <pre>{prettyPrint(hit)}</pre>
    </HTML>
  )
}

function Raycast() {
  const [hit, setHit] = useState({})

  return (
    <>
      <Ray from={[0, 0, 0]} to={[0, 1.5, 0]} setHit={setHit} />
      <Text hit={hit} />
    </>
  )
}

const Camera = (props) => {
  const cameraRef = useRef()
  const controlsRef = useRef()
  const { gl, camera, setDefaultCamera } = useThree()
  useEffect(() => void cameraRef.current ?? setDefaultCamera(cameraRef.current))
  useFrame(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.updateMatrixWorld()
      controlsRef.current.update()
    }
  })

  return (
    <>
      <perspectiveCamera {...props} ref={cameraRef} position={[0, -10, 10]} />
      <orbitControls
        autoRotate
        enableDamping
        ref={controlsRef}
        args={[camera, gl.domElement]}
        dampingFactor={0.2}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
      />
    </>
  )
}

export default () => (
  <Canvas shadowMap gl={{ alpha: false }}>
    <Camera />
    <color attach="background" args={['#fcb89d']} />
    <hemisphereLight intensity={0.35} />
    <spotLight
      position={[0, 10, 0]}
      angle={1}
      penumbra={0.5}
      intensity={2}
      castShadow
      shadow-mapSize-width={1028}
      shadow-mapSize-height={1028}
    />
    <Suspense fallback={null}>
      <Physics iterations={6}>
        <Plane rotation={[-Math.PI / 2, 0, 0]} />
        <Sphere radius={0.5} position={[0, 1.5, 0]} />
        <Cube size={[0.75, 0.75, 0.75]} position={[0, 1.5, 0]} />
        <Raycast />
      </Physics>
    </Suspense>
  </Canvas>
)
