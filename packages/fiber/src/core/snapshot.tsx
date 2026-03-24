import * as THREE from 'three'
import * as React from 'react'
import { useThree, useFrame } from './hooks'
import { RootState } from './store'

// ============================================================================
// Types
// ============================================================================

export interface TransformState {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  quaternion?: [number, number, number, number]
}

export interface CameraState extends TransformState {
  fov?: number
  zoom?: number
  near: number
  far: number
  aspect?: number
  left?: number
  right?: number
  top?: number
  bottom?: number
  isOrthographic: boolean
}

export interface MaterialState {
  type: string
  uuid: string
  name: string
  color?: string | number | { r: number; g: number; b: number }
  emissive?: string | number | { r: number; g: number; b: number }
  roughness?: number
  metalness?: number
  opacity?: number
  transparent?: boolean
  wireframe?: boolean
  visible?: boolean
  side?: number
  [key: string]: any
}

export interface ObjectState {
  uuid: string
  name: string
  type: string
  visible: boolean
  transform: TransformState
  material?: string | MaterialState | (string | MaterialState)[]
  userData?: Record<string, any>
  children?: string[]
  parent?: string | null
}

export interface LightState extends ObjectState {
  intensity: number
  color: string | number | { r: number; g: number; b: number }
  distance?: number
  decay?: number
  angle?: number
  penumbra?: number
}

export interface SceneState {
  camera: CameraState
  objects: Record<string, ObjectState>
  lights: Record<string, LightState>
  materials: Record<string, MaterialState>
  background?: string | number | { r: number; g: number; b: number } | null
  fog?: {
    color: string | number | { r: number; g: number; b: number }
    near?: number
    far?: number
    density?: number
  } | null
  timestamp: number
  metadata?: SnapshotMetadata
}

export interface SnapshotMetadata {
  name?: string
  description?: string
  tags?: string[]
  createdAt: number
  version: string
}

export interface Snapshot {
  id: string
  state: SceneState
  thumbnail?: string
}

export interface Keyframe {
  id: string
  snapshotId: string
  time: number
  duration?: number
  easing?: EasingFunction
}

export type EasingFunction =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'

export interface AnimationSequence {
  id: string
  name: string
  keyframes: Keyframe[]
  totalDuration: number
  loop: boolean
}

export interface SnapshotStore {
  snapshots: Snapshot[]
  currentSnapshotId: string | null
  sequences: AnimationSequence[]
  currentSequenceId: string | null
}

export interface SnapshotOptions {
  includeCamera?: boolean
  includeObjects?: boolean
  includeMaterials?: boolean
  includeLights?: boolean
  includeEnvironment?: boolean
  filterObjects?: (object: THREE.Object3D) => boolean
  metadata?: SnapshotMetadata
}

export interface ApplySnapshotOptions {
  transitionDuration?: number
  easing?: EasingFunction
  onComplete?: () => void
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function serializeColor(color: THREE.Color | number | string): string | number | { r: number; g: number; b: number } {
  if (color instanceof THREE.Color) {
    return { r: color.r, g: color.g, b: color.b }
  }
  return color
}

function deserializeColor(color: string | number | { r: number; g: number; b: number }): THREE.Color {
  if (typeof color === 'object' && 'r' in color) {
    return new THREE.Color(color.r, color.g, color.b)
  }
  return new THREE.Color(color)
}

function serializeTransform(object: THREE.Object3D): TransformState {
  return {
    position: object.position.toArray() as [number, number, number],
    rotation: object.rotation.toArray().slice(0, 3) as [number, number, number],
    scale: object.scale.toArray() as [number, number, number],
    quaternion: object.quaternion.toArray() as [number, number, number, number],
  }
}

function deserializeTransform(object: THREE.Object3D, transform: TransformState): void {
  object.position.set(...transform.position)
  object.scale.set(...transform.scale)
  if (transform.quaternion) {
    object.quaternion.set(...transform.quaternion)
  } else {
    object.rotation.set(...transform.rotation)
  }
}

function serializeCamera(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera): CameraState {
  const base: CameraState = {
    ...serializeTransform(camera),
    near: camera.near,
    far: camera.far,
    isOrthographic: (camera as THREE.OrthographicCamera).isOrthographicCamera ?? false,
  }

  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const pcam = camera as THREE.PerspectiveCamera
    base.fov = pcam.fov
    base.zoom = pcam.zoom
    base.aspect = pcam.aspect
  } else if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ocam = camera as THREE.OrthographicCamera
    base.zoom = ocam.zoom
    base.left = ocam.left
    base.right = ocam.right
    base.top = ocam.top
    base.bottom = ocam.bottom
  }

  return base
}

function deserializeCamera(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, state: CameraState): void {
  deserializeTransform(camera, state)
  camera.near = state.near
  camera.far = state.far

  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera && state.fov !== undefined) {
    const pcam = camera as THREE.PerspectiveCamera
    pcam.fov = state.fov
    if (state.zoom !== undefined) pcam.zoom = state.zoom
    if (state.aspect !== undefined) pcam.aspect = state.aspect
    pcam.updateProjectionMatrix()
  } else if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const ocam = camera as THREE.OrthographicCamera
    if (state.zoom !== undefined) ocam.zoom = state.zoom
    if (state.left !== undefined) ocam.left = state.left
    if (state.right !== undefined) ocam.right = state.right
    if (state.top !== undefined) ocam.top = state.top
    if (state.bottom !== undefined) ocam.bottom = state.bottom
    ocam.updateProjectionMatrix()
  }
}

function serializeMaterial(material: THREE.Material): MaterialState {
  const state: MaterialState = {
    type: material.type,
    uuid: material.uuid,
    name: material.name,
    visible: material.visible,
  }

  const mat = material as any

  if (mat.color !== undefined) state.color = serializeColor(mat.color)
  if (mat.emissive !== undefined) state.emissive = serializeColor(mat.emissive)
  if (mat.roughness !== undefined) state.roughness = mat.roughness
  if (mat.metalness !== undefined) state.metalness = mat.metalness
  if (mat.opacity !== undefined) state.opacity = mat.opacity
  if (mat.transparent !== undefined) state.transparent = mat.transparent
  if (mat.wireframe !== undefined) state.wireframe = mat.wireframe
  if (mat.side !== undefined) state.side = mat.side

  return state
}

function deserializeMaterial(material: THREE.Material, state: MaterialState): void {
  const mat = material as any

  material.visible = state.visible ?? material.visible

  if (state.color !== undefined && mat.color !== undefined) {
    mat.color = deserializeColor(state.color)
  }
  if (state.emissive !== undefined && mat.emissive !== undefined) {
    mat.emissive = deserializeColor(state.emissive)
  }
  if (state.roughness !== undefined && mat.roughness !== undefined) mat.roughness = state.roughness
  if (state.metalness !== undefined && mat.metalness !== undefined) mat.metalness = state.metalness
  if (state.opacity !== undefined && mat.opacity !== undefined) mat.opacity = state.opacity
  if (state.transparent !== undefined && mat.transparent !== undefined) mat.transparent = state.transparent
  if (state.wireframe !== undefined && mat.wireframe !== undefined) mat.wireframe = state.wireframe
  if (state.side !== undefined && mat.side !== undefined) mat.side = state.side

  material.needsUpdate = true
}

function serializeObject(object: THREE.Object3D): ObjectState {
  const state: ObjectState = {
    uuid: object.uuid,
    name: object.name,
    type: object.type,
    visible: object.visible,
    transform: serializeTransform(object),
    userData: { ...object.userData },
    children: object.children.map((c) => c.uuid),
    parent: object.parent?.uuid ?? null,
  }

  if ((object as THREE.Mesh).isMesh) {
    const mesh = object as THREE.Mesh
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        state.material = mesh.material.map((m) => m.uuid)
      } else {
        state.material = mesh.material.uuid
      }
    }
  }

  return state
}

function serializeLight(light: THREE.Light): LightState {
  const base = serializeObject(light)
  const l = light as any

  return {
    ...base,
    intensity: light.intensity,
    color: serializeColor(light.color),
    distance: l.distance,
    decay: l.decay,
    angle: l.angle,
    penumbra: l.penumbra,
  }
}

// ============================================================================
// Easing Functions
// ============================================================================

const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
}

function interpolateValue(start: number, end: number, t: number, easing: EasingFunction = 'linear'): number {
  const easedT = easingFunctions[easing](t)
  return start + (end - start) * easedT
}

function interpolateTransform(
  start: TransformState,
  end: TransformState,
  t: number,
  easing: EasingFunction = 'linear',
): TransformState {
  const easedT = easingFunctions[easing](t)

  return {
    position: start.position.map((v, i) => v + (end.position[i] - v) * easedT) as [number, number, number],
    rotation: start.rotation.map((v, i) => v + (end.rotation[i] - v) * easedT) as [number, number, number],
    scale: start.scale.map((v, i) => v + (end.scale[i] - v) * easedT) as [number, number, number],
    quaternion: start.quaternion && end.quaternion
      ? new THREE.Quaternion()
          .set(...start.quaternion)
          .slerp(new THREE.Quaternion().set(...end.quaternion), easedT)
          .toArray() as [number, number, number, number]
      : end.quaternion,
  }
}

// ============================================================================
// Snapshot Context
// ============================================================================

interface SnapshotContextValue {
  store: SnapshotStore
  captureSnapshot: (options?: SnapshotOptions) => Snapshot
  applySnapshot: (snapshot: Snapshot, options?: ApplySnapshotOptions) => void
  deleteSnapshot: (id: string) => void
  updateSnapshot: (id: string, updates: Partial<Snapshot>) => void
  exportSnapshot: (id: string) => string
  importSnapshot: (json: string) => Snapshot | null
  createSequence: (name: string, keyframes: Omit<Keyframe, 'id'>[]) => AnimationSequence
  playSequence: (sequenceId: string) => void
  stopSequence: () => void
  isPlaying: boolean
  currentTime: number
}

const SnapshotContext = React.createContext<SnapshotContextValue | null>(null)

// ============================================================================
// useSnapshot Hook
// ============================================================================

export interface UseSnapshotReturn {
  snapshots: Snapshot[]
  currentSnapshot: Snapshot | null
  capture: (options?: SnapshotOptions) => Snapshot
  apply: (snapshot: Snapshot | string, options?: ApplySnapshotOptions) => void
  remove: (id: string) => void
  update: (id: string, updates: Partial<Snapshot>) => void
  exportToJSON: (id: string) => string
  importFromJSON: (json: string) => Snapshot | null
  sequences: AnimationSequence[]
  currentSequence: AnimationSequence | null
  createSequence: (name: string, keyframes: Omit<Keyframe, 'id'>[]) => AnimationSequence
  play: (sequenceId: string) => void
  stop: () => void
  isPlaying: boolean
  currentTime: number
  goToTime: (time: number) => void
}

export function useSnapshot(): UseSnapshotReturn {
  const context = React.useContext(SnapshotContext)
  if (!context) {
    throw new Error('useSnapshot must be used within a SnapshotProvider')
  }

  const { store, captureSnapshot, applySnapshot, deleteSnapshot, updateSnapshot, exportSnapshot, importSnapshot, createSequence, playSequence, stopSequence, isPlaying, currentTime } = context

  const currentSnapshot = store.currentSnapshotId
    ? store.snapshots.find((s) => s.id === store.currentSnapshotId) ?? null
    : null

  const currentSequence = store.currentSequenceId
    ? store.sequences.find((s) => s.id === store.currentSequenceId) ?? null
    : null

  return {
    snapshots: store.snapshots,
    currentSnapshot,
    capture: captureSnapshot,
    apply: (snapshot, options) => {
      if (typeof snapshot === 'string') {
        const found = store.snapshots.find((s) => s.id === snapshot)
        if (found) applySnapshot(found, options)
      } else {
        applySnapshot(snapshot, options)
      }
    },
    remove: deleteSnapshot,
    update: updateSnapshot,
    exportToJSON: exportSnapshot,
    importFromJSON: importSnapshot,
    sequences: store.sequences,
    currentSequence,
    createSequence,
    play: playSequence,
    stop: stopSequence,
    isPlaying,
    currentTime,
    goToTime: () => {},
  }
}

// ============================================================================
// Snapshot Provider
// ============================================================================

export interface SnapshotProviderProps {
  children: React.ReactNode
  maxSnapshots?: number
  onSnapshotChange?: (snapshot: Snapshot | null) => void
}

export function SnapshotProvider({ children, maxSnapshots = 50, onSnapshotChange }: SnapshotProviderProps): React.ReactElement {
  const [store, setStore] = React.useState<SnapshotStore>({
    snapshots: [],
    currentSnapshotId: null,
    sequences: [],
    currentSequenceId: null,
  })
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)

  const { scene, camera } = useThree((state) => ({ scene: state.scene, camera: state.camera }))
  const playingRef = React.useRef(false)
  const currentSequenceRef = React.useRef<AnimationSequence | null>(null)
  const animationStartTimeRef = React.useRef<number>(0)

  const captureSnapshot = React.useCallback((options: SnapshotOptions = {}): Snapshot => {
    const {
      includeCamera = true,
      includeObjects = true,
      includeMaterials = true,
      includeLights = true,
      includeEnvironment = true,
      filterObjects,
      metadata,
    } = options

    const state: SceneState = {
      camera: includeCamera ? serializeCamera(camera) : ({} as CameraState),
      objects: {},
      lights: {},
      materials: {},
      timestamp: Date.now(),
      metadata: metadata ?? {
        createdAt: Date.now(),
        version: '1.0.0',
      },
    }

    if (includeEnvironment) {
      if (scene.background) {
        if ((scene.background as THREE.Color).isColor) {
          state.background = serializeColor(scene.background as THREE.Color)
        }
      }
      if (scene.fog) {
        state.fog = {
          color: serializeColor(scene.fog.color),
          near: (scene.fog as THREE.Fog).near,
          far: (scene.fog as THREE.Fog).far,
          density: (scene.fog as THREE.FogExp2).density,
        }
      }
    }

    const materialSet = new Set<THREE.Material>()

    scene.traverse((object) => {
      if (filterObjects && !filterObjects(object)) return

      if (includeObjects && (object as THREE.Mesh).isMesh) {
        state.objects[object.uuid] = serializeObject(object)
        const mesh = object as THREE.Mesh
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => materialSet.add(m))
          } else {
            materialSet.add(mesh.material)
          }
        }
      }

      if (includeLights && (object as THREE.Light).isLight) {
        state.lights[object.uuid] = serializeLight(object as THREE.Light)
      }
    })

    if (includeMaterials) {
      materialSet.forEach((material) => {
        state.materials[material.uuid] = serializeMaterial(material)
      })
    }

    const snapshot: Snapshot = {
      id: generateId(),
      state,
    }

    setStore((prev) => {
      const newSnapshots = [...prev.snapshots, snapshot]
      if (newSnapshots.length > maxSnapshots) {
        newSnapshots.shift()
      }
      return {
        ...prev,
        snapshots: newSnapshots,
        currentSnapshotId: snapshot.id,
      }
    })

    onSnapshotChange?.(snapshot)
    return snapshot
  }, [camera, scene, maxSnapshots, onSnapshotChange])

  const applySnapshot = React.useCallback((snapshot: Snapshot, options: ApplySnapshotOptions = {}) => {
    const { transitionDuration = 0, easing = 'linear', onComplete } = options
    const { state } = snapshot

    if (transitionDuration > 0) {
      const startState = captureSnapshot({
        includeCamera: true,
        includeObjects: true,
        includeMaterials: true,
        includeLights: true,
        includeEnvironment: true,
      })

      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / transitionDuration, 1)

        if (state.camera && startState.state.camera) {
          const interpolatedCamera = interpolateCamera(startState.state.camera, state.camera, progress, easing)
          deserializeCamera(camera, interpolatedCamera)
        }

        scene.traverse((object) => {
          if ((object as THREE.Mesh).isMesh && state.objects[object.uuid]) {
            const targetState = state.objects[object.uuid]
            const startTransform = startState.state.objects[object.uuid]?.transform
            if (startTransform) {
              const interpolated = interpolateTransform(startTransform, targetState.transform, progress, easing)
              deserializeTransform(object, interpolated)
            }
          }
        })

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          finalizeApply()
          onComplete?.()
        }
      }

      requestAnimationFrame(animate)
    } else {
      finalizeApply()
    }

    function finalizeApply() {
      if (state.camera) {
        deserializeCamera(camera, state.camera)
      }

      if (state.background !== undefined) {
        if (state.background === null) {
          scene.background = null
        } else {
          scene.background = deserializeColor(state.background)
        }
      }

      if (state.fog !== undefined) {
        if (state.fog === null) {
          scene.fog = null
        } else {
          // Note: Fog reconstruction would need more context
        }
      }

      Object.entries(state.objects).forEach(([uuid, objectState]) => {
        const object = scene.getObjectByProperty('uuid', uuid)
        if (object) {
          deserializeTransform(object, objectState.transform)
          object.visible = objectState.visible
        }
      })

      Object.entries(state.materials).forEach(([uuid, materialState]) => {
        let material: THREE.Material | undefined
        scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            const found = materials.find((m) => m.uuid === uuid)
            if (found) material = found
          }
        })
        if (material) {
          deserializeMaterial(material, materialState)
        }
      })

      Object.entries(state.lights).forEach(([uuid, lightState]) => {
        const light = scene.getObjectByProperty('uuid', uuid) as THREE.Light
        if (light) {
          light.intensity = lightState.intensity
          light.color = deserializeColor(lightState.color)
        }
      })
    }

    function interpolateCamera(start: CameraState, end: CameraState, t: number, easing: EasingFunction): CameraState {
      return {
        ...end,
        ...interpolateTransform(start, end, t, easing),
        fov: start.fov !== undefined && end.fov !== undefined
          ? interpolateValue(start.fov, end.fov, t, easing)
          : end.fov,
        zoom: start.zoom !== undefined && end.zoom !== undefined
          ? interpolateValue(start.zoom, end.zoom, t, easing)
          : end.zoom,
        near: interpolateValue(start.near, end.near, t, easing),
        far: interpolateValue(start.far, end.far, t, easing),
      }
    }

    setStore((prev) => ({
      ...prev,
      currentSnapshotId: snapshot.id,
    }))

    onSnapshotChange?.(snapshot)
  }, [camera, scene, captureSnapshot, onSnapshotChange])

  const deleteSnapshot = React.useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      snapshots: prev.snapshots.filter((s) => s.id !== id),
      currentSnapshotId: prev.currentSnapshotId === id ? null : prev.currentSnapshotId,
    }))
  }, [])

  const updateSnapshot = React.useCallback((id: string, updates: Partial<Snapshot>) => {
    setStore((prev) => ({
      ...prev,
      snapshots: prev.snapshots.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }))
  }, [])

  const exportSnapshot = React.useCallback((id: string): string => {
    const snapshot = store.snapshots.find((s) => s.id === id)
    if (!snapshot) return ''
    return JSON.stringify(snapshot, null, 2)
  }, [store.snapshots])

  const importSnapshot = React.useCallback((json: string): Snapshot | null => {
    try {
      const snapshot: Snapshot = JSON.parse(json)
      if (!snapshot.id || !snapshot.state) return null

      setStore((prev) => ({
        ...prev,
        snapshots: [...prev.snapshots, snapshot],
      }))

      return snapshot
    } catch {
      return null
    }
  }, [])

  const createSequence = React.useCallback((name: string, keyframes: Omit<Keyframe, 'id'>[]): AnimationSequence => {
    const sequence: AnimationSequence = {
      id: generateId(),
      name,
      keyframes: keyframes.map((kf) => ({ ...kf, id: generateId() })),
      totalDuration: keyframes.reduce((max, kf) => Math.max(max, kf.time + (kf.duration ?? 0)), 0),
      loop: false,
    }

    setStore((prev) => ({
      ...prev,
      sequences: [...prev.sequences, sequence],
    }))

    return sequence
  }, [])

  const playSequence = React.useCallback((sequenceId: string) => {
    const sequence = store.sequences.find((s) => s.id === sequenceId)
    if (!sequence) return

    currentSequenceRef.current = sequence
    playingRef.current = true
    animationStartTimeRef.current = Date.now()
    setIsPlaying(true)
    setStore((prev) => ({ ...prev, currentSequenceId: sequenceId }))
  }, [store.sequences])

  const stopSequence = React.useCallback(() => {
    playingRef.current = false
    currentSequenceRef.current = null
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  useFrame(() => {
    if (!playingRef.current || !currentSequenceRef.current) return

    const sequence = currentSequenceRef.current
    const elapsed = Date.now() - animationStartTimeRef.current
    const progress = sequence.loop ? elapsed % sequence.totalDuration : Math.min(elapsed, sequence.totalDuration)

    setCurrentTime(progress)

    const activeKeyframe = sequence.keyframes.find((kf) => {
      const kfEnd = kf.time + (kf.duration ?? 0)
      return progress >= kf.time && progress <= kfEnd
    })

    if (activeKeyframe) {
      const snapshot = store.snapshots.find((s) => s.id === activeKeyframe.snapshotId)
      if (snapshot) {
        applySnapshot(snapshot, { transitionDuration: 0 })
      }
    }

    if (!sequence.loop && progress >= sequence.totalDuration) {
      stopSequence()
    }
  })

  const value: SnapshotContextValue = {
    store,
    captureSnapshot,
    applySnapshot,
    deleteSnapshot,
    updateSnapshot,
    exportSnapshot,
    importSnapshot,
    createSequence,
    playSequence,
    stopSequence,
    isPlaying,
    currentTime,
  }

  return React.createElement(SnapshotContext.Provider, { value }, children)
}

// ============================================================================
// SnapshotPlayer Component
// ============================================================================

export interface SnapshotPlayerProps {
  className?: string
  style?: React.CSSProperties
  showTimeline?: boolean
  showControls?: boolean
  compact?: boolean
}

export function SnapshotPlayer({
  className,
  style,
  showTimeline = true,
  showControls = true,
  compact = false,
}: SnapshotPlayerProps): React.ReactElement | null {
  const {
    snapshots,
    currentSnapshot,
    capture,
    apply,
    remove,
    sequences,
    currentSequence,
    play,
    stop,
    isPlaying,
    currentTime,
  } = useSnapshot()

  const [selectedSequenceId, setSelectedSequenceId] = React.useState<string | null>(null)

  const handleCapture = () => {
    capture({
      metadata: {
        name: `Snapshot ${snapshots.length + 1}`,
        createdAt: Date.now(),
        version: '1.0.0',
      },
    })
  }

  const handlePlay = () => {
    if (selectedSequenceId) {
      play(selectedSequenceId)
    }
  }

  return React.createElement(
    'div',
    {
      className,
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: '8px',
        padding: '16px',
        minWidth: compact ? '200px' : '300px',
        ...style,
      },
    },
    showControls &&
      React.createElement(
        'div',
        { style: { display: 'flex', gap: '8px', marginBottom: '16px' } },
        React.createElement(
          'button',
          {
            onClick: handleCapture,
            style: {
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            },
          },
          'Capture',
        ),
        React.createElement(
          'button',
          {
            onClick: isPlaying ? stop : handlePlay,
            disabled: !selectedSequenceId && !isPlaying,
            style: {
              padding: '8px 16px',
              background: isPlaying ? '#ef4444' : '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: !selectedSequenceId && !isPlaying ? 0.5 : 1,
            },
          },
          isPlaying ? 'Stop' : 'Play',
        ),
      ),
    !compact &&
      React.createElement(
        'div',
        { style: { marginBottom: '16px' } },
        React.createElement('h4', { style: { margin: '0 0 8px 0', fontSize: '14px' } }, 'Snapshots'),
        React.createElement(
          'div',
          { style: { maxHeight: '150px', overflowY: 'auto' } },
          snapshots.length === 0
            ? React.createElement('p', { style: { color: '#888', fontSize: '12px' } }, 'No snapshots yet')
            : snapshots.map((snapshot) =>
                React.createElement(
                  'div',
                  {
                    key: snapshot.id,
                    onClick: () => apply(snapshot),
                    style: {
                      padding: '8px',
                      marginBottom: '4px',
                      background: currentSnapshot?.id === snapshot.id ? '#3b82f6' : '#333',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    },
                  },
                  React.createElement(
                    'span',
                    { style: { fontSize: '12px' } },
                    snapshot.state.metadata?.name || `Snapshot ${snapshot.id.slice(0, 8)}`,
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: (e) => {
                        e.stopPropagation()
                        remove(snapshot.id)
                      },
                      style: {
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '12px',
                      },
                    },
                    '×',
                  ),
                ),
              ),
        ),
      ),
    showTimeline &&
      React.createElement(
        'div',
        { style: { marginTop: '16px' } },
        React.createElement('h4', { style: { margin: '0 0 8px 0', fontSize: '14px' } }, 'Timeline'),
        React.createElement(
          'div',
          {
            style: {
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              position: 'relative',
            },
          },
          React.createElement('div', {
            style: {
              height: '100%',
              background: '#3b82f6',
              borderRadius: '2px',
              width: currentSequence
                ? `${(currentTime / currentSequence.totalDuration) * 100}%`
                : '0%',
              transition: 'width 0.1s linear',
            },
          }),
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#888' } },
          React.createElement('span', null, '0s'),
          React.createElement('span', null, currentSequence ? `${(currentSequence.totalDuration / 1000).toFixed(1)}s` : '0s'),
        ),
      ),
  )
}

// ============================================================================
// SnapshotTimeline Component
// ============================================================================

export interface SnapshotTimelineProps {
  className?: string
  style?: React.CSSProperties
  height?: number
  showKeyframes?: boolean
  onKeyframeClick?: (keyframe: Keyframe) => void
}

export function SnapshotTimeline({
  className,
  style,
  height = 60,
  showKeyframes = true,
  onKeyframeClick,
}: SnapshotTimelineProps): React.ReactElement | null {
  const { sequences, currentSequence, currentTime, isPlaying } = useSnapshot()

  const sequence = currentSequence || sequences[0]
  if (!sequence) return null

  const progress = sequence.totalDuration > 0 ? (currentTime / sequence.totalDuration) * 100 : 0

  return React.createElement(
    'div',
    {
      className,
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: '8px',
        padding: '12px',
        ...style,
      },
    },
    React.createElement(
      'div',
      {
        style: {
          height: `${height}px`,
          background: '#2a2a2a',
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden',
        },
      },
      showKeyframes &&
        sequence.keyframes.map((keyframe) => {
          const keyframePosition = (keyframe.time / sequence.totalDuration) * 100
          return React.createElement('div', {
            key: keyframe.id,
            onClick: () => onKeyframeClick?.(keyframe),
            style: {
              position: 'absolute',
              left: `${keyframePosition}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              background: '#3b82f6',
              borderRadius: '50%',
              cursor: 'pointer',
              border: '2px solid #fff',
            },
          })
        }),
      React.createElement('div', {
        style: {
          position: 'absolute',
          left: `${progress}%`,
          top: 0,
          bottom: 0,
          width: '2px',
          background: '#ef4444',
          transition: isPlaying ? 'left 0.1s linear' : 'none',
        },
      }),
    ),
    React.createElement(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#888' } },
      React.createElement('span', null, formatTime(0)),
      React.createElement('span', { style: { color: '#fff' } }, formatTime(currentTime)),
      React.createElement('span', null, formatTime(sequence.totalDuration)),
    ),
  )
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const milliseconds = Math.floor((ms % 1000) / 10)
  return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`
}

// ============================================================================
// SnapshotComparer Component
// ============================================================================

export interface SnapshotComparerProps {
  snapshotA: Snapshot
  snapshotB: Snapshot
  className?: string
  style?: React.CSSProperties
}

export interface SnapshotDiff {
  cameraChanged: boolean
  objectsAdded: string[]
  objectsRemoved: string[]
  objectsModified: string[]
  materialsChanged: string[]
  lightsChanged: string[]
}

export function compareSnapshots(a: Snapshot, b: Snapshot): SnapshotDiff {
  const cameraChanged = JSON.stringify(a.state.camera) !== JSON.stringify(b.state.camera)

  const aObjectIds = Object.keys(a.state.objects)
  const bObjectIds = Object.keys(b.state.objects)
  const objectsAdded = bObjectIds.filter((id) => !aObjectIds.includes(id))
  const objectsRemoved = aObjectIds.filter((id) => !bObjectIds.includes(id))
  const objectsModified = aObjectIds.filter((id) => {
    if (objectsRemoved.includes(id)) return false
    return JSON.stringify(a.state.objects[id]) !== JSON.stringify(b.state.objects[id])
  })

  const aMaterialIds = Object.keys(a.state.materials)
  const bMaterialIds = Object.keys(b.state.materials)
  const materialsChanged = aMaterialIds.filter((id) => {
    return JSON.stringify(a.state.materials[id]) !== JSON.stringify(b.state.materials[id])
  })

  const aLightIds = Object.keys(a.state.lights)
  const bLightIds = Object.keys(b.state.lights)
  const lightsChanged = aLightIds.filter((id) => {
    return JSON.stringify(a.state.lights[id]) !== JSON.stringify(b.state.lights[id])
  })

  return {
    cameraChanged,
    objectsAdded,
    objectsRemoved,
    objectsModified,
    materialsChanged,
    lightsChanged,
  }
}

export function SnapshotComparer({ snapshotA, snapshotB, className, style }: SnapshotComparerProps): React.ReactElement {
  const diff = React.useMemo(() => compareSnapshots(snapshotA, snapshotB), [snapshotA, snapshotB])

  return React.createElement(
    'div',
    {
      className,
      style: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#1a1a1a',
        color: '#fff',
        borderRadius: '8px',
        padding: '16px',
        ...style,
      },
    },
    React.createElement('h4', { style: { margin: '0 0 12px 0' } }, 'Snapshot Comparison'),
    React.createElement(
      'div',
      { style: { display: 'grid', gap: '8px' } },
      renderDiffItem('Camera', diff.cameraChanged),
      renderDiffItem(`Objects Added (${diff.objectsAdded.length})`, diff.objectsAdded.length > 0),
      renderDiffItem(`Objects Removed (${diff.objectsRemoved.length})`, diff.objectsRemoved.length > 0),
      renderDiffItem(`Objects Modified (${diff.objectsModified.length})`, diff.objectsModified.length > 0),
      renderDiffItem(`Materials Changed (${diff.materialsChanged.length})`, diff.materialsChanged.length > 0),
      renderDiffItem(`Lights Changed (${diff.lightsChanged.length})`, diff.lightsChanged.length > 0),
    ),
  )
}

function renderDiffItem(label: string, changed: boolean): React.ReactElement {
  return React.createElement(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
    React.createElement('span', { style: { fontSize: '13px' } }, label),
    React.createElement('span', {
      style: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: changed ? '#ef4444' : '#22c55e',
      },
    }),
  )
}

// ============================================================================
// Export/Import Utilities
// ============================================================================

export function exportSnapshotsToFile(snapshots: Snapshot[], filename: string = 'snapshots.json'): void {
  const data = JSON.stringify(snapshots, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function importSnapshotsFromFile(file: File): Promise<Snapshot[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const snapshots: Snapshot[] = JSON.parse(e.target?.result as string)
        resolve(snapshots)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
