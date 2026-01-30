/**
 * Demo: Depth Sorting Demo
 * Features: interactivePriority
 *
 * Transform gizmo over objects. Gizmo handles always clickable
 * regardless of visual depth order.
 */

import { Canvas, ThreeEvent } from '@react-three/fiber/webgpu'
import { OrbitControls, TransformControls, Text } from '@react-three/drei'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

function GizmoHandle({
  position,
  color,
  axis,
  onDrag,
}: {
  position: [number, number, number]
  color: string
  axis: 'x' | 'y' | 'z'
  onDrag: (delta: number, axis: 'x' | 'y' | 'z') => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const lastPos = useRef<number>(0)

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setIsDragging(true)
      lastPos.current = axis === 'x' ? e.point.x : axis === 'y' ? e.point.y : e.point.z
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [axis],
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging) return
      const currentPos = axis === 'x' ? e.point.x : axis === 'y' ? e.point.y : e.point.z
      const delta = currentPos - lastPos.current
      lastPos.current = currentPos
      onDrag(delta, axis)
    },
    [isDragging, axis, onDrag],
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <mesh
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      // This ensures the gizmo is always clickable even if visually behind objects
      userData={{ interactivePriority: 100 }}>
      <boxGeometry args={[0.2, 0.2, 0.2]} />
      <meshBasicMaterial
        color={isHovered || isDragging ? '#ffffff' : color}
        transparent
        opacity={0.9}
        depthTest={false}
      />
    </mesh>
  )
}

function CustomGizmo({ target, onMove }: { target: THREE.Vector3; onMove: (position: THREE.Vector3) => void }) {
  const handleDrag = useCallback(
    (delta: number, axis: 'x' | 'y' | 'z') => {
      const newPos = target.clone()
      newPos[axis] += delta
      onMove(newPos)
    },
    [target, onMove],
  )

  return (
    <group position={target}>
      {/* Axis lines */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, 1.5, 0, 0]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ff4444" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, 0, 1.5, 0]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#44ff44" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[new Float32Array([0, 0, 0, 0, 0, 1.5]), 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#4444ff" />
      </line>

      {/* Draggable handles - always interactive due to interactivePriority */}
      <GizmoHandle position={[1.5, 0, 0]} color="#ff4444" axis="x" onDrag={handleDrag} />
      <GizmoHandle position={[0, 1.5, 0]} color="#44ff44" axis="y" onDrag={handleDrag} />
      <GizmoHandle position={[0, 0, 1.5]} color="#4444ff" axis="z" onDrag={handleDrag} />
    </group>
  )
}

function SelectableObject({
  initialPosition,
  color,
  isSelected,
  onClick,
}: {
  initialPosition: [number, number, number]
  color: string
  isSelected: boolean
  onClick: () => void
}) {
  const [position, setPosition] = useState(new THREE.Vector3(...initialPosition))

  return (
    <>
      <mesh position={position} onClick={onClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>

      {isSelected && <CustomGizmo target={position} onMove={setPosition} />}
    </>
  )
}

function BlockingObject() {
  return (
    <mesh position={[0, 1.5, 2]}>
      <boxGeometry args={[3, 3, 0.2]} />
      <meshStandardMaterial color="#666666" transparent opacity={0.5} />
      <Text position={[0, 0, 0.11]} fontSize={0.2} color="#ffffff">
        Blocking Panel
      </Text>
      <Text position={[0, -0.3, 0.11]} fontSize={0.1} color="#aaaaaa">
        Gizmo handles work through this!
      </Text>
    </mesh>
  )
}

function Scene() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0)

  const objects = [
    { position: [-2, 0.5, 0] as [number, number, number], color: '#e74c3c' },
    { position: [0, 0.5, 0] as [number, number, number], color: '#3498db' },
    { position: [2, 0.5, 0] as [number, number, number], color: '#2ecc71' },
  ]

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      {objects.map((obj, i) => (
        <SelectableObject
          key={i}
          initialPosition={obj.position}
          color={obj.color}
          isSelected={selectedIndex === i}
          onClick={() => setSelectedIndex(i)}
        />
      ))}

      {/* Semi-transparent panel that visually blocks the gizmo */}
      <BlockingObject />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Instructions */}
      <Text position={[0, 3.5, 0]} fontSize={0.2} color="#ffffff">
        Click cubes to select, drag gizmo handles to move
      </Text>
      <Text position={[0, 3.2, 0]} fontSize={0.12} color="#888888">
        interactivePriority ensures gizmo works through the blocking panel
      </Text>

      <OrbitControls makeDefault />
    </>
  )
}

export default function DepthSorting() {
  return (
    <Canvas renderer camera={{ position: [5, 4, 8], fov: 50 }}>
      <Scene />
    </Canvas>
  )
}
