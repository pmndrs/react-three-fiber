import * as React from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, SnapshotPanel, SnapshotPlayer, useSnapshot } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

function AnimatedScene() {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const groupRef = React.useRef<THREE.Group>(null)
  const [time, setTime] = React.useState(0)

  useFrame((state, delta) => {
    setTime((prev) => prev + delta)
    
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(time) * 0.5
      meshRef.current.rotation.y = Math.cos(time) * 0.5
      meshRef.current.position.y = Math.sin(time * 2) * 0.2
    }
    
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.3
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4a90d9" metalness={0.5} roughness={0.3} />
      </mesh>
      
      <mesh position={[-2, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.5, 0.2, 16, 50]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.3} roughness={0.5} />
      </mesh>
      
      <mesh position={[2, 0, 0]}>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#2ecc71" metalness={0.7} roughness={0.2} />
      </mesh>
      
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#34495e" />
      </mesh>
    </group>
  )
}

function SceneContent() {
  const { snapshots } = useSnapshot()
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ff6b6b" />
      
      <AnimatedScene />
      
      <OrbitControls enableDamping dampingFactor={0.05} />
      
      <SnapshotPanel position="top-right" />
      
      {snapshots.length > 1 && (
        <SnapshotPlayer
          snapshots={snapshots}
          showControls={true}
          showTimeline={true}
          showSnapshotList={true}
        />
      )}
    </>
  )
}

export default function SnapshotDemo() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#1a1a2e' }}>
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 10, 20]} />
        <SceneContent />
      </Canvas>
      
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '16px 20px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
          maxWidth: '300px',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>🎬 Snapshot System Demo</h3>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', lineHeight: '1.5' }}>
          <strong>Instructions:</strong>
        </p>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', lineHeight: '1.8' }}>
          <li>Use mouse to rotate/zoom the scene</li>
          <li>Click "Take" to capture current state</li>
          <li>Take 2+ snapshots to enable playback</li>
          <li>Click "Apply" to restore a snapshot</li>
          <li>Double-click to rename snapshots</li>
          <li>Export/Import snapshots as JSON</li>
        </ul>
      </div>
    </div>
  )
}
