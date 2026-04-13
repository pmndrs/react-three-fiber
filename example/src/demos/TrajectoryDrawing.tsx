import { Line, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'

type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped' | 'completed'

function Ground({ onPointerDown, onPointerMove, onPointerUp }: any) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#1a1a2e" />
    </mesh>
  )
}

function PathRenderer({ points }: { points: [number, number, number][] }) {
  if (points.length < 2) return null
  return (
    <group>
      <Line points={points} color="#ff6b6b" lineWidth={4} />
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#ff9f43" />
        </mesh>
      ))}
    </group>
  )
}

function CruiseSphere({
  position,
}: {
  position: [number, number, number]
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial color="#4ecdc4" emissive="#4ecdc4" emissiveIntensity={0.5} />
    </mesh>
  )
}

function Scene({
  pathPoints,
  setPathPoints,
  isDrawing,
  setIsDrawing,
  spherePosition,
  playbackState,
}: {
  pathPoints: [number, number, number][]
  setPathPoints: React.Dispatch<React.SetStateAction<[number, number, number][]>>
  isDrawing: boolean
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>
  spherePosition: [number, number, number]
  playbackState: PlaybackState
}) {
  const { camera, raycaster, pointer } = useThree()

  const getGroundPoint = useCallback(() => {
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const point = new THREE.Vector3()
    raycaster.setFromCamera(pointer, camera)
    raycaster.intersectPlane(ground, point)
    return [point.x, 0.01, point.z] as [number, number, number]
  }, [camera, raycaster, pointer])

  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const point = getGroundPoint()
    setPathPoints([point])
    setIsDrawing(true)
  }, [getGroundPoint, setPathPoints, setIsDrawing])

  const handlePointerMove = useCallback(() => {
    if (!isDrawing) return
    const point = getGroundPoint()
    setPathPoints((prev) => {
      const lastPoint = prev[prev.length - 1]
      const distance = Math.sqrt(
        Math.pow(point[0] - lastPoint[0], 2) + Math.pow(point[2] - lastPoint[2], 2)
      )
      if (distance > 0.3) {
        return [...prev, point]
      }
      return prev
    })
  }, [isDrawing, getGroundPoint, setPathPoints])

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false)
  }, [setIsDrawing])

  return (
    <group>
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={60} />
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <Ground
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <gridHelper args={[50, 50, 0x444444, 0x222222]} />
      <PathRenderer points={pathPoints} />
      <CruiseSphere position={spherePosition} />
    </group>
  )
}

function calculatePathLength(points: [number, number, number][]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dz = points[i][2] - points[i - 1][2]
    length += Math.sqrt(dx * dx + dz * dz)
  }
  return length
}

function getPositionOnPath(
  points: [number, number, number][],
  progress: number
): [number, number, number] {
  if (points.length === 0) return [0, 0.2, 0]
  if (points.length === 1) return [points[0][0], 0.2, points[0][2]]
  if (progress <= 0) return [points[0][0], 0.2, points[0][2]]
  if (progress >= 1) return [points[points.length - 1][0], 0.2, points[points.length - 1][2]]

  const totalLength = calculatePathLength(points)
  const targetDistance = progress * totalLength

  let currentDistance = 0
  for (let i = 1; i < points.length; i++) {
    const segmentLength = Math.sqrt(
      Math.pow(points[i][0] - points[i - 1][0], 2) + Math.pow(points[i][2] - points[i - 1][2], 2)
    )
    if (currentDistance + segmentLength >= targetDistance) {
      const t = (targetDistance - currentDistance) / segmentLength
      return [
        points[i - 1][0] + t * (points[i][0] - points[i - 1][0]),
        0.2,
        points[i - 1][2] + t * (points[i][2] - points[i - 1][2]),
      ]
    }
    currentDistance += segmentLength
  }
  return [points[points.length - 1][0], 0.2, points[points.length - 1][2]]
}

export default function App() {
  const [pathPoints, setPathPoints] = useState<[number, number, number][]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(2)
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const pathLength = calculatePathLength(pathPoints)
  const hasValidPath = pathPoints.length >= 2

  const spherePosition = getPositionOnPath(pathPoints, progress)

  const animate = useCallback((time: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = time
    }
    const delta = (time - lastTimeRef.current) / 1000
    lastTimeRef.current = time

    setProgress((prev) => {
      const newProgress = prev + (speed / pathLength) * delta
      if (newProgress >= 1) {
        setPlaybackState('completed')
        return 1
      }
      return newProgress
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [speed, pathLength])

  const start = useCallback(() => {
    if (!hasValidPath) {
      alert('请先绘制一条路径！')
      return
    }
    setPlaybackState('playing')
    lastTimeRef.current = 0
    animationRef.current = requestAnimationFrame(animate)
  }, [hasValidPath, animate])

  const pause = useCallback(() => {
    setPlaybackState('paused')
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const resume = useCallback(() => {
    setPlaybackState('playing')
    lastTimeRef.current = 0
    animationRef.current = requestAnimationFrame(animate)
  }, [animate])

  const stop = useCallback(() => {
    setPlaybackState('stopped')
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setProgress(0)
  }, [])

  const clearPath = useCallback(() => {
    if (playbackState === 'playing' || playbackState === 'paused') {
      stop()
    }
    setPathPoints([])
    setProgress(0)
    setPlaybackState('idle')
  }, [playbackState, stop])

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const getStateText = () => {
    switch (playbackState) {
      case 'idle':
        return '待命中'
      case 'playing':
        return '巡航中'
      case 'paused':
        return '已暂停'
      case 'stopped':
        return '已停止'
      case 'completed':
        return '巡航完成！'
      default:
        return '未知'
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas>
        <Scene
          pathPoints={pathPoints}
          setPathPoints={setPathPoints}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
          spherePosition={spherePosition}
          playbackState={playbackState}
        />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          minWidth: '280px',
        }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>轨迹绘制与巡航</h2>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>路径长度</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{pathLength.toFixed(2)} 单位</div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>已行进进度</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{(progress * 100).toFixed(1)}%</div>
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#333',
              borderRadius: '4px',
              marginTop: '5px',
              overflow: 'hidden',
            }}>
            <div
              style={{
                width: `${progress * 100}%`,
                height: '100%',
                background: '#4ecdc4',
                borderRadius: '4px',
                transition: 'width 0.1s',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>播放状态</div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: playbackState === 'completed' ? '#4ecdc4' : '#ff9f43',
            }}>
            {getStateText()}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '15px' }}>
          {playbackState === 'idle' || playbackState === 'stopped' || playbackState === 'completed' ? (
            <button
              onClick={start}
              disabled={!hasValidPath}
              style={{
                padding: '10px',
                background: hasValidPath ? '#ff9f43' : '#444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: hasValidPath ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: 'bold',
              }}>
              开始巡航
            </button>
          ) : null}

          {playbackState === 'playing' ? (
            <button
              onClick={pause}
              style={{
                padding: '10px',
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}>
              暂停
            </button>
          ) : null}

          {playbackState === 'paused' ? (
            <button
              onClick={resume}
              style={{
                padding: '10px',
                background: '#4ecdc4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}>
              继续
            </button>
          ) : null}

          {(playbackState === 'playing' || playbackState === 'paused' || playbackState === 'completed') ? (
            <button
              onClick={stop}
              style={{
                padding: '10px',
                background: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
              }}>
              停止
            </button>
          ) : null}

          <button
            onClick={clearPath}
            style={{
              padding: '10px',
              background: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              gridColumn: '1 / -1',
            }}>
            清空路径
          </button>
        </div>

        <div style={{ marginTop: '15px', fontSize: '12px', color: '#aaa' }}>
          <p style={{ margin: '5px 0' }}>💡 按住鼠标在地面上拖动绘制路径</p>
        </div>
      </div>
    </div>
  )
}
