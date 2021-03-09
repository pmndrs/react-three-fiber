import React, { useState } from 'react'
import { Canvas } from 'react-three-fiber'

function Sphere() {
  const [hovered, set] = useState(false)
  console.log('sphere', hovered)
  return (
    <mesh
      onPointerOver={(e) => {
        e.stopPropagation()
        set(true)
      }}
      onPointerOut={(e) => set(false)}
    >
      <sphereBufferGeometry attach="geometry" args={[0.5, 64, 64]} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'indianred'} />
    </mesh>
  )
}

function Circle() {
  const [hovered, set] = useState(false)
  console.log('circle', hovered)
  return (
    <mesh
      onPointerOver={(e) => {
        e.stopPropagation()
        set(true)
      }}
      onPointerOut={(e) => set(false)}
    >
      <circleBufferGeometry attach="geometry" args={[1, 64]} />
      <meshBasicMaterial attach="material" color={hovered ? 'lightgreen' : 'grey'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 20], zoom: 150 }} style={{ background: '#272730' }}>
      <group
        position={[-1.25, 0, 0]}
        onPointerOver={(e) => console.log('group1 over')}
        onPointerOut={(e) => console.log('group1 out')}
      >
        <group
          onPointerOver={(e) => console.log('      group2 over')}
          onPointerOut={(e) => console.log('      group2 out')}
        >
          <mesh
            renderOrder={8}
            onPointerOver={(e) => console.log('      white mesh over')}
            onPointerOut={(e) => console.log('      white mesh out')}
          >
            <sphereBufferGeometry attach="geometry" args={[1, 32, 32]} />
            <meshBasicMaterial attach="material" color="white" transparent opacity={0.2} />
          </mesh>
          <mesh
            renderOrder={7}
            onPointerOver={(e) => console.log('        black mesh over')}
            onPointerOut={(e) => console.log('        black mesh out')}
          >
            <sphereBufferGeometry attach="geometry" args={[0.7, 32, 32]} />
            <meshBasicMaterial attach="material" color="black" transparent opacity={0.2} />
          </mesh>
        </group>
      </group>
      <group position={[1.25, 0, 0]}>
        <Circle />
        <Sphere />
      </group>
    </Canvas>
  )
}
