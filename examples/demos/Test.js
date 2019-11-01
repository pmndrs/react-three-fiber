import * as THREE from 'three'
import React, { useCallback } from 'react'
import { Canvas, useThree, useUpdate } from 'react-three-fiber'

export default function App() {
  return (
    <Canvas style={{ background: '#272730' }} camera={{ fov: 20 }}>
      <group onPointerOver={e => console.log('group1 over')} onPointerOut={e => console.log('group1 out')}>
        <group
          onPointerOver={e => console.log('      group2 over')}
          onPointerOut={e => console.log('      group2 out')}>
          <mesh
            renderOrder={8}
            onPointerOver={e => console.log('      white mesh over')}
            onPointerOut={e => console.log('      white mesh out')}>
            <sphereBufferGeometry attach="geometry" args={[0.25, 32, 32]} />
            <meshBasicMaterial attach="material" color="white" transparent opacity={0.2} />
          </mesh>
          <mesh
            renderOrder={7}
            onPointerOver={e => console.log('        black mesh over')}
            onPointerOut={e => console.log('        black mesh out')}>
            <sphereBufferGeometry attach="geometry" args={[0.1, 32, 32]} />
            <meshBasicMaterial attach="material" color="black" transparent opacity={0.2} />
          </mesh>
          <new object={THREE.Object3D}>
            <mesh
              renderOrder={6}
              onPointerOver={e => console.log('        red mesh over')}
              onPointerOut={e => console.log('        red mesh out')}>
              <sphereBufferGeometry attach="geometry" args={[0.05, 32, 32]} />
              <meshBasicMaterial attach="material" color="red" transparent opacity={1} />
            </mesh>
          </new>
        </group>
      </group>
    </Canvas>
  )
}
