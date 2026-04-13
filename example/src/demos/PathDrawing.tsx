import { Line, OrbitControls, Plane } from '@react-three/drei'
import { Canvas, type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

type PlayState = 'idle' | 'playing' | 'paused' | 'completed'

interface PathState {
  points: THREE.Vector3[]
  isDrawing: boolean
  playState: PlayState
  progress: number
  currentPosition: THREE.Vector3 | null
}

function Ground({
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void
}) {
  return (
    <Plane
      args={[50, 50]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.1, 0]}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}>
      <meshStandardMaterial color="#e0e0e0" transparent opacity={0.3} />
    </Plane>
  )
}

function PathLine({ points }: { points: THREE.Vector3[] }) {
  if (points.length < 2) return null

  return (
    <>
      <Line points={points} color="#ff6b6b" lineWidth={4} />
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ff6b6b" />
        </mesh>
      ))}
    </>
  )
}

function CruiseSphere({
  pathPoints,
  playState,
  onProgressUpdate,
  onStateChange,
  onPositionUpdate,
}: {
  pathPoints: THREE.Vector3[]
  playState: PlayState
  onProgressUpdate: (progress: number) => void
  onStateChange: (state: PlayState) => void
  onPositionUpdate: (position: THREE.Vector3 | null) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(0)
  const lastPlayStateRef = useRef<PlayState>('idle')

  const curve = useMemo(() => {
    if (pathPoints.length < 2) return null
    return new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.5)
  }, [pathPoints])

  useEffect(() => {
    if (playState === 'idle' && lastPlayStateRef.current !== 'idle') {
      progressRef.current = 0
      onProgressUpdate(0)
      if (meshRef.current && curve) {
        const startPoint = curve.getPointAt(0)
        meshRef.current.position.copy(startPoint)
        onPositionUpdate(startPoint)
      }
    }
    lastPlayStateRef.current = playState
  }, [playState, curve, onProgressUpdate, onPositionUpdate])

  useFrame((_, delta) => {
    if (!curve || !meshRef.current) return

    if (playState === 'playing') {
      const speed = 0.15
      progressRef.current += delta * speed

      if (progressRef.current >= 1) {
        progressRef.current = 1
        onStateChange('completed')
      }

      onProgressUpdate(progressRef.current)

      const point = curve.getPointAt(progressRef.current)
      meshRef.current.position.copy(point)
      onPositionUpdate(point)

      if (progressRef.current < 1) {
        const tangent = curve.getTangentAt(progressRef.current)
        const lookAtPoint = point.clone().add(tangent)
        meshRef.current.lookAt(lookAtPoint)
      }
    }
  })

  if (!curve) return null

  const startPoint = curve.getPointAt(0)

  return (
    <mesh ref={meshRef} position={startPoint}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="#4ecdc4" emissive="#2a9d8f" emissiveIntensity={0.3} />
    </mesh>
  )
}

function Scene({
  pathState,
  setPathState,
  onProgressUpdate,
  onPositionUpdate,
}: {
  pathState: PathState
  setPathState: React.Dispatch<React.SetStateAction<PathState>>
  onProgressUpdate: (progress: number) => void
  onPositionUpdate: (position: THREE.Vector3 | null) => void
}) {
  const { gl } = useThree()
  const lastPointRef = useRef<THREE.Vector3 | null>(null)
  const minDistance = 0.3

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (pathState.playState === 'playing' || pathState.playState === 'paused') return
      e.stopPropagation()
      gl.domElement.setPointerCapture(e.pointerId)

      const point = e.point.clone()
      point.y = 0

      setPathState((prev) => ({
        ...prev,
        points: [point],
        isDrawing: true,
      }))
      lastPointRef.current = point
    },
    [gl.domElement, pathState.playState, setPathState],
  )

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!pathState.isDrawing) return
      e.stopPropagation()

      const point = e.point.clone()
      point.y = 0

      if (lastPointRef.current && point.distanceTo(lastPointRef.current) >= minDistance) {
        setPathState((prev) => ({
          ...prev,
          points: [...prev.points, point],
        }))
        lastPointRef.current = point
      }
    },
    [pathState.isDrawing, setPathState],
  )

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!pathState.isDrawing) return
      e.stopPropagation()
      gl.domElement.releasePointerCapture(e.pointerId)

      setPathState((prev) => ({
        ...prev,
        isDrawing: false,
      }))
      lastPointRef.current = null
    },
    [gl.domElement, pathState.isDrawing, setPathState],
  )

  const handleStateChange = useCallback(
    (state: PlayState) => {
      setPathState((prev) => ({ ...prev, playState: state }))
    },
    [setPathState],
  )

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <Ground onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} />

      <gridHelper args={[50, 50, '#888888', '#cccccc']} position={[0, 0, 0]} />

      <PathLine points={pathState.points} />

      <CruiseSphere
        pathPoints={pathState.points}
        playState={pathState.playState}
        onProgressUpdate={onProgressUpdate}
        onStateChange={handleStateChange}
        onPositionUpdate={onPositionUpdate}
      />

      <OrbitControls enabled={!pathState.isDrawing} enablePan={true} enableZoom={true} enableRotate={true} />
    </>
  )
}

function calculatePathLength(points: THREE.Vector3[]): number {
  if (points.length < 2) return 0
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i - 1])
  }
  return length
}

function getStateText(state: PlayState): string {
  switch (state) {
    case 'idle':
      return '就绪'
    case 'playing':
      return '巡航中'
    case 'paused':
      return '已暂停'
    case 'completed':
      return '已完成'
    default:
      return '未知'
  }
}

function getStateColor(state: PlayState): string {
  switch (state) {
    case 'idle':
      return '#666'
    case 'playing':
      return '#4ecdc4'
    case 'paused':
      return '#f7b731'
    case 'completed':
      return '#5f27cd'
    default:
      return '#666'
  }
}

export default function App() {
  const [pathState, setPathState] = useState<PathState>({
    points: [],
    isDrawing: false,
    playState: 'idle',
    progress: 0,
    currentPosition: null,
  })
  const [notification, setNotification] = useState<string | null>(null)

  const pathLength = useMemo(() => calculatePathLength(pathState.points), [pathState.points])

  const showNotification = useCallback((message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const handleStart = useCallback(() => {
    if (pathState.points.length < 2) {
      showNotification('请先绘制有效路径（至少2个点）')
      return
    }
    setPathState((prev) => ({ ...prev, playState: 'playing' }))
  }, [pathState.points.length, showNotification])

  const handlePause = useCallback(() => {
    setPathState((prev) => ({ ...prev, playState: 'paused' }))
  }, [])

  const handleResume = useCallback(() => {
    setPathState((prev) => ({ ...prev, playState: 'playing' }))
  }, [])

  const handleStop = useCallback(() => {
    setPathState((prev) => ({
      ...prev,
      playState: 'idle',
      progress: 0,
      currentPosition: null,
    }))
  }, [])

  const handleClear = useCallback(() => {
    if (pathState.playState === 'playing' || pathState.playState === 'paused') {
      showNotification('请先停止巡航再清空路径')
      return
    }
    setPathState({
      points: [],
      isDrawing: false,
      playState: 'idle',
      progress: 0,
      currentPosition: null,
    })
  }, [pathState.playState, showNotification])

  const handleProgressUpdate = useCallback((progress: number) => {
    setPathState((prev) => ({ ...prev, progress }))
  }, [])

  const handlePositionUpdate = useCallback((position: THREE.Vector3 | null) => {
    setPathState((prev) => ({ ...prev, currentPosition: position }))
  }, [])

  useEffect(() => {
    if (pathState.playState === 'completed') {
      showNotification('巡航完成！')
    }
  }, [pathState.playState, showNotification])

  const traveledDistance = pathLength * pathState.progress

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [15, 15, 15], fov: 50 }} style={{ background: '#f0f0f0' }}>
        <Scene
          pathState={pathState}
          setPathState={setPathState}
          onProgressUpdate={handleProgressUpdate}
          onPositionUpdate={handlePositionUpdate}
        />
      </Canvas>

      {/* 控制面板 */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          minWidth: '280px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
        <h3
          style={{
            margin: '0 0 16px 0',
            fontSize: '18px',
            fontWeight: '600',
            color: '#333',
          }}>
          轨迹绘制与巡航
        </h3>

        {/* 操作说明 */}
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.5',
          }}>
          <div>🖱️ 按住鼠标在地面拖动绘制轨迹</div>
          <div>🔄 滚轮缩放，右键旋转视角</div>
        </div>

        {/* 控制按钮 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {pathState.playState === 'idle' && (
            <button
              onClick={handleStart}
              disabled={pathState.points.length < 2}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: pathState.points.length < 2 ? '#ccc' : '#4ecdc4',
                color: 'white',
                fontSize: '14px',
                cursor: pathState.points.length < 2 ? 'not-allowed' : 'pointer',
                fontWeight: '500',
              }}>
              开始巡航
            </button>
          )}

          {pathState.playState === 'playing' && (
            <button
              onClick={handlePause}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#f7b731',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
              }}>
              暂停
            </button>
          )}

          {pathState.playState === 'paused' && (
            <button
              onClick={handleResume}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#4ecdc4',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
              }}>
              继续
            </button>
          )}

          {(pathState.playState === 'playing' || pathState.playState === 'paused') && (
            <button
              onClick={handleStop}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#ff6b6b',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '500',
              }}>
              停止
            </button>
          )}

          <button
            onClick={handleClear}
            disabled={pathState.playState === 'playing' || pathState.playState === 'paused'}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: 'white',
              color: pathState.playState === 'playing' || pathState.playState === 'paused' ? '#999' : '#666',
              fontSize: '14px',
              cursor: pathState.playState === 'playing' || pathState.playState === 'paused' ? 'not-allowed' : 'pointer',
              fontWeight: '500',
            }}>
            清空路径
          </button>
        </div>

        {/* 状态展示 */}
        <div
          style={{
            borderTop: '1px solid #eee',
            paddingTop: '16px',
          }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
            <span style={{ fontSize: '14px', color: '#666' }}>当前状态</span>
            <span
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: getStateColor(pathState.playState),
                padding: '4px 12px',
                background: `${getStateColor(pathState.playState)}15`,
                borderRadius: '4px',
              }}>
              {getStateText(pathState.playState)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}>
            <span style={{ color: '#666' }}>路径长度</span>
            <span style={{ fontWeight: '500', color: '#333' }}>{pathLength.toFixed(2)} 单位</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}>
            <span style={{ color: '#666' }}>已行进</span>
            <span style={{ fontWeight: '500', color: '#333' }}>{traveledDistance.toFixed(2)} 单位</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '12px',
              fontSize: '14px',
            }}>
            <span style={{ color: '#666' }}>进度</span>
            <span style={{ fontWeight: '500', color: '#333' }}>{(pathState.progress * 100).toFixed(1)}%</span>
          </div>

          {/* 进度条 */}
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
            <div
              style={{
                width: `${pathState.progress * 100}%`,
                height: '100%',
                background: '#4ecdc4',
                borderRadius: '4px',
                transition: 'width 0.1s ease',
              }}
            />
          </div>

          {pathState.currentPosition && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px',
                background: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#666',
              }}>
              球体位置: ({pathState.currentPosition.x.toFixed(1)}, {pathState.currentPosition.z.toFixed(1)})
            </div>
          )}
        </div>
      </div>

      {/* 通知提示 */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            background: '#333',
            color: 'white',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            animation: 'slideIn 0.3s ease',
            zIndex: 1000,
          }}>
          {notification}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
