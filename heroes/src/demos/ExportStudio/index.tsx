/**
 * Demo: 4K Export Studio
 * Features: width/height, setSize, dpr
 *
 * Compose a scene, click "Export 4K" - canvas temporarily
 * renders at 4K resolution for capture.
 */

import { Canvas, useThree, useFrame } from '@react-three/fiber/webgpu'
import { OrbitControls, Environment, Text, ContactShadows } from '@react-three/drei'
import { Float } from '@/shared/Float'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useControls, button } from 'leva'

function ProductModel() {
  const group = useRef<THREE.Group>(null)

  useFrame(({ elapsed }) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(elapsed * 0.3) * 0.2
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={group}>
        {/* Stylized product - abstract shape */}
        <mesh castShadow>
          <torusKnotGeometry args={[0.8, 0.3, 128, 32]} />
          <meshStandardMaterial color="#e74c3c" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Accent ring */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.05, 16, 64]} />
          <meshStandardMaterial color="#f1c40f" metalness={1} roughness={0} />
        </mesh>
      </group>
    </Float>
  )
}

function ExportController() {
  const { gl, scene, camera, size } = useThree()
  const [isExporting, setIsExporting] = useState(false)
  const [lastExport, setLastExport] = useState<string | null>(null)

  const exportImage = useCallback(
    async (resolution: number) => {
      setIsExporting(true)

      // Store original size
      const originalWidth = size.width
      const originalHeight = size.height

      // Set high resolution
      gl.setSize(resolution, resolution)

      // Render at high res
      gl.render(scene, camera)

      // Capture
      const dataUrl = gl.domElement.toDataURL('image/png')

      // Restore original size
      gl.setSize(originalWidth, originalHeight)

      // Create download link
      const link = document.createElement('a')
      link.download = `export-${resolution}p-${Date.now()}.png`
      link.href = dataUrl
      link.click()

      setLastExport(`${resolution}x${resolution}`)
      setIsExporting(false)
    },
    [gl, scene, camera, size],
  )

  useControls(
    'Export',
    {
      'Export 1080p': button(() => exportImage(1080)),
      'Export 2K': button(() => exportImage(2048)),
      'Export 4K': button(() => exportImage(4096)),
    },
    [exportImage],
  )

  return (
    <>
      {isExporting && (
        <Text position={[0, 2.5, 0]} fontSize={0.3} color="#ffffff">
          Exporting...
        </Text>
      )}
      {lastExport && !isExporting && (
        <Text position={[0, 2.5, 0]} fontSize={0.2} color="#2ecc71">
          Last export: {lastExport}
        </Text>
      )}
    </>
  )
}

function Studio() {
  const { background, environmentPreset } = useControls('Studio', {
    background: { value: '#1a1a2e', label: 'Background' },
    environmentPreset: {
      value: 'studio',
      options: ['studio', 'city', 'sunset', 'dawn', 'night', 'warehouse', 'park'],
      label: 'Environment',
    },
  })

  return (
    <>
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.3} />
      <spotLight
        position={[5, 10, 5]}
        intensity={100}
        angle={0.3}
        penumbra={0.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <spotLight position={[-5, 8, -5]} intensity={50} angle={0.4} penumbra={0.8} color="#4fc3f7" />

      <ProductModel />
      <ExportController />

      <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={10} blur={2} far={4} />

      {/* Studio floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={background} />
      </mesh>

      {/* Backdrop curve */}
      <mesh position={[0, 3, -5]}>
        <planeGeometry args={[15, 10]} />
        <meshStandardMaterial color={background} />
      </mesh>

      <Environment preset={environmentPreset as any} />
      <OrbitControls minDistance={3} maxDistance={10} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2} />
    </>
  )
}

function Instructions() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        color: 'white',
        fontSize: 12,
        opacity: 0.7,
        pointerEvents: 'none',
      }}>
      <p>Use the Leva panel (top right) to configure and export</p>
      <p>Export buttons will capture the current view at high resolution</p>
    </div>
  )
}

export default function ExportStudio() {
  return (
    <>
      <Canvas renderer camera={{ position: [4, 2, 4], fov: 45 }} shadows dpr={[1, 2]}>
        <Studio />
      </Canvas>
      <Instructions />
    </>
  )
}
