import * as THREE from 'three'
import * as React from 'react'
import { useThree, useFrame } from '../hooks'
import { AnimationTrack, Keyframe, SceneSnapshot, SnapshotPlayerProps } from './types'
import { restoreCamera, restoreObject, interpolateSnapshots } from './useSnapshot'

interface SnapshotPlayerContextValue {
  animation: AnimationTrack | null
  playing: boolean
  currentTime: number
  speed: number
  loop: boolean
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setSpeed: (speed: number) => void
  setAnimation: (animation: AnimationTrack) => void
  addKeyframe: (snapshot: SceneSnapshot, time?: number, label?: string) => void
  removeKeyframe: (id: string) => void
  updateKeyframe: (id: string, updates: Partial<Keyframe>) => void
}

const SnapshotPlayerContext = React.createContext<SnapshotPlayerContextValue | null>(null)

export function useSnapshotPlayer(): SnapshotPlayerContextValue {
  const context = React.useContext(SnapshotPlayerContext)
  if (!context) {
    throw new Error('useSnapshotPlayer must be used within a SnapshotPlayerProvider')
  }
  return context
}

interface SnapshotPlayerProviderProps {
  children: React.ReactNode
  animation?: AnimationTrack
  playing?: boolean
  loop?: boolean
  speed?: number
  onFrame?: (snapshot: SceneSnapshot, progress: number) => void
  onComplete?: () => void
  onTimeUpdate?: (time: number) => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function findKeyframesAtTime(keyframes: Keyframe[], time: number): [Keyframe | null, Keyframe | null, number] {
  if (keyframes.length === 0) return [null, null, 0]

  const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)

  if (time <= sortedKeyframes[0].time) {
    return [sortedKeyframes[0], sortedKeyframes[0], 0]
  }

  if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    return [sortedKeyframes[sortedKeyframes.length - 1], sortedKeyframes[sortedKeyframes.length - 1], 1]
  }

  for (let i = 0; i < sortedKeyframes.length - 1; i++) {
    const current = sortedKeyframes[i]
    const next = sortedKeyframes[i + 1]

    if (time >= current.time && time <= next.time) {
      const progress = (time - current.time) / (next.time - current.time)
      return [current, next, progress]
    }
  }

  return [sortedKeyframes[0], sortedKeyframes[0], 0]
}

export function SnapshotPlayerProvider({
  children,
  animation: initialAnimation,
  playing: initialPlaying = false,
  loop: initialLoop = false,
  speed: initialSpeed = 1,
  onFrame,
  onComplete,
  onTimeUpdate,
}: SnapshotPlayerProviderProps): React.JSX.Element {
  const { scene, camera } = useThree()

  const [animation, setAnimationState] = React.useState<AnimationTrack | null>(initialAnimation || null)
  const [playing, setPlaying] = React.useState(initialPlaying)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [speed, setSpeedState] = React.useState(initialSpeed)
  const [loop, setLoop] = React.useState(initialLoop)

  const playingRef = React.useRef(playing)
  const currentTimeRef = React.useRef(currentTime)
  const speedRef = React.useRef(speed)
  const animationRef = React.useRef(animation)
  const loopRef = React.useRef(loop)

  React.useEffect(() => {
    playingRef.current = playing
  }, [playing])

  React.useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  React.useEffect(() => {
    speedRef.current = speed
  }, [speed])

  React.useEffect(() => {
    animationRef.current = animation
  }, [animation])

  React.useEffect(() => {
    loopRef.current = loop
  }, [loop])

  const applySnapshot = React.useCallback(
    (snapshot: SceneSnapshot): void => {
      restoreCamera(camera, snapshot.camera)
      restoreObject(scene, snapshot.scene, {
        restoreCamera: true,
        restoreObjects: true,
        restoreMaterials: true,
        restoreUserData: true,
      })
    },
    [scene, camera],
  )

  useFrame((_, delta) => {
    if (!playingRef.current || !animationRef.current) return

    const newTime = currentTimeRef.current + delta * 1000 * speedRef.current
    const duration = animationRef.current.duration

    if (newTime >= duration) {
      if (loopRef.current) {
        setCurrentTime(0)
        onTimeUpdate?.(0)
      } else {
        setPlaying(false)
        setCurrentTime(duration)
        onTimeUpdate?.(duration)
        onComplete?.()
        return
      }
    } else {
      setCurrentTime(newTime)
      onTimeUpdate?.(newTime)
    }

    const [fromKeyframe, toKeyframe, progress] = findKeyframesAtTime(
      animationRef.current.keyframes,
      currentTimeRef.current,
    )

    if (fromKeyframe && toKeyframe) {
      if (fromKeyframe.id === toKeyframe.id) {
        applySnapshot(fromKeyframe.snapshot)
        onFrame?.(fromKeyframe.snapshot, progress)
      } else {
        const interpolated = interpolateSnapshots(
          fromKeyframe.snapshot,
          toKeyframe.snapshot,
          progress,
          toKeyframe.easing,
        )
        applySnapshot(interpolated)
        onFrame?.(interpolated, progress)
      }
    }
  })

  const play = React.useCallback(() => {
    if (animationRef.current && animationRef.current.keyframes.length > 0) {
      setPlaying(true)
    }
  }, [])

  const pause = React.useCallback(() => {
    setPlaying(false)
  }, [])

  const stop = React.useCallback(() => {
    setPlaying(false)
    setCurrentTime(0)
    if (animationRef.current && animationRef.current.keyframes.length > 0) {
      applySnapshot(animationRef.current.keyframes[0].snapshot)
    }
  }, [applySnapshot])

  const seek = React.useCallback(
    (time: number): void => {
      if (!animationRef.current) return

      const clampedTime = Math.max(0, Math.min(time, animationRef.current.duration))
      setCurrentTime(clampedTime)
      onTimeUpdate?.(clampedTime)

      const [fromKeyframe, toKeyframe, progress] = findKeyframesAtTime(
        animationRef.current.keyframes,
        clampedTime,
      )

      if (fromKeyframe && toKeyframe) {
        if (fromKeyframe.id === toKeyframe.id) {
          applySnapshot(fromKeyframe.snapshot)
          onFrame?.(fromKeyframe.snapshot, progress)
        } else {
          const interpolated = interpolateSnapshots(
            fromKeyframe.snapshot,
            toKeyframe.snapshot,
            progress,
            toKeyframe.easing,
          )
          applySnapshot(interpolated)
          onFrame?.(interpolated, progress)
        }
      }
    },
    [applySnapshot, onFrame, onTimeUpdate],
  )

  const setSpeed = React.useCallback((newSpeed: number): void => {
    setSpeedState(Math.max(0.1, Math.min(10, newSpeed)))
  }, [])

  const setAnimation = React.useCallback((newAnimation: AnimationTrack): void => {
    setAnimationState(newAnimation)
    setCurrentTime(0)
    setPlaying(false)
  }, [])

  const addKeyframe = React.useCallback(
    (snapshot: SceneSnapshot, time?: number, label?: string): void => {
      if (!animationRef.current) return

      const keyframe: Keyframe = {
        id: generateId(),
        time: time ?? currentTimeRef.current,
        snapshot,
        easing: 'linear',
        label,
      }

      const newKeyframes = [...animationRef.current.keyframes, keyframe].sort((a, b) => a.time - b.time)
      const newDuration = newKeyframes.length > 0 ? Math.max(...newKeyframes.map((k) => k.time)) : 0

      setAnimationState({
        ...animationRef.current,
        keyframes: newKeyframes,
        duration: newDuration,
      })
    },
    [],
  )

  const removeKeyframe = React.useCallback((id: string): void => {
    if (!animationRef.current) return

    const newKeyframes = animationRef.current.keyframes.filter((k) => k.id !== id)
    const newDuration = newKeyframes.length > 0 ? Math.max(...newKeyframes.map((k) => k.time)) : 0

    setAnimationState({
      ...animationRef.current,
      keyframes: newKeyframes,
      duration: newDuration,
    })
  }, [])

  const updateKeyframe = React.useCallback(
    (id: string, updates: Partial<Keyframe>): void => {
      if (!animationRef.current) return

      const newKeyframes = animationRef.current.keyframes
        .map((k) => (k.id === id ? { ...k, ...updates } : k))
        .sort((a, b) => a.time - b.time)

      const newDuration = newKeyframes.length > 0 ? Math.max(...newKeyframes.map((k) => k.time)) : 0

      setAnimationState({
        ...animationRef.current,
        keyframes: newKeyframes,
        duration: newDuration,
      })
    },
    [],
  )

  const value = React.useMemo(
    () => ({
      animation,
      playing,
      currentTime,
      speed,
      loop,
      play,
      pause,
      stop,
      seek,
      setSpeed,
      setAnimation,
      addKeyframe,
      removeKeyframe,
      updateKeyframe,
    }),
    [
      animation,
      playing,
      currentTime,
      speed,
      loop,
      play,
      pause,
      stop,
      seek,
      setSpeed,
      setAnimation,
      addKeyframe,
      removeKeyframe,
      updateKeyframe,
    ],
  )

  return <SnapshotPlayerContext.Provider value={value}>{children}</SnapshotPlayerContext.Provider>
}

export function SnapshotPlayer({
  animation,
  playing = false,
  currentTime = 0,
  loop = false,
  speed = 1,
  onFrame,
  onComplete,
  onTimeUpdate,
}: SnapshotPlayerProps): null {
  const { scene, camera } = useThree()

  const animationRef = React.useRef(animation)
  const playingRef = React.useRef(playing)
  const currentTimeRef = React.useRef(currentTime)
  const speedRef = React.useRef(speed)
  const loopRef = React.useRef(loop)

  React.useEffect(() => {
    animationRef.current = animation
  }, [animation])

  React.useEffect(() => {
    playingRef.current = playing
  }, [playing])

  React.useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])

  React.useEffect(() => {
    speedRef.current = speed
  }, [speed])

  React.useEffect(() => {
    loopRef.current = loop
  }, [loop])

  const applySnapshot = React.useCallback(
    (snapshot: SceneSnapshot): void => {
      restoreCamera(camera, snapshot.camera)
      restoreObject(scene, snapshot.scene, {
        restoreCamera: true,
        restoreObjects: true,
        restoreMaterials: true,
        restoreUserData: true,
      })
    },
    [scene, camera],
  )

  const lastTimeRef = React.useRef<number>(currentTime)

  useFrame((_, delta) => {
    if (!playingRef.current || !animationRef.current) return

    const newTime = currentTimeRef.current + delta * 1000 * speedRef.current
    const duration = animationRef.current.duration

    if (newTime >= duration) {
      if (loopRef.current) {
        currentTimeRef.current = 0
        onTimeUpdate?.(0)
      } else {
        playingRef.current = false
        currentTimeRef.current = duration
        onTimeUpdate?.(duration)
        onComplete?.()
        return
      }
    } else {
      currentTimeRef.current = newTime
      onTimeUpdate?.(newTime)
    }

    const [fromKeyframe, toKeyframe, progress] = findKeyframesAtTime(
      animationRef.current.keyframes,
      currentTimeRef.current,
    )

    if (fromKeyframe && toKeyframe) {
      if (fromKeyframe.id === toKeyframe.id) {
        applySnapshot(fromKeyframe.snapshot)
        onFrame?.(fromKeyframe.snapshot, progress)
      } else {
        const interpolated = interpolateSnapshots(
          fromKeyframe.snapshot,
          toKeyframe.snapshot,
          progress,
          toKeyframe.easing,
        )
        applySnapshot(interpolated)
        onFrame?.(interpolated, progress)
      }
    }

    lastTimeRef.current = currentTimeRef.current
  })

  React.useEffect(() => {
    if (!animation || playing) return

    const [fromKeyframe, toKeyframe, progress] = findKeyframesAtTime(animation.keyframes, currentTime)

    if (fromKeyframe && toKeyframe) {
      if (fromKeyframe.id === toKeyframe.id) {
        applySnapshot(fromKeyframe.snapshot)
        onFrame?.(fromKeyframe.snapshot, progress)
      } else {
        const interpolated = interpolateSnapshots(
          fromKeyframe.snapshot,
          toKeyframe.snapshot,
          progress,
          toKeyframe.easing,
        )
        applySnapshot(interpolated)
        onFrame?.(interpolated, progress)
      }
    }
  }, [animation, currentTime, playing, applySnapshot, onFrame])

  return null
}

export type { AnimationTrack, Keyframe, SceneSnapshot, SnapshotPlayerProps }
