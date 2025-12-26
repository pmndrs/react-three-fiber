import React, { SyntheticEvent, useState, useRef, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

//* Utility Functions ==============================

/** Extract first image file from a FileList */
function getImageFile(files: FileList | undefined): File | null {
  if (!files?.length) return null
  for (let i = 0; i < files.length; i++) {
    if (files[i].type.startsWith('image/')) return files[i]
  }
  return null
}

/** Load texture from blob URL with proper colorspace */
function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        resolve(texture)
      },
      undefined,
      reject,
    )
  })
}

//* Hook to load texture from file ==============================

function useFileTexture(file: File | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!file) {
      // Clean up if file is removed
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
      texture?.dispose()
      setTexture(null)
      return
    }

    // Create blob URL and load texture
    const url = URL.createObjectURL(file)
    urlRef.current = url

    loadTexture(url).then((tex) => {
      setTexture((old) => {
        old?.dispose()
        return tex
      })
    })

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])

  return texture
}

//* Background Component ==============================

function Background({ color, texture }: { color: string; texture: THREE.Texture | null }) {
  const { scene } = useThree()

  useEffect(() => {
    scene.background = texture ?? new THREE.Color(color)
    return () => {
      scene.background = null
    }
  }, [scene, texture, color])

  return null
}

//* Animated Box Component ==============================
// Handles drag/drop with smooth lerp animation

interface AnimatedBoxProps {
  texture: THREE.Texture | null
  onDrop: (e: ThreeEvent<DragEvent>) => void
  onDragOverEnter: () => void
  onDragOverLeave: () => void
}

function AnimatedBox({ texture, onDrop, onDragOverEnter, onDragOverLeave }: AnimatedBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)
  const [hovered, setHovered] = useState(false)
  const hasTexture = !!texture

  // Update material when texture changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.map = texture
      materialRef.current.needsUpdate = true
    }
  }, [texture])

  // Target values for animation
  const targetScale = hovered ? 2 : 1
  const targetRotation = hovered ? Math.PI : 0
  const targetColor = hovered
    ? new THREE.Color(hasTexture ? '#ffcccc' : '#e45858')
    : new THREE.Color(hasTexture ? '#ffffff' : '#6246ea')

  // Smooth lerp animation each frame
  useFrame((_, delta) => {
    if (!meshRef.current) return
    const lerpFactor = 1 - Math.pow(0.1, delta)

    meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, lerpFactor)
    meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, lerpFactor)
    meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation, lerpFactor)

    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.color.lerp(targetColor, lerpFactor)
  })

  return (
    <mesh
      ref={meshRef}
      onDrop={onDrop}
      onDragOverEnter={() => {
        setHovered(true)
        onDragOverEnter()
      }}
      onDragOverLeave={() => {
        setHovered(false)
        onDragOverLeave()
      }}>
      <boxGeometry />
      <meshBasicMaterial ref={materialRef} color={hasTexture ? '#ffffff' : '#6246ea'} />
    </mesh>
  )
}

//* Main Component ==============================

export default function FileDragDrop() {
  const [activeBg, setActiveBg] = useState(false)
  const [meshFile, setMeshFile] = useState<File | null>(null)
  const [bgFile, setBgFile] = useState<File | null>(null)

  // Load textures from files using our custom hook
  const meshTexture = useFileTexture(meshFile)
  const bgTexture = useFileTexture(bgFile)

  const bgColor = activeBg ? 'lightgreen' : 'lightgray'

  // Handle dropping image on the mesh
  const handleMeshDrop = useCallback((e: ThreeEvent<DragEvent>) => {
    const file = getImageFile(e.nativeEvent.dataTransfer?.files)
    if (!file) {
      console.log('No image file found in drop')
      return
    }
    console.log('Setting mesh texture:', file.name)
    setMeshFile(file)
  }, [])

  // Handle dropping image on the background (missed mesh)
  const handleBackgroundDrop = useCallback((e: DragEvent) => {
    const file = getImageFile(e.dataTransfer?.files)
    if (!file) {
      console.log('No image file found in drop')
      return
    }
    console.log('Setting background texture:', file.name)
    setBgFile(file)
  }, [])

  // Prevent browser default drag/drop behavior
  const preventDragDropDefaults = {
    onDrop: (e: SyntheticEvent) => e.preventDefault(),
    onDragEnter: (e: SyntheticEvent) => e.preventDefault(),
    onDragOver: (e: SyntheticEvent) => e.preventDefault(),
  }

  return (
    <Canvas
      renderer
      {...preventDragDropDefaults}
      onDropMissed={(e: DragEvent) => {
        setActiveBg(false)
        handleBackgroundDrop(e)
      }}
      onDragOverMissed={() => setActiveBg(true)}>
      <Background color={bgColor} texture={bgTexture} />
      <AnimatedBox
        texture={meshTexture}
        onDrop={handleMeshDrop}
        onDragOverEnter={() => setActiveBg(false)}
        onDragOverLeave={() => {}}
      />
      <OrbitControls />
    </Canvas>
  )
}
