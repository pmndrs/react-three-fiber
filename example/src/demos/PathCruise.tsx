import { Line, OrbitControls, Text } from '@react-three/drei'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

type PlaybackState = 'idle' | 'playing' | 'paused' | 'completed'

interface PathPoint {
  x: number
  y: number
  z: number
}

function GroundPlane({
  onDrawing,
  isDrawing,
  pathPoints,
}: {
  onDrawing: (point: PathPoint | null) => void
  isDrawing: boolean
  pathPoints: PathPoint[]
}) {
  const planeRef = useRef<THREE.Mesh>(null)
  const { raycaster, camera } = useThree()

  const getGroundIntersection = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!planeRef.current) return null
      const ray = raycaster.ray
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      ray.intersectPlane(plane, intersection)
      return intersection
    },
    [raycaster],
  )

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const intersection = getGroundIntersection(event)
    if (intersection) {
      onDrawing({ x: intersection.x, y: 0, z: intersection.z })
    }
  }

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDrawing) return
    event.stopPropagation()
    const intersection = getGroundIntersection(event)
    if (intersection) {
      onDrawing({ x: intersection.x, y: 0, z: intersection.z })
    }
  }

  const handlePointerUp = () => {
    if (isDrawing) {
      onDrawing(null)
    }
  }

  return (
    <mesh
      ref={planeRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#2a3f5f" transparent opacity={0.8} side={THREE.DoubleSide} />
      <gridHelper args={[50, 50, '#4a6785', '#3a5775']} position={[0, 0.01, 0]} />
    </mesh>
  )
}

function CruiseSphere({ position, isMoving }: { position: [number, number, number]; isMoving: boolean }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color={isMoving ? '#00ff88' : '#ff6b6b'}
        emissive={isMoving ? '#00ff88' : '#ff6b6b'}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

function PathLine({ points }: { points: [number, number, number][] }) {
  if (points.length < 2) return null
  return <Line points={points} color="#00ffff" lineWidth={3} transparent opacity={0.9} />
}

function Scene({
  pathPoints,
  spherePosition,
  isDrawing,
  isMoving,
  onDrawing,
}: {
  pathPoints: PathPoint[]
  spherePosition: [number, number, number]
  isDrawing: boolean
  isMoving: boolean
  onDrawing: (point: PathPoint | null) => void
}) {
  const linePoints: [number, number, number][] = pathPoints.map((p) => [p.x, p.y + 0.05, p.z])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00ffff" />

      <GroundPlane onDrawing={onDrawing} isDrawing={isDrawing} pathPoints={pathPoints} />
      <PathLine points={linePoints} />
      <CruiseSphere position={spherePosition} isMoving={isMoving} />

      <OrbitControls makeDefault minDistance={5} maxDistance={30} />
    </>
  )
}

function ControlPanel({
  playbackState,
  pathLength,
  progress,
  hasValidPath,
  onStart,
  onPause,
  onResume,
  onStop,
  onClear,
}: {
  playbackState: PlaybackState
  pathLength: number
  progress: number
  hasValidPath: boolean
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onClear: () => void
}) {
  const [showTip, setShowTip] = useState('')

  const handleStart = () => {
    if (!hasValidPath) {
      setShowTip('请先在地面绘制一条有效路径')
      setTimeout(() => setShowTip(''), 2000)
      return
    }
    onStart()
  }

  const stateLabels: Record<PlaybackState, string> = {
    idle: '待机',
    playing: '巡航中',
    paused: '已暂停',
    completed: '已完成',
  }

  const stateColors: Record<PlaybackState, string> = {
    idle: '#888',
    playing: '#00ff88',
    paused: '#ffaa00',
    completed: '#00aaff',
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: 20,
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        minWidth: 280,
        zIndex: 100,
      }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#00ffff' }}>🚢 轨迹巡航控制</h3>

      <div style={{ marginBottom: 16, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#aaa' }}>路径长度:</span>
          <span style={{ fontWeight: 600 }}>{pathLength.toFixed(2)} 单位</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#aaa' }}>行进进度:</span>
          <span style={{ fontWeight: 600 }}>{(progress * 100).toFixed(1)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#aaa' }}>当前状态:</span>
          <span style={{ fontWeight: 600, color: stateColors[playbackState] }}>{stateLabels[playbackState]}</span>
        </div>
        <div
          style={{
            width: '100%',
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            marginTop: 10,
            overflow: 'hidden',
          }}>
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              background: stateColors[playbackState],
              borderRadius: 3,
              transition: 'width 0.1s ease',
            }}
          />
        </div>
      </div>

      {showTip && (
        <div
          style={{
            padding: 10,
            background: 'rgba(255, 170, 0, 0.2)',
            border: '1px solid #ffaa00',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            color: '#ffaa00',
          }}>
          ⚠️ {showTip}
        </div>
      )}

      {playbackState === 'completed' && (
        <div
          style={{
            padding: 10,
            background: 'rgba(0, 170, 255, 0.2)',
            border: '1px solid #00aaff',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 13,
            color: '#00aaff',
          }}>
          ✅ 巡航已完成！
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {playbackState === 'idle' || playbackState === 'completed' ? (
          <button
            onClick={handleStart}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: hasValidPath ? 'pointer' : 'not-allowed',
              background: hasValidPath ? '#00ff88' : '#444',
              color: hasValidPath ? '#000' : '#888',
              transition: 'all 0.2s',
            }}>
            ▶️ 开始巡航
          </button>
        ) : playbackState === 'playing' ? (
          <button
            onClick={onPause}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ffaa00',
              color: '#000',
              transition: 'all 0.2s',
            }}>
            ⏸️ 暂停
          </button>
        ) : (
          <button
            onClick={onResume}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#00ff88',
              color: '#000',
              transition: 'all 0.2s',
            }}>
            ▶️ 继续
          </button>
        )}

        {(playbackState === 'playing' || playbackState === 'paused') && (
          <button
            onClick={onStop}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ff6b6b',
              color: 'white',
              transition: 'all 0.2s',
            }}>
            ⏹️ 停止
          </button>
        )}

        {(playbackState === 'idle' || playbackState === 'completed') && (
          <button
            onClick={onClear}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: '#666',
              color: 'white',
              transition: 'all 0.2s',
            }}>
            🗑️ 清空路径
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: 12,
          color: '#888',
        }}>
        💡 按住鼠标在地面拖动即可绘制路径
      </div>
    </div>
  )
}

export default function PathCruise() {
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [progress, setProgress] = useState(0)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)
  const speed = 0.15

  const calculatePathLength = useCallback(() => {
    let length = 0
    for (let i = 1; i < pathPoints.length; i++) {
      const dx = pathPoints[i].x - pathPoints[i - 1].x
      const dz = pathPoints[i].z - pathPoints[i - 1].z
      length += Math.sqrt(dx * dx + dz * dz)
    }
    return length
  }, [pathPoints])

  const getPositionAtProgress = useCallback(
    (progressValue: number): [number, number, number] => {
      if (pathPoints.length === 0) return [0, 0.3, 0]
      if (pathPoints.length === 1) return [pathPoints[0].x, 0.3, pathPoints[0].z]

      const totalLength = calculatePathLength()
      const targetDistance = totalLength * progressValue
      let accumulatedDistance = 0

      for (let i = 1; i < pathPoints.length; i++) {
        const dx = pathPoints[i].x - pathPoints[i - 1].x
        const dz = pathPoints[i].z - pathPoints[i - 1].z
        const segmentLength = Math.sqrt(dx * dx + dz * dz)

        if (accumulatedDistance + segmentLength >= targetDistance) {
          const t = (targetDistance - accumulatedDistance) / segmentLength
          return [pathPoints[i - 1].x + dx * t, 0.3, pathPoints[i - 1].z + dz * t]
        }
        accumulatedDistance += segmentLength
      }

      const last = pathPoints[pathPoints.length - 1]
      return [last.x, 0.3, last.z]
    },
    [pathPoints, calculatePathLength],
  )

  const handleDrawing = useCallback(
    (point: PathPoint | null) => {
      if (playbackState !== 'idle' && playbackState !== 'completed') return

      if (point === null) {
        setIsDrawing(false)
        return
      }

      if (!isDrawing) {
        setIsDrawing(true)
        setPathPoints([point])
        setPlaybackState('idle')
        setProgress(0)
      } else {
        setPathPoints((prev) => {
          const last = prev[prev.length - 1]
          if (!last) return [point]
          const dx = point.x - last.x
          const dz = point.z - last.z
          const dist = Math.sqrt(dx * dx + dz * dz)
          if (dist > 0.2) {
            return [...prev, point]
          }
          return prev
        })
      }
    },
    [isDrawing, playbackState],
  )

  const handleStart = () => {
    setPlaybackState('playing')
    setProgress(0)
    lastTimeRef.current = performance.now()
  }

  const handlePause = () => {
    setPlaybackState('paused')
  }

  const handleResume = () => {
    setPlaybackState('playing')
    lastTimeRef.current = performance.now()
  }

  const handleStop = () => {
    setPlaybackState('idle')
    setProgress(0)
  }

  const handleClear = () => {
    setPathPoints([])
    setProgress(0)
    setPlaybackState('idle')
  }

  useEffect(() => {
    if (playbackState !== 'playing') return

    const animate = (time: number) => {
      const deltaTime = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time

      setProgress((prev) => {
        const newProgress = prev + speed * deltaTime
        if (newProgress >= 1) {
          setPlaybackState('completed')
          return 1
        }
        return newProgress
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [playbackState])

  const spherePosition = getPositionAtProgress(progress)
  const pathLength = calculatePathLength()
  const hasValidPath = pathPoints.length >= 2 && pathLength > 0.5

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} style={{ background: '#1a1a2e' }}>
        <Scene
          pathPoints={pathPoints}
          spherePosition={spherePosition}
          isDrawing={isDrawing}
          isMoving={playbackState === 'playing'}
          onDrawing={handleDrawing}
        />
      </Canvas>

      <ControlPanel
        playbackState={playbackState}
        pathLength={pathLength}
        progress={progress}
        hasValidPath={hasValidPath}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onClear={handleClear}
      />
    </div>
  )
}
