import { SnapshotConfig, SceneSnapshot, AnimationTrack, Keyframe } from './types'

function replacer(key: string, value: unknown): unknown {
  if (value instanceof Float32Array) {
    return {
      __type: 'Float32Array',
      data: Array.from(value),
    }
  }
  if (value instanceof Uint32Array) {
    return {
      __type: 'Uint32Array',
      data: Array.from(value),
    }
  }
  if (value instanceof Int32Array) {
    return {
      __type: 'Int32Array',
      data: Array.from(value),
    }
  }
  if (value instanceof Float64Array) {
    return {
      __type: 'Float64Array',
      data: Array.from(value),
    }
  }
  return value
}

function reviver(key: string, value: unknown): unknown {
  if (typeof value === 'object' && value !== null) {
    const obj = value as { __type?: string; data?: number[] }
    if (obj.__type === 'Float32Array' && Array.isArray(obj.data)) {
      return new Float32Array(obj.data)
    }
    if (obj.__type === 'Uint32Array' && Array.isArray(obj.data)) {
      return new Uint32Array(obj.data)
    }
    if (obj.__type === 'Int32Array' && Array.isArray(obj.data)) {
      return new Int32Array(obj.data)
    }
    if (obj.__type === 'Float64Array' && Array.isArray(obj.data)) {
      return new Float64Array(obj.data)
    }
  }
  return value
}

export function exportSnapshotConfig(config: SnapshotConfig): string {
  return JSON.stringify(config, replacer, 2)
}

export function importSnapshotConfig(json: string): SnapshotConfig {
  const parsed = JSON.parse(json, reviver)
  validateSnapshotConfig(parsed)
  return parsed as SnapshotConfig
}

export function validateSnapshotConfig(config: unknown): asserts config is SnapshotConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid snapshot config: must be an object')
  }

  const c = config as Record<string, unknown>

  if (typeof c.version !== 'string') {
    throw new Error('Invalid snapshot config: version must be a string')
  }

  if (typeof c.name !== 'string') {
    throw new Error('Invalid snapshot config: name must be a string')
  }

  if (typeof c.createdAt !== 'number') {
    throw new Error('Invalid snapshot config: createdAt must be a number')
  }

  if (typeof c.updatedAt !== 'number') {
    throw new Error('Invalid snapshot config: updatedAt must be a number')
  }

  if (!Array.isArray(c.snapshots)) {
    throw new Error('Invalid snapshot config: snapshots must be an array')
  }

  if (!Array.isArray(c.animations)) {
    throw new Error('Invalid snapshot config: animations must be an array')
  }

  c.snapshots.forEach((snapshot, index) => {
    validateSceneSnapshot(snapshot, `snapshots[${index}]`)
  })

  c.animations.forEach((animation, index) => {
    validateAnimationTrack(animation, `animations[${index}]`)
  })
}

export function validateSceneSnapshot(snapshot: unknown, path: string = 'snapshot'): asserts snapshot is SceneSnapshot {
  if (typeof snapshot !== 'object' || snapshot === null) {
    throw new Error(`Invalid ${path}: must be an object`)
  }

  const s = snapshot as Record<string, unknown>

  if (typeof s.version !== 'string') {
    throw new Error(`Invalid ${path}: version must be a string`)
  }

  if (typeof s.timestamp !== 'number') {
    throw new Error(`Invalid ${path}: timestamp must be a number`)
  }

  if (typeof s.camera !== 'object' || s.camera === null) {
    throw new Error(`Invalid ${path}: camera must be an object`)
  }

  if (typeof s.scene !== 'object' || s.scene === null) {
    throw new Error(`Invalid ${path}: scene must be an object`)
  }
}

export function validateAnimationTrack(track: unknown, path: string = 'animation'): asserts track is AnimationTrack {
  if (typeof track !== 'object' || track === null) {
    throw new Error(`Invalid ${path}: must be an object`)
  }

  const t = track as Record<string, unknown>

  if (typeof t.id !== 'string') {
    throw new Error(`Invalid ${path}: id must be a string`)
  }

  if (typeof t.name !== 'string') {
    throw new Error(`Invalid ${path}: name must be a string`)
  }

  if (!Array.isArray(t.keyframes)) {
    throw new Error(`Invalid ${path}: keyframes must be an array`)
  }

  if (typeof t.duration !== 'number') {
    throw new Error(`Invalid ${path}: duration must be a number`)
  }

  t.keyframes.forEach((keyframe, index) => {
    validateKeyframe(keyframe, `${path}.keyframes[${index}]`)
  })
}

export function validateKeyframe(keyframe: unknown, path: string = 'keyframe'): asserts keyframe is Keyframe {
  if (typeof keyframe !== 'object' || keyframe === null) {
    throw new Error(`Invalid ${path}: must be an object`)
  }

  const k = keyframe as Record<string, unknown>

  if (typeof k.id !== 'string') {
    throw new Error(`Invalid ${path}: id must be a string`)
  }

  if (typeof k.time !== 'number') {
    throw new Error(`Invalid ${path}: time must be a number`)
  }

  if (typeof k.snapshot !== 'object' || k.snapshot === null) {
    throw new Error(`Invalid ${path}: snapshot must be an object`)
  }
}

export function downloadSnapshotConfig(config: SnapshotConfig, filename: string = 'snapshot-config.json'): void {
  const json = exportSnapshotConfig(config)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function uploadSnapshotConfig(): Promise<SnapshotConfig> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }

      try {
        const text = await file.text()
        const config = importSnapshotConfig(text)
        resolve(config)
      } catch (error) {
        reject(error)
      }
    }
    input.click()
  })
}

export function createEmptySnapshotConfig(name: string = 'New Snapshot Config'): SnapshotConfig {
  return {
    version: '1.0.0',
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    snapshots: [],
    animations: [],
  }
}

export function mergeSnapshotConfigs(...configs: SnapshotConfig[]): SnapshotConfig {
  const merged = createEmptySnapshotConfig('Merged Snapshot Config')

  configs.forEach((config) => {
    config.snapshots.forEach((snapshot) => {
      merged.snapshots.push(snapshot)
    })

    config.animations.forEach((animation) => {
      merged.animations.push(animation)
    })
  })

  merged.updatedAt = Date.now()
  return merged
}
