import * as THREE from 'three'

export interface CameraSnapshot {
  type: 'PerspectiveCamera' | 'OrthographicCamera'
  position: [number, number, number]
  rotation: [number, number, number]
  quaternion: [number, number, number, number]
  up: [number, number, number]
  near: number
  far: number
  fov?: number
  zoom?: number
  left?: number
  right?: number
  top?: number
  bottom?: number
}

export interface ObjectSnapshot {
  uuid: string
  name: string
  type: string
  position: [number, number, number]
  rotation: [number, number, number]
  quaternion: [number, number, number, number]
  scale: [number, number, number]
  visible: boolean
  castShadow?: boolean
  receiveShadow?: boolean
  userData: Record<string, unknown>
  children?: ObjectSnapshot[]
}

export interface MaterialSnapshot {
  uuid: string
  type: string
  name: string
  visible: boolean
  transparent: boolean
  opacity: number
  side: number
  color?: string | number
  emissive?: string | number
  roughness?: number
  metalness?: number
  map?: string | null
  normalMap?: string | null
}

export interface GeometrySnapshot {
  uuid: string
  type: string
  name: string
  position?: Float32Array
  normal?: Float32Array
  uv?: Float32Array
  index?: Uint32Array | null
}

export interface MeshSnapshot extends ObjectSnapshot {
  geometry?: GeometrySnapshot
  material?: MaterialSnapshot | MaterialSnapshot[]
}

export interface LightSnapshot extends ObjectSnapshot {
  color: string | number
  intensity: number
  castShadow?: boolean
  shadow?: {
    mapSize?: [number, number]
    bias?: number
    radius?: number
  }
}

export interface SceneSnapshot {
  version: string
  timestamp: number
  name?: string
  camera: CameraSnapshot
  scene: ObjectSnapshot
  environment?: string | null
  fog?: {
    type: 'Fog' | 'FogExp2'
    color: string | number
    near?: number
    far?: number
    density?: number
  } | null
}

export interface Keyframe {
  id: string
  time: number
  snapshot: SceneSnapshot
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce'
  label?: string
}

export interface AnimationTrack {
  id: string
  name: string
  keyframes: Keyframe[]
  duration: number
  loop: boolean
  loopCount: number
}

export interface SnapshotConfig {
  version: string
  name: string
  description?: string
  createdAt?: number
  updatedAt?: number
  snapshots: SceneSnapshot[]
  animations: AnimationTrack[]
}

export interface SnapshotOptions {
  includeGeometry?: boolean
  includeMaterials?: boolean
  includeUserData?: boolean
  includeChildren?: boolean
  depthLimit?: number
  filter?: (object: THREE.Object3D) => boolean
}

export interface RestoreOptions {
  restoreCamera?: boolean
  restoreObjects?: boolean
  restoreMaterials?: boolean
  restoreUserData?: boolean
  transitionDuration?: number
  easing?: Keyframe['easing']
}

export interface SnapshotState {
  snapshots: Map<string, SceneSnapshot>
  currentSnapshotId: string | null
  isRecording: boolean
  recordingStartTime: number | null
  recordedKeyframes: Keyframe[]
}

export interface UseSnapshotReturn {
  snapshots: Map<string, SceneSnapshot>
  currentSnapshot: SceneSnapshot | null
  isRecording: boolean
  capture: (name?: string, options?: SnapshotOptions) => string
  restore: (id: string, options?: RestoreOptions) => void
  delete: (id: string) => void
  clear: () => void
  startRecording: () => void
  stopRecording: () => Keyframe[]
  addKeyframe: (label?: string) => Keyframe
  exportConfig: () => SnapshotConfig
  importConfig: (config: SnapshotConfig) => void
  getSnapshotById: (id: string) => SceneSnapshot | undefined
  getSnapshotByName: (name: string) => SceneSnapshot | undefined
  listSnapshots: () => { id: string; name?: string; timestamp: number }[]
}

export interface SnapshotPlayerProps {
  animation: AnimationTrack
  playing?: boolean
  currentTime?: number
  loop?: boolean
  speed?: number
  onFrame?: (snapshot: SceneSnapshot, progress: number) => void
  onComplete?: () => void
  onTimeUpdate?: (time: number) => void
}

export interface TimelinePanelProps {
  animation: AnimationTrack
  currentTime: number
  playing: boolean
  onTimeChange: (time: number) => void
  onPlayPause: () => void
  onKeyframeAdd: () => void
  onKeyframeDelete: (id: string) => void
  onKeyframeMove: (id: string, newTime: number) => void
  onKeyframeSelect: (id: string | null) => void
  selectedKeyframeId: string | null
}

export interface TimelineProps {
  duration: number
  currentTime: number
  keyframes: Keyframe[]
  onTimeChange: (time: number) => void
  onKeyframeClick: (keyframe: Keyframe) => void
  selectedKeyframeId: string | null
}

export interface EasingFunction {
  (t: number): number
}

export const EasingFunctions: Record<NonNullable<Keyframe['easing']>, EasingFunction> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  bounce: (t) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
}
