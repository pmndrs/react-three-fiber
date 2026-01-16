//* Visibility Events Demo ==============================
// Testing CPU-side occlusion queries via cached results from render pass

import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import { nodeObject, uniform } from 'three/tsl'

//* ==============================
//* SHARED OCCLUSION CACHE
//* ==============================
// The key insight: renderer.isOccluded() only works DURING render when
// _currentRenderContext is set. We need to cache results during render
// and read from the cache in useFrame.

const occlusionCache = new Map<THREE.Object3D, boolean | null>()

// Registry of objects to check - any object can register here
const occlusionRegistry = new Set<THREE.Object3D>()

// OcclusionObserverNode - ONE node checks ALL registered objects
class OcclusionObserverNode extends THREE.Node {
  frameCount = 0

  constructor() {
    super('float')
    this.updateType = THREE.NodeUpdateType.OBJECT
  }

  update(frame: any) {
    this.frameCount++

    // During render, check ALL registered objects and cache results
    for (const obj of occlusionRegistry) {
      const isOccluded = frame.renderer.isOccluded(obj)
      occlusionCache.set(obj, isOccluded)
    }

    // Log every 60 frames to confirm update() is running
    if (this.frameCount % 60 === 0) {
      const results: Record<string, boolean | null> = {}
      for (const obj of occlusionRegistry) {
        results[obj.uuid.slice(0, 6)] = occlusionCache.get(obj) ?? null
      }
      console.log('%c[Observer.update]', 'color: #a855f7', {
        frame: this.frameCount,
        registrySize: occlusionRegistry.size,
        cacheSize: occlusionCache.size,
        results,
      })
    }
  }

  setup() {
    return uniform(0)
  }
}

// Helper to register an object for occlusion checking
function registerForOcclusion(obj: THREE.Object3D) {
  obj.occlusionTest = true
  occlusionRegistry.add(obj)
  console.log('%c[Registry] Added', 'color: #4ade80', obj.uuid.slice(0, 6))
}

function unregisterFromOcclusion(obj: THREE.Object3D) {
  occlusionRegistry.delete(obj)
  occlusionCache.delete(obj)
}

//* ==============================
//* CPU-SIDE OCCLUSION TEST (using shared registry)
//* ==============================

function CPUOcclusionTest() {
  const sphereRef = useRef<THREE.Mesh>(null)
  const [cpuResult, setCpuResult] = useState<boolean | null>('init' as any)
  const frameCount = useRef(0)

  // Just register the sphere - no material modification needed!
  useEffect(() => {
    if (!sphereRef.current) return
    registerForOcclusion(sphereRef.current)
    return () => {
      if (sphereRef.current) unregisterFromOcclusion(sphereRef.current)
    }
  }, [])

  // Read from cache in useFrame
  useFrame(() => {
    if (!sphereRef.current) return
    frameCount.current++

    // Read from shared cache
    const cachedResult = occlusionCache.get(sphereRef.current)

    // Log every 60 frames
    if (frameCount.current % 60 === 0) {
      console.log('%c[CPU useFrame]', 'color: #fbbf24', {
        frame: frameCount.current,
        cachedResult,
        registrySize: occlusionRegistry.size,
        cacheSize: occlusionCache.size,
      })
    }

    // Update state only on change
    if (cachedResult !== cpuResult && cachedResult !== undefined) {
      setCpuResult(cachedResult)
      console.log('%c[CPU] State changed!', 'color: #22c55e; font-weight: bold', {
        from: cpuResult,
        to: cachedResult,
      })
    }
  })

  return (
    <group position={[-3, 0, 0]}>
      {/* Plane in front - NO node attached, just a plain material */}
      <mesh>
        <planeGeometry args={[2, 2]} />
        <meshStandardNodeMaterial
          color={cpuResult === true ? '#00ff00' : cpuResult === false ? '#0000ff' : '#888888'}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sphere behind - registered for occlusion testing */}
      <mesh ref={sphereRef} position={[0, 0, -1]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardNodeMaterial color="#ffff00" />
      </mesh>
    </group>
  )
}

//* ==============================
//* NODE-BASED OCCLUSION (Visual Reference)
//* ==============================

// This one changes color visually - used as reference to compare
class OcclusionColorNode extends THREE.Node {
  testObject: THREE.Object3D
  normalColor: THREE.Color
  occludedColor: THREE.Color
  uniformNode: ReturnType<typeof uniform>

  constructor(testObject: THREE.Object3D, normalColor: THREE.Color, occludedColor: THREE.Color) {
    super('vec3')
    this.updateType = THREE.NodeUpdateType.OBJECT
    this.uniformNode = uniform(new THREE.Color())
    this.testObject = testObject
    this.normalColor = normalColor
    this.occludedColor = occludedColor
  }

  update(frame: any) {
    const isOccluded = frame.renderer.isOccluded(this.testObject)
    const color = isOccluded === true ? this.occludedColor : this.normalColor
    ;(this.uniformNode.value as THREE.Color).copy(color)
  }

  setup() {
    return this.uniformNode
  }
}

function NodeOcclusionTest() {
  const sphereRef = useRef<THREE.Mesh>(null)
  const planeRef = useRef<THREE.Mesh>(null)
  const [isSetup, setIsSetup] = useState(false)

  useEffect(() => {
    if (!sphereRef.current || !planeRef.current || isSetup) return

    const sphere = sphereRef.current
    const plane = planeRef.current

    // Also register this sphere so the Observer caches it too!
    registerForOcclusion(sphere)

    const occlusionNode = nodeObject(
      new OcclusionColorNode(sphere, new THREE.Color(0x0000ff), new THREE.Color(0x00ff00)) as any,
    )

    const planeMaterial = plane.material as THREE.MeshPhongNodeMaterial
    ;(planeMaterial as any).colorNode = occlusionNode
    planeMaterial.needsUpdate = true

    setIsSetup(true)

    return () => {
      if (sphere) unregisterFromOcclusion(sphere)
    }
  }, [isSetup])

  return (
    <group position={[3, 0, 0]}>
      {/* Plane in front - color changes via Node */}
      <mesh ref={planeRef}>
        <planeGeometry args={[2, 2]} />
        <meshPhongNodeMaterial color={0x00ff00} side={THREE.DoubleSide} />
      </mesh>

      {/* Sphere behind */}
      <mesh ref={sphereRef} position={[0, 0, -1]}>
        <sphereGeometry args={[0.5]} />
        <meshPhongNodeMaterial color={0xffff00} />
      </mesh>
    </group>
  )
}

//* ==============================
//* INVISIBLE OBSERVER - hosts the single Node that checks ALL objects
//* ==============================

function OcclusionObserver() {
  const observerRef = useRef<THREE.Mesh>(null)
  const [isSetup, setIsSetup] = useState(false)

  useEffect(() => {
    if (!observerRef.current || isSetup) return

    // Disable frustum culling so it always renders!
    observerRef.current.frustumCulled = false

    // Create the observer node and attach to this invisible mesh
    const observerNode = nodeObject(new OcclusionObserverNode() as any)
    const material = observerRef.current.material as THREE.MeshBasicNodeMaterial
    ;(material as any).colorNode = observerNode
    material.needsUpdate = true

    console.log('%c[Observer] Invisible observer mesh ready', 'color: #a855f7; font-weight: bold', {
      registrySize: occlusionRegistry.size,
    })
    setIsSetup(true)
  }, [isSetup])

  return (
    // Tiny mesh with frustumCulled=false so it ALWAYS renders
    // Position doesn't matter since frustum culling is disabled
    <mesh ref={observerRef} visible={true} scale={0.0001}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicNodeMaterial transparent opacity={0} />
    </mesh>
  )
}

//* Main Scene --------------------------------
function Scene() {
  return (
    <>
      <ambientLight intensity={Math.PI * 0.5} />
      <directionalLight position={[0.32, 0.39, 0.7]} intensity={1} />

      {/* THE KEY: One invisible observer checks ALL registered objects */}
      <OcclusionObserver />

      {/* CPU-side test (LEFT) - just registers, no material mod */}
      <CPUOcclusionTest />

      {/* Node-based test (RIGHT) - reference */}
      <NodeOcclusionTest />

      <gridHelper args={[20, 20, '#444', '#333']} position={[0, -2, 0]} />
      <OrbitControls makeDefault minDistance={3} maxDistance={25} />
    </>
  )
}

//* Instructions --------------------------------
function Instructions() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        padding: 16,
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 8,
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 14,
        maxWidth: 420,
      }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Occlusion: Cached CPU vs Direct Node</h3>

      <div style={{ marginBottom: 12 }}>
        <strong style={{ color: '#fbbf24' }}>LEFT: CPU-side (cached via Node)</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
          Node caches isOccluded() during render → useFrame reads from cache.
          <br />
          BLUE = visible, GREEN = occluded, GRAY = no data yet
        </p>
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong style={{ color: '#22c55e' }}>RIGHT: Direct Node (reference)</strong>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>
          OcclusionNode changes color directly during render.
          <br />
          BLUE = visible, GREEN = occluded
        </p>
      </div>

      <p style={{ margin: '12px 0 0 0', fontSize: 11, opacity: 0.6 }}>
        Both planes should change color identically when you rotate the camera.
        <br />
        This proves CPU-side occlusion works via caching!
      </p>
    </div>
  )
}

//* Main App --------------------------------
export default function VisibilityEventsDemo() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 7], fov: 50, near: 0.01, far: 100 }} renderer>
        <color attach="background" args={['#1a1a2e']} />
        <Scene />
      </Canvas>
      <Instructions />
    </div>
  )
}
