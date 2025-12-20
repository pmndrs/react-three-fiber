/**
 * WebGPU Motion Blur Post-Processing Example
 *
 * Demonstrates:
 * - WebGPU post-processing with motion blur effect
 * - usePostProcessing hook for easy PP setup
 * - useUniforms for reactive blur amount control
 * - Animated GLTF model with skeletal animation
 *
 * Based on three.js example: webgpu_postprocessing_motion_blur.html
 *
 * NOTE: We use GLTFLoader directly instead of drei's useGLTF because
 * drei imports from 'three' not 'three/webgpu', causing MRT compatibility issues.
 */

import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useTexture } from '@react-three/fiber/webgpu'
import { useUniforms, usePostProcessing } from '@react-three/fiber/webgpu'
import { useControls } from 'leva'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three/webgpu'
import { mrt, output, velocity, screenUV, texture, uv } from 'three/tsl'
import { motionBlur } from 'three/addons/tsl/display/MotionBlur.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

//* Post-Processing Manager ==============================
// This component sets up and manages the post-processing pipeline
// Uses usePostProcessing hook - no manual useFrame needed!

function PostProcessingManager() {
  // Get the blur amount uniform from shared state (registered in Experience)
  const { blurAmount } = useUniforms()

  usePostProcessing(
    // mainCB - receives full RootState, set outputNode explicitly
    ({ postProcessing, passes, uniforms }) => {
      // test if we have the uniforms yet
      console.log('uniforms', uniforms)
      // Get the rendered textures and pass to Inspector
      const beauty = passes.scenePass.getTextureNode()
      const vel = passes.scenePass.getTextureNode('velocity')

      // Use blurAmount from uniforms (or from outer scope via closure)
      const blurNode = uniforms.blurAmount ?? blurAmount
      const mBlur = motionBlur(beauty, vel.mul(blurNode))

      // Add vignette effect for polish
      // Creates a darkening at the edges of the screen
      const vignette = screenUV.distance(0.5).remap(0.6, 1).mul(2).clamp().oneMinus()

      // Explicitly set the output node
      postProcessing.outputNode = mBlur.mul(vignette)

      // Return passes to share (optional)
      return { beauty, velocity: vel, motionBlur: mBlur }
    },
    // setupCB - configure MRT on the default scenePass
    ({ passes }) => {
      passes.scenePass.setMRT(
        mrt({
          output,
          velocity,
        }),
      )
    },
  )

  return null
}

//* Animated Character (Xbot) ==============================
// Skeletal animation to showcase motion blur on character movement
// Uses GLTFLoader directly for WebGPU compatibility

function AnimatedCharacter({ speed = 1 }: { speed?: number }) {
  const group = useRef<THREE.Group>(null!)
  const [model, setModel] = useState<THREE.Group | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  // Load GLTF model directly (not using drei's useGLTF for WebGPU compatibility)
  useEffect(() => {
    const loader = new GLTFLoader()
    loader.load('/Xbot.glb', (gltf) => {
      const scene = gltf.scene

      // Enable shadows on all meshes
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      // Set up animation mixer
      const mixer = new THREE.AnimationMixer(scene)
      mixerRef.current = mixer

      // Play animation (index 3 is usually a good run/walk animation)
      if (gltf.animations.length > 0) {
        const clip = gltf.animations[3] || gltf.animations[0]
        const action = mixer.clipAction(clip)
        action.play()
      }

      setModel(scene)
    })

    return () => {
      mixerRef.current?.stopAllAction()
    }
  }, [])

  // Update animation speed
  useEffect(() => {
    if (mixerRef.current) {
      mixerRef.current.timeScale = speed
    }
  }, [speed])

  // Update animation mixer each frame
  useFrame((_, delta) => {
    mixerRef.current?.update(delta)
  })

  if (!model) return null

  return (
    <group ref={group} rotation={[0, Math.PI / 2, 0]}>
      <primitive object={model} />
    </group>
  )
}

//* Animated Torus ==============================
// Rotating torus with UV texture to showcase motion blur

interface AnimatedTorusProps {
  position: [number, number, number]
  direction?: 1 | -1
}

function AnimatedTorus({ position, direction = 1 }: AnimatedTorusProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const map = useTexture('/uv_grid_opengl.jpg')

  // Configure texture properties
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace
  }, [map])

  // Animate rotation
  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * 4 * direction
  })

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[0.8, 0.3, 16, 32]} />
      <meshBasicMaterial map={map} />
    </mesh>
  )
}

//* Scaling Torus ==============================
// Torus that pulses in scale to show motion blur on scale changes

function ScalingTorus({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const clockRef = useRef(new THREE.Clock())
  const map = useTexture('/uv_grid_opengl.jpg')

  // Configure texture properties
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace
  }, [map])

  // Animate scale pulsing
  useFrame(() => {
    if (!meshRef.current) return
    const elapsed = clockRef.current.getElapsedTime()
    const scale = 1 + Math.sin(elapsed * 10) * 0.2
    meshRef.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={meshRef} position={position}>
      <torusGeometry args={[0.8, 0.3, 16, 32]} />
      <meshBasicMaterial map={map} />
    </mesh>
  )
}

//* Floor ==============================
// Uses MeshPhongNodeMaterial for proper WebGPU MRT velocity support

function Floor() {
  const floorColor = useTexture('/FloorsCheckerboard_S_Diffuse.jpg', (t) => setupRepeat(t))

  // Create NodeMaterial with TSL texture node (like vanilla example)
  // Memoize to avoid recreating on every render
  const floorMaterial = useMemo(() => {
    const mat = new THREE.MeshPhongNodeMaterial()
    const floorUV = uv().mul(5)
    mat.colorNode = texture(floorColor, floorUV)
    return mat
  }, [floorColor])

  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMaterial}>
      <planeGeometry args={[15, 15]} />
    </mesh>
  )
}

//* Walls (Background Box) ==============================
// Uses MeshPhongNodeMaterial for proper WebGPU MRT velocity support

function Walls() {
  const wallColor = useTexture('/FloorsCheckerboard_S_Diffuse.jpg', (t) => setupRepeat(t))

  // Create NodeMaterial with TSL texture node (like vanilla example)
  // Memoize to avoid recreating on every render
  const wallMaterial = useMemo(() => {
    const mat = new THREE.MeshPhongNodeMaterial({ side: THREE.BackSide })
    const wallUV = uv().mul(5)
    mat.colorNode = texture(wallColor, wallUV)
    return mat
  }, [wallColor])

  return (
    <mesh material={wallMaterial}>
      <boxGeometry args={[15, 15, 15]} />
    </mesh>
  )
}

//* Lights ==============================

function Lights() {
  return (
    <>
      {/* Sun light with shadows */}
      <directionalLight
        position={[4, 4, 2]}
        intensity={5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-bias={-0.001}
      />
      {/* Sky ambient */}
      <hemisphereLight args={['#74ccf4', '#333366', 5]} />
      {/* Water ambient */}
      <hemisphereLight args={['#333366', '#74ccf4', 5]} />
    </>
  )
}

//* Experience (Main Scene Content) ==============================

function Experience() {
  // Leva controls for blur amount and animation speed
  const levaControls = useControls('Motion Blur', {
    blurAmount: { value: 1.0, min: 0, max: 3, step: 0.1 },
    speed: { value: 1.0, min: 0, max: 2, step: 0.1 },
    autoRotate: { value: true },
  })

  // Register uniforms with R3F state (makes them available to PostProcessingManager)
  useUniforms({ blurAmount: levaControls.blurAmount })

  return (
    <>
      <Lights />
      <Floor />
      <Walls />

      {/* Animated character - the main attraction for motion blur */}
      <AnimatedCharacter speed={levaControls.speed} />

      {/* Animated torus objects to showcase motion blur */}
      <AnimatedTorus position={[3.5, 1.5, -4]} direction={1} />
      <ScalingTorus position={[-3.5, 1.5, -4]} />

      {/* Post-processing manager - takes over rendering */}
      <PostProcessingManager />

      {/* Camera controls with auto-rotate */}
      <OrbitControls
        autoRotate={levaControls.autoRotate}
        autoRotateSpeed={1}
        minDistance={1}
        maxDistance={10}
        maxPolarAngle={Math.PI / 2}
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  )
}

//* Main App Export ==============================

export default function WebGPUMotionBlur() {
  return (
    <Canvas renderer camera={{ fov: 50, position: [0, 1.5, 4.5], near: 0.25, far: 30 }} shadows>
      <fog attach="fog" args={['#0487e2', 7, 25]} />
      <Experience />
    </Canvas>
  )
}

// helper util to setup repeatings
function setupRepeat(texture: THREE.Texture) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(5, 5)
  texture.colorSpace = THREE.SRGBColorSpace
}
