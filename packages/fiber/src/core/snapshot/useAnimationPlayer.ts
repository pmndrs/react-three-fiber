import * as React from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '../hooks'
import type { Snapshot, AnimationSequence, Keyframe } from './types'
import { restoreSnapshot, deserializeVector3, deserializeEuler } from './utils'

export interface AnimationPlayerState {
  isPlaying: boolean
  isPaused: boolean
  currentTime: number
  duration: number
  fps: number
  progress: number
  currentKeyframeIndex: number
}

export interface UseAnimationPlayerReturn extends AnimationPlayerState {
  play: (sequenceId?: string) => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  nextFrame: () => void
  prevFrame: () => void
  toggleLoop: () => void
  setPlaybackSpeed: (speed: number) => void
  playbackSpeed: number
  loop: boolean
}

export function useAnimationPlayer(
  snapshots: Snapshot[],
  sequence?: AnimationSequence | null,
  autoPlay?: boolean,
): UseAnimationPlayerReturn {
  const { scene, camera } = useThree()
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [isPaused, setIsPaused] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1)
  const [loop, setLoop] = React.useState(false)

  const duration = React.useMemo(() => {
    if (sequence) return sequence.duration
    return snapshots.length > 0 ? snapshots.length - 1 : 0
  }, [sequence, snapshots])

  const fps = React.useMemo(() => {
    if (sequence) return sequence.fps
    return 30
  }, [sequence])

  const progress = React.useMemo(() => {
    if (duration <= 0) return 0
    return Math.min(Math.max(currentTime / duration, 0), 1)
  }, [currentTime, duration])

  const currentKeyframeIndex = React.useMemo(() => {
    if (!sequence || sequence.keyframes.length === 0) {
      return Math.floor(currentTime)
    }
    const index = sequence.keyframes.findIndex((kf) => kf.timestamp >= currentTime)
    return index >= 0 ? index : sequence.keyframes.length - 1
  }, [sequence, currentTime])

  const getInterpolatedSnapshot = React.useCallback(
    (time: number): Snapshot | null => {
      if (snapshots.length === 0) return null

      if (!sequence || sequence.keyframes.length === 0) {
        const index = Math.min(Math.floor(time), snapshots.length - 1)
        const nextIndex = Math.min(index + 1, snapshots.length - 1)
        const t = time - index

        if (index === nextIndex) return snapshots[index]

        return interpolateSnapshots(snapshots[index], snapshots[nextIndex], t)
      }

      const keyframes = sequence.keyframes
      let prevKf: Keyframe | null = null
      let nextKf: Keyframe | null = null

      for (let i = 0; i < keyframes.length; i++) {
        if (keyframes[i].timestamp <= time) {
          prevKf = keyframes[i]
        }
        if (keyframes[i].timestamp >= time && !nextKf) {
          nextKf = keyframes[i]
          break
        }
      }

      if (!prevKf) prevKf = keyframes[0]
      if (!nextKf) nextKf = keyframes[keyframes.length - 1]

      const prevSnapshot = snapshots.find((s) => s.id === prevKf!.snapshotId)
      const nextSnapshot = snapshots.find((s) => s.id === nextKf!.snapshotId)

      if (!prevSnapshot || !nextSnapshot) return prevSnapshot || nextSnapshot || null

      if (prevKf === nextKf) return prevSnapshot

      const t = (time - prevKf.timestamp) / (nextKf.timestamp - prevKf.timestamp)

      return interpolateSnapshots(prevSnapshot, nextSnapshot, t, prevKf.interpolation)
    },
    [snapshots, sequence],
  )

  const interpolateSnapshots = React.useCallback(
    (a: Snapshot, b: Snapshot, t: number, interpolation: 'linear' | 'step' | 'smooth' = 'linear'): Snapshot => {
      if (interpolation === 'step') return t < 0.5 ? a : b

      const easeT = interpolation === 'smooth' ? easeInOutCubic(t) : t

      return {
        ...a,
        camera: interpolateCameraState(a.camera, b.camera, easeT),
        scene: interpolateSceneState(a.scene, b.scene, easeT),
      }
    },
    [],
  )

  const interpolateCameraState = React.useCallback((a: any, b: any, t: number) => {
    if (!b) return a

    const posA = deserializeVector3(a.position)
    const posB = deserializeVector3(b.position)
    const rotA = deserializeEuler(a.rotation)
    const rotB = deserializeEuler(b.rotation)

    const pos = new THREE.Vector3().lerpVectors(posA, posB, t)
    const rot = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().slerpQuaternions(
        new THREE.Quaternion().setFromEuler(rotA),
        new THREE.Quaternion().setFromEuler(rotB),
        t,
      ),
    )

    return {
      ...a,
      position: [pos.x, pos.y, pos.z] as [number, number, number],
      rotation: [rot.x, rot.y, rot.z] as [number, number, number],
      fov: a.fov !== undefined && b.fov !== undefined ? a.fov + (b.fov - a.fov) * t : a.fov,
      zoom: a.zoom !== undefined && b.zoom !== undefined ? a.zoom + (b.zoom - a.zoom) * t : a.zoom,
    }
  }, [])

  const interpolateSceneState = React.useCallback((a: any, b: any, t: number) => {
    if (!b) return a

    const interpolateObjects = (objsA: any[], objsB: any[], time: number): any[] => {
      return objsA.map((objA: any, i: number) => {
        const objB = objsB[i]
        if (!objB) return objA

        const posA = deserializeVector3(objA.position)
        const posB = deserializeVector3(objB.position)
        const rotA = deserializeEuler(objA.rotation)
        const rotB = deserializeEuler(objB.rotation)
        const scaleA = deserializeVector3(objA.scale)
        const scaleB = deserializeVector3(objB.scale)

        const pos = new THREE.Vector3().lerpVectors(posA, posB, time)
        const rot = new THREE.Euler().setFromQuaternion(
          new THREE.Quaternion().slerpQuaternions(
            new THREE.Quaternion().setFromEuler(rotA),
            new THREE.Quaternion().setFromEuler(rotB),
            time,
          ),
        )
        const scale = new THREE.Vector3().lerpVectors(scaleA, scaleB, time)

        return {
          ...objA,
          position: [pos.x, pos.y, pos.z] as [number, number, number],
          rotation: [rot.x, rot.y, rot.z] as [number, number, number],
          scale: [scale.x, scale.y, scale.z] as [number, number, number],
          children: interpolateObjects(objA.children, objB.children, time),
        }
      })
    }

    return {
      ...a,
      objects: interpolateObjects(a.objects, b.objects, t),
    }
  }, [])

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  useFrame((_, delta) => {
    if (!isPlaying || isPaused) return

    const newTime = currentTime + delta * playbackSpeed * fps

    if (newTime >= duration) {
      if (loop) {
        setCurrentTime(0)
      } else {
        setIsPlaying(false)
        setCurrentTime(duration)
      }
    } else {
      setCurrentTime(newTime)
    }

    const interpolatedSnapshot = getInterpolatedSnapshot(newTime)
    if (interpolatedSnapshot) {
      restoreSnapshot(interpolatedSnapshot, camera, scene)
    }
  })

  const play = React.useCallback(() => {
    if (currentTime >= duration) {
      setCurrentTime(0)
    }
    setIsPlaying(true)
    setIsPaused(false)
  }, [currentTime, duration])

  const pause = React.useCallback(() => {
    setIsPaused(true)
  }, [])

  const stop = React.useCallback(() => {
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentTime(0)
  }, [])

  const seek = React.useCallback(
    (time: number) => {
      const clampedTime = Math.min(Math.max(time, 0), duration)
      setCurrentTime(clampedTime)
      const interpolatedSnapshot = getInterpolatedSnapshot(clampedTime)
      if (interpolatedSnapshot) {
        restoreSnapshot(interpolatedSnapshot, camera, scene)
      }
    },
    [duration, getInterpolatedSnapshot, camera, scene],
  )

  const nextFrame = React.useCallback(() => {
    seek(currentTime + 1 / fps)
  }, [currentTime, fps, seek])

  const prevFrame = React.useCallback(() => {
    seek(currentTime - 1 / fps)
  }, [currentTime, fps, seek])

  const toggleLoop = React.useCallback(() => {
    setLoop((prev) => !prev)
  }, [])

  React.useEffect(() => {
    if (autoPlay && snapshots.length > 1) {
      play()
    }
  }, [autoPlay, snapshots.length, play])

  return {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    fps,
    progress,
    currentKeyframeIndex,
    playbackSpeed,
    loop,
    play,
    pause,
    stop,
    seek,
    nextFrame,
    prevFrame,
    toggleLoop,
    setPlaybackSpeed,
  }
}
