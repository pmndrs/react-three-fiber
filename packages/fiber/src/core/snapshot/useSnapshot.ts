import * as React from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks'
import type { Snapshot, AnimationSequence, Keyframe, SnapshotSystemOptions } from './types'
import {
  createSnapshot,
  restoreSnapshot,
  exportSnapshots,
  importSnapshots,
  generateId,
  serializeVector3,
} from './utils'

export interface UseSnapshotReturn {
  snapshots: Snapshot[]
  currentSnapshot: Snapshot | null
  takeSnapshot: (name?: string, options?: SnapshotSystemOptions) => Snapshot
  applySnapshot: (snapshot: Snapshot | string, options?: { restoreCamera?: boolean; restoreScene?: boolean }) => void
  deleteSnapshot: (snapshotId: string) => void
  clearSnapshots: () => void
  renameSnapshot: (snapshotId: string, newName: string) => void
  exportToJson: () => string
  importFromJson: (jsonString: string) => void
  createSequence: (name: string, keyframes: Keyframe[], duration?: number) => AnimationSequence
  deleteSequence: (sequenceId: string) => void
  getSequence: (sequenceId: string) => AnimationSequence | null
  sequences: AnimationSequence[]
}

export function useSnapshot(options: SnapshotSystemOptions = {}): UseSnapshotReturn {
  const { scene, camera } = useThree()
  const [snapshots, setSnapshots] = React.useState<Snapshot[]>([])
  const [currentSnapshotId, setCurrentSnapshotId] = React.useState<string | null>(null)
  const [sequences, setSequences] = React.useState<AnimationSequence[]>([])
  const { autoSave = false, maxSnapshots = 50, includeMaterials = true, includeLights = true, deepTraversal = true } = options

  const currentSnapshot = React.useMemo(() => {
    return snapshots.find((s) => s.id === currentSnapshotId) || null
  }, [snapshots, currentSnapshotId])

  const takeSnapshot = React.useCallback(
    (name?: string, customOptions?: SnapshotSystemOptions): Snapshot => {
      const snapshotName = name || `Snapshot ${snapshots.length + 1}`
      const snapshot = createSnapshot(snapshotName, camera, scene, {
        includeMaterials,
        includeLights,
        deepTraversal,
        ...customOptions,
      })

      setSnapshots((prev) => {
        let newSnapshots = [...prev, snapshot]
        if (maxSnapshots && newSnapshots.length > maxSnapshots) {
          newSnapshots = newSnapshots.slice(-maxSnapshots)
        }
        return newSnapshots
      })

      if (autoSave) {
        setCurrentSnapshotId(snapshot.id)
      }

      return snapshot
    },
    [camera, scene, snapshots.length, autoSave, maxSnapshots, includeMaterials, includeLights, deepTraversal],
  )

  const applySnapshot = React.useCallback(
    (snapshot: Snapshot | string, applyOptions?: { restoreCamera?: boolean; restoreScene?: boolean }) => {
      const snapshotToApply = typeof snapshot === 'string' ? snapshots.find((s) => s.id === snapshot) : snapshot

      if (!snapshotToApply) {
        console.warn('Snapshot not found')
        return
      }

      restoreSnapshot(snapshotToApply, camera, scene, applyOptions)
      setCurrentSnapshotId(snapshotToApply.id)
    },
    [snapshots, camera, scene],
  )

  const deleteSnapshot = React.useCallback((snapshotId: string) => {
    setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId))
    setCurrentSnapshotId((prev) => (prev === snapshotId ? null : prev))
  }, [])

  const clearSnapshots = React.useCallback(() => {
    setSnapshots([])
    setCurrentSnapshotId(null)
  }, [])

  const renameSnapshot = React.useCallback((snapshotId: string, newName: string) => {
    setSnapshots((prev) =>
      prev.map((s) => (s.id === snapshotId ? { ...s, name: newName } : s)),
    )
  }, [])

  const exportToJson = React.useCallback((): string => {
    return exportSnapshots(snapshots)
  }, [snapshots])

  const importFromJson = React.useCallback((jsonString: string) => {
    const imported = importSnapshots(jsonString)
    if (imported.length > 0) {
      setSnapshots((prev) => [...prev, ...imported])
    }
  }, [])

  const createSequence = React.useCallback(
    (name: string, keyframes: Keyframe[], duration: number = 10): AnimationSequence => {
      const sequence: AnimationSequence = {
        id: generateId(),
        name,
        keyframes,
        duration,
        loop: false,
        fps: 30,
      }
      setSequences((prev) => [...prev, sequence])
      return sequence
    },
    [],
  )

  const deleteSequence = React.useCallback((sequenceId: string) => {
    setSequences((prev) => prev.filter((s) => s.id !== sequenceId))
  }, [])

  const getSequence = React.useCallback(
    (sequenceId: string): AnimationSequence | null => {
      return sequences.find((s) => s.id === sequenceId) || null
    },
    [sequences],
  )

  return {
    snapshots,
    currentSnapshot,
    takeSnapshot,
    applySnapshot,
    deleteSnapshot,
    clearSnapshots,
    renameSnapshot,
    exportToJson,
    importFromJson,
    createSequence,
    deleteSequence,
    getSequence,
    sequences,
  }
}
