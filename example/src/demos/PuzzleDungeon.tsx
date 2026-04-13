import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

type PuzzleState = {
  currentPhase: number
  mechanism1Activated: boolean
  mechanism2Activated: boolean
  mechanism3Activated: boolean
  completedMechanisms: number
  hasFailed: boolean
  failureReason: string
  isVictory: boolean
}

type PlayerPosition = { x: number; z: number }

const INITIAL_STATE: PuzzleState = {
  currentPhase: 1,
  mechanism1Activated: false,
  mechanism2Activated: false,
  mechanism3Activated: false,
  completedMechanisms: 0,
  hasFailed: false,
  failureReason: '',
  isVictory: false,
}

const PLAYER_SPEED = 0.08
const ARENA_SIZE = 12

function Player({
  position,
  onMechanismTrigger,
  onGoalEnter,
  puzzleState,
}: {
  position: PlayerPosition
  onMechanismTrigger: (id: number) => void
  onGoalEnter: () => void
  puzzleState: PuzzleState
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const keysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const posRef = useRef(new THREE.Vector3(position.x, 0.5, position.z))

  useFrame(() => {
    if (!meshRef.current || puzzleState.hasFailed || puzzleState.isVictory) return

    const keys = keysRef.current
    let dx = 0
    let dz = 0

    if (keys.has('w') || keys.has('arrowup')) dz -= PLAYER_SPEED
    if (keys.has('s') || keys.has('arrowdown')) dz += PLAYER_SPEED
    if (keys.has('a') || keys.has('arrowleft')) dx -= PLAYER_SPEED
    if (keys.has('d') || keys.has('arrowright')) dx += PLAYER_SPEED

    const newX = Math.max(-ARENA_SIZE / 2 + 0.5, Math.min(ARENA_SIZE / 2 - 0.5, posRef.current.x + dx))
    const newZ = Math.max(-ARENA_SIZE / 2 + 0.5, Math.min(ARENA_SIZE / 2 - 0.5, posRef.current.z + dz))

    posRef.current.x = newX
    posRef.current.z = newZ
    meshRef.current.position.x = newX
    meshRef.current.position.z = newZ

    if (dx !== 0 || dz !== 0) {
      const angle = Math.atan2(dx, dz)
      meshRef.current.rotation.y = angle
    }

    checkMechanisms(newX, newZ)
    checkGoal(newX, newZ)
  })

  const checkMechanisms = (x: number, z: number) => {
    const mech1Pos = { x: -4, z: -3 }
    const mech2Pos = { x: 0, z: -3 }
    const mech3Pos = { x: 4, z: -3 }

    const dist = (px: number, pz: number, mx: number, mz: number) => Math.sqrt((px - mx) ** 2 + (pz - mz) ** 2)

    if (dist(x, z, mech1Pos.x, mech1Pos.z) < 1.2 && !puzzleState.mechanism1Activated) {
      onMechanismTrigger(1)
    }
    if (dist(x, z, mech2Pos.x, mech2Pos.z) < 1.2 && !puzzleState.mechanism2Activated) {
      onMechanismTrigger(2)
    }
    if (dist(x, z, mech3Pos.x, mech3Pos.z) < 1.2 && !puzzleState.mechanism3Activated) {
      onMechanismTrigger(3)
    }
  }

  const checkGoal = (x: number, z: number) => {
    const goalPos = { x: 0, z: 5 }
    const dist = Math.sqrt((x - goalPos.x) ** 2 + (z - goalPos.z) ** 2)
    if (dist < 1.5 && puzzleState.completedMechanisms === 3) {
      onGoalEnter()
    }
  }

  return (
    <mesh ref={meshRef} position={[position.x, 0.5, position.z]} castShadow>
      <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
      <meshStandardMaterial color={puzzleState.hasFailed ? '#666' : puzzleState.isVictory ? '#4caf50' : '#ff9800'} />
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={puzzleState.hasFailed ? '#888' : '#ffcc80'} />
      </mesh>
    </mesh>
  )
}

function Mechanism({
  id,
  position,
  isActivated,
  canActivate,
  label,
  mechanismType,
}: {
  id: number
  position: [number, number, number]
  isActivated: boolean
  canActivate: boolean
  label: string
  mechanismType: 'pressure' | 'switch' | 'button'
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  const baseColor = canActivate ? (isActivated ? '#4caf50' : '#2196f3') : '#9e9e9e'
  const glowColor = hovered && canActivate && !isActivated ? '#64b5f6' : baseColor

  useFrame(() => {
    if (!groupRef.current) return
    const targetY = isActivated ? -0.15 : 0
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1)
  })

  const renderMechanism = () => {
    switch (mechanismType) {
      case 'pressure':
        return (
          <>
            <mesh position={[0, -0.1, 0]} receiveShadow>
              <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
              <meshStandardMaterial color={glowColor} />
            </mesh>
            {isActivated && (
              <mesh position={[0, 0.1, 0]}>
                <torusGeometry args={[0.6, 0.05, 8, 32]} />
                <meshStandardMaterial color="#76ff03" emissive="#76ff03" emissiveIntensity={0.5} />
              </mesh>
            )}
          </>
        )
      case 'switch':
        return (
          <>
            <mesh position={[0, -0.1, 0]} receiveShadow>
              <boxGeometry args={[1.2, 0.2, 0.4]} />
              <meshStandardMaterial color={glowColor} />
            </mesh>
            <mesh position={[isActivated ? 0.3 : -0.3, 0.1, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial color={isActivated ? '#4caf50' : '#f44336'} />
            </mesh>
          </>
        )
      case 'button':
        return (
          <>
            <mesh position={[0, -0.1, 0]} receiveShadow>
              <cylinderGeometry args={[0.5, 0.5, 0.3, 32]} />
              <meshStandardMaterial color="#424242" />
            </mesh>
            <mesh position={[0, isActivated ? 0.05 : 0.15, 0]}>
              <cylinderGeometry args={[0.35, 0.35, 0.2, 32]} />
              <meshStandardMaterial color={glowColor} />
            </mesh>
            {isActivated && <pointLight position={[0, 0.5, 0]} color="#4caf50" intensity={2} distance={3} />}
          </>
        )
    }
  }

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}>
      {renderMechanism()}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.3}
        color={canActivate ? '#fff' : '#999'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000">
        {label}
      </Text>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.2}
        color={isActivated ? '#4caf50' : canActivate ? '#ffeb3b' : '#f44336'}
        anchorX="center"
        anchorY="middle">
        {isActivated ? '已激活' : canActivate ? '可激活' : '未解锁'}
      </Text>
    </group>
  )
}

function Platform({
  position,
  size,
  color,
  isRaised,
}: {
  position: [number, number, number]
  size: [number, number, number]
  color: string
  isRaised: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return
    const targetY = isRaised ? position[1] + 2 : position[1]
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.05)
  })

  return (
    <mesh ref={meshRef} position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Gate({ position, isOpen, label }: { position: [number, number, number]; isOpen: boolean; label: string }) {
  const leftGateRef = useRef<THREE.Mesh>(null)
  const rightGateRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!leftGateRef.current || !rightGateRef.current) return
    const targetOffset = isOpen ? 1.5 : 0
    leftGateRef.current.position.x = THREE.MathUtils.lerp(
      leftGateRef.current.position.x,
      position[0] - targetOffset,
      0.05,
    )
    rightGateRef.current.position.x = THREE.MathUtils.lerp(
      rightGateRef.current.position.x,
      position[0] + targetOffset,
      0.05,
    )
  })

  return (
    <group position={position}>
      <mesh ref={leftGateRef} position={[0, 1, 0]} castShadow>
        <boxGeometry args={[1.5, 2, 0.2]} />
        <meshStandardMaterial color={isOpen ? '#4caf50' : '#f44336'} />
      </mesh>
      <mesh ref={rightGateRef} position={[0, 1, 0]} castShadow>
        <boxGeometry args={[1.5, 2, 0.2]} />
        <meshStandardMaterial color={isOpen ? '#4caf50' : '#f44336'} />
      </mesh>
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.25}
        color="#fff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000">
        {label}
      </Text>
    </group>
  )
}

function GoalArea({ isAccessible, isVictory }: { isAccessible: boolean; isVictory: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.5
    if (isAccessible) {
      ringRef.current.position.y = 0.1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <group position={[0, 0, 5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.8, 1.5, 32]} />
        <meshStandardMaterial
          color={isVictory ? '#4caf50' : isAccessible ? '#ffeb3b' : '#9e9e9e'}
          emissive={isAccessible ? '#ffeb3b' : '#000'}
          emissiveIntensity={isAccessible ? 0.5 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[1.2, 1.4, 32]} />
        <meshStandardMaterial
          color={isVictory ? '#4caf50' : isAccessible ? '#ff9800' : '#757575'}
          emissive={isAccessible ? '#ff9800' : '#000'}
          emissiveIntensity={isAccessible ? 0.8 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {isAccessible && <pointLight position={[0, 1, 0]} color="#ffeb3b" intensity={3} distance={5} />}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.35}
        color={isAccessible ? '#fff' : '#999'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000">
        {isVictory ? '通关成功!' : isAccessible ? '终点区域' : '需要激活全部机关'}
      </Text>
    </group>
  )
}

function Arena() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      <mesh position={[-ARENA_SIZE / 2, 1, 0]}>
        <boxGeometry args={[0.5, 2, ARENA_SIZE]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>
      <mesh position={[ARENA_SIZE / 2, 1, 0]}>
        <boxGeometry args={[0.5, 2, ARENA_SIZE]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>
      <mesh position={[0, 1, -ARENA_SIZE / 2]}>
        <boxGeometry args={[ARENA_SIZE, 2, 0.5]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>
      <mesh position={[0, 1, ARENA_SIZE / 2]}>
        <boxGeometry args={[ARENA_SIZE, 2, 0.5]} />
        <meshStandardMaterial color="#16213e" />
      </mesh>

      <mesh position={[-4, -0.4, -3]}>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      <mesh position={[0, -0.4, -3]}>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      <mesh position={[4, -0.4, -3]}>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
    </group>
  )
}

function Scene({
  puzzleState,
  playerPosition,
  onMechanismTrigger,
  onGoalEnter,
}: {
  puzzleState: PuzzleState
  playerPosition: PlayerPosition
  onMechanismTrigger: (id: number) => void
  onGoalEnter: () => void
}) {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 10, 25]} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#4fc3f7" />

      <Arena />

      <Player
        position={playerPosition}
        onMechanismTrigger={onMechanismTrigger}
        onGoalEnter={onGoalEnter}
        puzzleState={puzzleState}
      />

      <Mechanism
        id={1}
        position={[-4, 0, -3]}
        isActivated={puzzleState.mechanism1Activated}
        canActivate={true}
        label="机关 1: 压力板"
        mechanismType="pressure"
      />

      <Mechanism
        id={2}
        position={[0, 0, -3]}
        isActivated={puzzleState.mechanism2Activated}
        canActivate={puzzleState.mechanism1Activated && !puzzleState.hasFailed}
        label="机关 2: 开关"
        mechanismType="switch"
      />

      <Mechanism
        id={3}
        position={[4, 0, -3]}
        isActivated={puzzleState.mechanism3Activated}
        canActivate={puzzleState.mechanism2Activated && !puzzleState.hasFailed}
        label="机关 3: 按钮"
        mechanismType="button"
      />

      <Gate
        position={[-2, 0, 0]}
        isOpen={puzzleState.mechanism1Activated}
        label={puzzleState.mechanism1Activated ? '通道已开启' : '需要机关1'}
      />

      <Gate
        position={[2, 0, 0]}
        isOpen={puzzleState.mechanism2Activated}
        label={puzzleState.mechanism2Activated ? '通道已开启' : '需要机关2'}
      />

      <Platform
        position={[0, -0.3, 3]}
        size={[3, 0.5, 2]}
        color={puzzleState.mechanism3Activated ? '#4caf50' : '#f44336'}
        isRaised={puzzleState.mechanism3Activated}
      />

      <GoalArea isAccessible={puzzleState.completedMechanisms === 3} isVictory={puzzleState.isVictory} />

      <OrbitControls
        makeDefault
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        minDistance={8}
        maxDistance={20}
        target={[0, 0, 0]}
      />
    </>
  )
}

function StatusPanel({
  puzzleState,
  onReset,
  resetCountdown,
}: {
  puzzleState: PuzzleState
  onReset: () => void
  resetCountdown: number
}) {
  return (
    <div className="puzzle-status-panel">
      <div className="puzzle-header">
        <h2>三阶段机关解谜</h2>
        <p className="puzzle-subtitle">按正确顺序激活机关，到达终点</p>
      </div>

      <div className="puzzle-stats">
        <div className="stat-item">
          <div className="stat-label">已完成机关数量</div>
          <div className="stat-value">{puzzleState.completedMechanisms} / 3</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">是否触发错误流程</div>
          <div className={`stat-value ${puzzleState.hasFailed ? 'error' : 'normal'}`}>
            {puzzleState.hasFailed ? '是' : '否'}
          </div>
        </div>
      </div>

      <div className="puzzle-phase">
        <div className="phase-label">当前阶段</div>
        <div className={`phase-value ${puzzleState.hasFailed ? 'failed' : puzzleState.isVictory ? 'victory' : ''}`}>
          {puzzleState.isVictory
            ? '通关成功!'
            : puzzleState.hasFailed
            ? '挑战失败'
            : `第 ${puzzleState.currentPhase} 阶段`}
        </div>
      </div>

      <div className="puzzle-mechanisms">
        <div className="mechanism-header">机关状态</div>
        <div className="mechanism-list">
          <div className={`mechanism-item ${puzzleState.mechanism1Activated ? 'activated' : ''}`}>
            <span className="mechanism-icon">1</span>
            <span className="mechanism-name">压力板</span>
            <span className="mechanism-status">{puzzleState.mechanism1Activated ? '已激活' : '待激活'}</span>
          </div>
          <div className={`mechanism-item ${puzzleState.mechanism2Activated ? 'activated' : ''}`}>
            <span className="mechanism-icon">2</span>
            <span className="mechanism-name">开关</span>
            <span className="mechanism-status">{puzzleState.mechanism2Activated ? '已激活' : '待激活'}</span>
          </div>
          <div className={`mechanism-item ${puzzleState.mechanism3Activated ? 'activated' : ''}`}>
            <span className="mechanism-icon">3</span>
            <span className="mechanism-name">按钮</span>
            <span className="mechanism-status">{puzzleState.mechanism3Activated ? '已激活' : '待激活'}</span>
          </div>
        </div>
      </div>

      <div className="puzzle-progress">
        <div className="progress-label">完成进度</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(puzzleState.completedMechanisms / 3) * 100}%` }} />
        </div>
      </div>

      {puzzleState.hasFailed && (
        <div className="puzzle-failure">
          <div className="failure-icon">!</div>
          <div className="failure-content">
            <div className="failure-title">激活失败</div>
            <div className="failure-reason">{puzzleState.failureReason}</div>
            <div className="failure-countdown">{resetCountdown} 秒后自动重置...</div>
          </div>
        </div>
      )}

      {puzzleState.isVictory && (
        <div className="puzzle-victory">
          <div className="victory-icon">★</div>
          <div className="victory-content">
            <div className="victory-title">恭喜通关!</div>
            <div className="victory-message">你已成功完成所有机关挑战</div>
          </div>
        </div>
      )}

      <button className="puzzle-reset-btn" onClick={onReset}>
        重新开始
      </button>

      <div className="puzzle-hints">
        <div className="hint-title">操作提示</div>
        <ul className="hint-list">
          <li>使用 WASD 或方向键移动角色</li>
          <li>靠近机关自动触发激活</li>
          <li>必须按 1→2→3 顺序激活</li>
          <li>完成全部机关后进入终点</li>
        </ul>
      </div>
    </div>
  )
}

export default function App() {
  const [puzzleState, setPuzzleState] = useState<PuzzleState>(INITIAL_STATE)
  const [playerPosition, setPlayerPosition] = useState<PlayerPosition>({ x: 0, z: -5 })
  const [resetCountdown, setResetCountdown] = useState(0)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleReset = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    setPuzzleState(INITIAL_STATE)
    setPlayerPosition({ x: 0, z: -5 })
    setResetCountdown(0)
  }, [])

  const handleMechanismTrigger = useCallback((id: number) => {
    setPuzzleState((prev) => {
      if (prev.hasFailed || prev.isVictory) return prev

      if (id === 1 && !prev.mechanism1Activated) {
        return {
          ...prev,
          mechanism1Activated: true,
          completedMechanisms: prev.completedMechanisms + 1,
          currentPhase: 2,
        }
      }

      if (id === 2 && !prev.mechanism2Activated) {
        if (!prev.mechanism1Activated) {
          return {
            ...prev,
            hasFailed: true,
            failureReason: '必须先激活机关1（压力板）才能激活机关2！',
          }
        }
        return {
          ...prev,
          mechanism2Activated: true,
          completedMechanisms: prev.completedMechanisms + 1,
          currentPhase: 3,
        }
      }

      if (id === 3 && !prev.mechanism3Activated) {
        if (!prev.mechanism2Activated) {
          return {
            ...prev,
            hasFailed: true,
            failureReason: '必须先激活机关2（开关）才能激活机关3！',
          }
        }
        return {
          ...prev,
          mechanism3Activated: true,
          completedMechanisms: prev.completedMechanisms + 1,
          currentPhase: 4,
        }
      }

      return prev
    })
  }, [])

  const handleGoalEnter = useCallback(() => {
    setPuzzleState((prev) => {
      if (prev.completedMechanisms === 3 && !prev.isVictory) {
        return { ...prev, isVictory: true }
      }
      return prev
    })
  }, [])

  useEffect(() => {
    if (puzzleState.hasFailed && resetCountdown === 0) {
      setResetCountdown(3)
    }
  }, [puzzleState.hasFailed, resetCountdown])

  useEffect(() => {
    if (puzzleState.hasFailed && resetCountdown > 0) {
      resetTimerRef.current = setTimeout(() => {
        if (resetCountdown === 1) {
          handleReset()
        } else {
          setResetCountdown(resetCountdown - 1)
        }
      }, 1000)
    }
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [puzzleState.hasFailed, resetCountdown, handleReset])

  return (
    <div className="puzzle-container">
      <Canvas shadows camera={{ position: [0, 10, 12], fov: 50 }}>
        <Scene
          puzzleState={puzzleState}
          playerPosition={playerPosition}
          onMechanismTrigger={handleMechanismTrigger}
          onGoalEnter={handleGoalEnter}
        />
      </Canvas>
      <StatusPanel puzzleState={puzzleState} onReset={handleReset} resetCountdown={resetCountdown} />
    </div>
  )
}
