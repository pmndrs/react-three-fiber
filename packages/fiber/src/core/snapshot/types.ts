import * as THREE from 'three'

export interface Object3DState {
  id: string
  name?: string
  type: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  visible: boolean
  matrix: number[]
  children: Object3DState[]
}

export interface CameraState {
  type: string
  position: [number, number, number]
  rotation: [number, number, number]
  fov?: number
  near?: number
  far?: number
  zoom?: number
  left?: number
  right?: number
  top?: number
  bottom?: number
}

export interface MaterialState {
  id: string
  name?: string
  type: string
  color?: string
  transparent?: boolean
  opacity?: number
  side?: number
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  wireframe?: boolean
}

export interface LightState {
  id: string
  type: string
  position: [number, number, number]
  color: string
  intensity: number
  castShadow?: boolean
  distance?: number
  angle?: number
  penumbra?: number
}

export interface SceneState {
  objects: Object3DState[]
  materials: MaterialState[]
  lights: LightState[]
}

export interface Snapshot {
  id: string
  name: string
  timestamp: number
  camera: CameraState
  scene: SceneState
  animationTime?: number
  metadata?: Record<string, any>
}

export interface Keyframe {
  id: string
  timestamp: number
  snapshotId: string
  interpolation: 'linear' | 'step' | 'smooth'
}

export interface AnimationSequence {
  id: string
  name: string
  keyframes: Keyframe[]
  duration: number
  loop: boolean
  fps: number
}

export interface SnapshotSystemState {
  snapshots: Map<string, Snapshot>
  currentSnapshotId: string | null
  sequences: Map<string, AnimationSequence>
  isPlaying: boolean
  isRecording: boolean
  currentTime: number
  activeSequenceId: string | null
}

export interface SnapshotSystemOptions {
  autoSave?: boolean
  maxSnapshots?: number
  includeMaterials?: boolean
  includeLights?: boolean
  deepTraversal?: boolean
}

export type SnapshotExportFormat = {
  version: string
  createdAt: number
  snapshots: Snapshot[]
  sequences?: AnimationSequence[]
  metadata?: Record<string, any>
}
