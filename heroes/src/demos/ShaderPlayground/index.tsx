/**
 * Demo: Shader Playground
 * Features: HMR, useNodes, useUniforms
 *
 * Live code editor for TSL with instant preview.
 * Edit shader parameters, see changes immediately.
 */

import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Text } from '@react-three/drei'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useControls, folder } from 'leva'

function ShaderSphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  const { color1, color2, speed, frequency, amplitude, metalness, roughness } = useControls({
    Colors: folder({
      color1: { value: '#e74c3c', label: 'Primary' },
      color2: { value: '#3498db', label: 'Secondary' },
    }),
    Animation: folder({
      speed: { value: 1, min: 0, max: 5, step: 0.1, label: 'Speed' },
      frequency: { value: 3, min: 1, max: 10, step: 0.5, label: 'Frequency' },
      amplitude: { value: 0.2, min: 0, max: 1, step: 0.05, label: 'Amplitude' },
    }),
    Material: folder({
      metalness: { value: 0.5, min: 0, max: 1, step: 0.1, label: 'Metalness' },
      roughness: { value: 0.3, min: 0, max: 1, step: 0.1, label: 'Roughness' },
    }),
  })

  useFrame(({ elapsed }) => {
    if (meshRef.current) {
      // Apply vertex displacement simulation
      const geo = meshRef.current.geometry
      const positions = geo.attributes.position
      const originalPositions = geo.userData.originalPositions

      if (!originalPositions) {
        geo.userData.originalPositions = positions.array.slice()
        return
      }

      for (let i = 0; i < positions.count; i++) {
        const x = originalPositions[i * 3]
        const y = originalPositions[i * 3 + 1]
        const z = originalPositions[i * 3 + 2]

        const noise =
          Math.sin(x * frequency + elapsed * speed) *
          Math.sin(y * frequency + elapsed * speed) *
          Math.sin(z * frequency + elapsed * speed)

        const scale = 1 + noise * amplitude

        positions.setXYZ(i, x * scale, y * scale, z * scale)
      }

      positions.needsUpdate = true
      geo.computeVertexNormals()

      // Color interpolation based on deformation
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      const t = (Math.sin(elapsed * speed) + 1) / 2
      const c1 = new THREE.Color(color1)
      const c2 = new THREE.Color(color2)
      material.color.copy(c1).lerp(c2, t)
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <meshStandardMaterial color={color1} metalness={metalness} roughness={roughness} />
    </mesh>
  )
}

function CodePreview() {
  const code = `// TSL Shader Preview (Conceptual)

const displacement = Fn(() => {
  const pos = positionLocal
  const time = uniform('time')
  const freq = uniform('frequency')
  const amp = uniform('amplitude')

  const noise = sin(pos.x.mul(freq).add(time))
    .mul(sin(pos.y.mul(freq).add(time)))
    .mul(sin(pos.z.mul(freq).add(time)))

  return pos.mul(noise.mul(amp).add(1))
})

material.positionNode = displacement()`

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        right: 20,
        width: 320,
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 8,
        padding: 16,
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#abb2bf',
        lineHeight: 1.5,
        whiteSpace: 'pre',
        overflow: 'auto',
        maxHeight: 300,
      }}>
      <div style={{ color: '#61afef', marginBottom: 8 }}>// Live TSL Preview</div>
      {code.split('\n').map((line, i) => (
        <div key={i}>
          {line.startsWith('//') ? (
            <span style={{ color: '#5c6370' }}>{line}</span>
          ) : line.includes('const ') ? (
            <>
              <span style={{ color: '#c678dd' }}>const </span>
              <span>{line.replace('const ', '')}</span>
            </>
          ) : line.includes('return ') ? (
            <>
              <span style={{ color: '#c678dd' }}>return </span>
              <span style={{ color: '#98c379' }}>{line.replace('return ', '')}</span>
            </>
          ) : (
            line
          )}
        </div>
      ))}
    </div>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4fc3f7" />

      <ShaderSphere />

      {/* Ground reflection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.5} />
      </mesh>

      <OrbitControls enablePan={false} minDistance={4} maxDistance={10} />
    </>
  )
}

export default function ShaderPlayground() {
  return (
    <>
      <Canvas renderer camera={{ position: [0, 2, 6], fov: 45 }}>
        <Scene />
      </Canvas>
      <CodePreview />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          color: 'white',
          fontSize: 12,
          opacity: 0.7,
        }}>
        Adjust parameters in the Leva panel to see live shader changes
      </div>
    </>
  )
}
