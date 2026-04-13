import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { Line, OrbitControls, Grid } from '@react-three/drei'
import { create } from 'zustand'
import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'

type CruiseState = 'idle' | 'playing' | 'paused' | 'completed'

interface PathStore {
  pathPoints: THREE.Vector3[]
  cruiseState: CruiseState
  progress: number
  speed: number
  setPathPoints: (points: THREE.Vector3[]) => void
  addPathPoint: (point: THREE.Vector3) => void
  clearPath: () => void
  setCruiseState: (state: CruiseState) => void
  setProgress: (progress: number) => void
  setSpeed: (speed: number) => void
}

const usePathStore = create<PathStore>((set) => ({
  pathPoints: [],
  cruiseState: 'idle',
  progress: 0,
  speed: 2,
  setPathPoints: (points) => set({ pathPoints: points }),
  addPathPoint: (point) =>
    set((state) => {
      if (state.pathPoints.length === 0) {
        return { pathPoints: [point] }
      }
      const lastPoint = state.pathPoints[state.pathPoints.length - 1]
      if (lastPoint.distanceTo(point) > 0.1) {
        return { pathPoints: [...state.pathPoints, point] }
      }
      return state
    }),
  clearPath: () => set({ pathPoints: [], cruiseState: 'idle', progress: 0 }),
  setCruiseState: (state) => set({ cruiseState: state }),
  setProgress: (progress) => set({ progress }),
  setSpeed: (speed) => set({ speed }),
}))

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} />
    </mesh>
  )
}

function PathDrawer() {
  const { camera, raycaster, pointer } = useThree()
  const isDrawing = useRef(false)
  const addPathPoint = usePathStore((state) => state.addPathPoint)
  const cruiseState = usePathStore((state) => state.cruiseState)
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))

  const getGroundPoint = useCallback(
    (event: PointerEvent) => {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(groundPlane.current, intersection)
      return intersection
    },
    [camera, raycaster],
  )

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (cruiseState !== 'idle') return
      const point = getGroundPoint(event.nativeEvent as PointerEvent)
      if (point && Number.isFinite(point.x) && Number.isFinite(point.z)) {
        isDrawing.current = true
        addPathPoint(new THREE.Vector3(point.x, 0.1, point.z))
      }
    },
    [addPathPoint, cruiseState, getGroundPoint],
  )

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isDrawing.current) return
      const point = getGroundPoint(event.nativeEvent as PointerEvent)
      if (point && Number.isFinite(point.x) && Number.isFinite(point.z)) {
        addPathPoint(new THREE.Vector3(point.x, 0.1, point.z))
      }
    },
    [addPathPoint, getGroundPoint],
  )

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerUp])

  return (
    <mesh position={[0, 0, 0]} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} visible={false}>
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

function PathLine() {
  const pathPoints = usePathStore((state) => state.pathPoints)

  if (pathPoints.length < 2) return null

  const points = pathPoints.map((p) => [p.x, p.y, p.z])

  return <Line points={points} color="#00ff88" lineWidth={3} opacity={0.9} transparent />
}

function CruiseSphere() {
  const meshRef = useRef<THREE.Mesh>(null)
  const pathPoints = usePathStore((state) => state.pathPoints)
  const cruiseState = usePathStore((state) => state.cruiseState)
  const progress = usePathStore((state) => state.progress)
  const speed = usePathStore((state) => state.speed)
  const setProgress = usePathStore((state) => state.setProgress)
  const setCruiseState = usePathStore((state) => state.setCruiseState)

  const currentProgressRef = useRef(0)

  useEffect(() => {
    currentProgressRef.current = progress
  }, [progress])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (cruiseState !== 'playing' || pathPoints.length < 2) return

    const totalLength = calculatePathLength(pathPoints)
    if (totalLength === 0) return

    const progressDelta = (speed * delta) / totalLength
    currentProgressRef.current = Math.min(currentProgressRef.current + progressDelta, 1)
    setProgress(currentProgressRef.current)

    if (currentProgressRef.current >= 1) {
      setCruiseState('completed')
      return
    }

    const position = getPositionOnPath(pathPoints, currentProgressRef.current)
    meshRef.current.position.copy(position)
  })

  useEffect(() => {
    if (!meshRef.current) return

    if (cruiseState === 'idle' && pathPoints.length > 0) {
      meshRef.current.position.copy(pathPoints[0])
      currentProgressRef.current = 0
      setProgress(0)
    } else if (cruiseState === 'playing' && pathPoints.length > 0) {
      const position = getPositionOnPath(pathPoints, currentProgressRef.current)
      meshRef.current.position.copy(position)
    }
  }, [cruiseState, pathPoints, setProgress])

  if (pathPoints.length === 0) return null

  return (
    <mesh ref={meshRef} position={[pathPoints[0]?.x || 0, 0.5, pathPoints[0]?.z || 0]} castShadow>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial
        color={cruiseState === 'playing' ? '#ff6b6b' : cruiseState === 'completed' ? '#4caf50' : '#ffd93d'}
        emissive={cruiseState === 'playing' ? '#ff6b6b' : '#000000'}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

function calculatePathLength(points: THREE.Vector3[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) {
    length += points[i].distanceTo(points[i - 1])
  }
  return length
}

function getPositionOnPath(points: THREE.Vector3[], progress: number): THREE.Vector3 {
  if (points.length === 0) return new THREE.Vector3()
  if (points.length === 1) return points[0].clone()

  const totalLength = calculatePathLength(points)
  if (totalLength === 0) return points[0].clone()

  const targetLength = progress * totalLength
  let currentLength = 0

  for (let i = 1; i < points.length; i++) {
    const segmentLength = points[i].distanceTo(points[i - 1])
    if (currentLength + segmentLength >= targetLength) {
      const segmentProgress = (targetLength - currentLength) / segmentLength
      return new THREE.Vector3().lerpVectors(points[i - 1], points[i], segmentProgress)
    }
    currentLength += segmentLength
  }

  return points[points.length - 1].clone()
}

function ControlPanel() {
  const pathPoints = usePathStore((state) => state.pathPoints)
  const cruiseState = usePathStore((state) => state.cruiseState)
  const progress = usePathStore((state) => state.progress)
  const speed = usePathStore((state) => state.speed)
  const clearPath = usePathStore((state) => state.clearPath)
  const setCruiseState = usePathStore((state) => state.setCruiseState)
  const setSpeed = usePathStore((state) => state.setSpeed)
  const setProgress = usePathStore((state) => state.setProgress)

  const [showMessage, setShowMessage] = useState<string | null>(null)

  const pathLength = calculatePathLength(pathPoints)
  const hasValidPath = pathPoints.length >= 2 && pathLength > 0.5

  const handleStart = () => {
    if (!hasValidPath) {
      setShowMessage('请先绘制有效路径（至少需要2个点且长度大于0.5）')
      setTimeout(() => setShowMessage(null), 3000)
      return
    }
    setCruiseState('playing')
  }

  const handlePause = () => {
    if (cruiseState === 'playing') {
      setCruiseState('paused')
    }
  }

  const handleResume = () => {
    if (cruiseState === 'paused') {
      setCruiseState('playing')
    }
  }

  const handleStop = () => {
    setCruiseState('idle')
    setProgress(0)
  }

  const handleClear = () => {
    clearPath()
    setShowMessage(null)
  }

  const getStateText = () => {
    switch (cruiseState) {
      case 'idle':
        return '空闲'
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

  const getStateColor = () => {
    switch (cruiseState) {
      case 'idle':
        return '#666'
      case 'playing':
        return '#4caf50'
      case 'paused':
        return '#ff9800'
      case 'completed':
        return '#2196f3'
      default:
        return '#666'
    }
  }

  return (
    <div className="path-cruise-panel">
      <div className="panel-section">
        <h3>轨迹状态</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>路径长度</label>
            <span>{pathLength.toFixed(2)} 单位</span>
          </div>
          <div className="info-item">
            <label>路径点数</label>
            <span>{pathPoints.length} 个</span>
          </div>
          <div className="info-item">
            <label>行进进度</label>
            <span>{(progress * 100).toFixed(1)}%</span>
          </div>
          <div className="info-item">
            <label>当前状态</label>
            <span style={{ color: getStateColor(), fontWeight: 'bold' }}>{getStateText()}</span>
          </div>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="panel-section">
        <h3>速度控制</h3>
        <div className="control-group">
          <label>巡航速度: {speed.toFixed(1)} 单位/秒</label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="panel-section">
        <h3>轨迹绘制</h3>
        <p className="hint-text">按住鼠标在地面上拖动绘制路径</p>
        <button className="action-btn clear-btn" onClick={handleClear}>
          清空路径
        </button>
      </div>

      <div className="panel-section">
        <h3>巡航控制</h3>
        <div className="button-group">
          {(cruiseState === 'idle' || cruiseState === 'completed') && (
            <button
              className={`action-btn ${hasValidPath ? 'start-btn' : 'disabled-btn'}`}
              onClick={handleStart}
              disabled={!hasValidPath}>
              开始巡航
            </button>
          )}
          {cruiseState === 'playing' && (
            <button className="action-btn pause-btn" onClick={handlePause}>
              暂停
            </button>
          )}
          {cruiseState === 'paused' && (
            <button className="action-btn resume-btn" onClick={handleResume}>
              继续
            </button>
          )}
          {(cruiseState === 'playing' || cruiseState === 'paused') && (
            <button className="action-btn stop-btn" onClick={handleStop}>
              停止
            </button>
          )}
        </div>
      </div>

      {showMessage && <div className="message-toast">{showMessage}</div>}

      {cruiseState === 'completed' && <div className="completion-message">巡航完成！球体已到达终点</div>}
    </div>
  )
}

export default function PathCruise() {
  return (
    <div className="path-cruise-container">
      <Canvas shadows camera={{ position: [8, 8, 8], fov: 50 }}>
        <color attach="background" args={['#0a0a0f']} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />
        <Ground />
        <Grid
          position={[0, 0.01, 0]}
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#3a3a5a"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#5a5a8a"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
        />
        <PathDrawer />
        <PathLine />
        <CruiseSphere />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />
      </Canvas>
      <ControlPanel />
    </div>
  )
}
