import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

type GameState = {
  currentStage: number
  completedPuzzles: number
  hasError: boolean
  errorMessage: string
  isWin: boolean
  activatedPuzzles: string[]
}

type PuzzleMechanism = {
  id: string
  name: string
  stage: number
  position: [number, number, number]
  activated: boolean
  color: string
}

function Player({
  position,
  setPosition,
}: {
  position: [number, number, number]
  setPosition: (pos: [number, number, number]) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const speed = 0.15

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame(() => {
    let dx = 0
    let dz = 0

    if (keys.current.w) dz -= speed
    if (keys.current.s) dz += speed
    if (keys.current.a) dx -= speed
    if (keys.current.d) dx += speed

    if (dx !== 0 || dz !== 0) {
      setPosition([
        Math.max(-8, Math.min(8, position[0] + dx)),
        position[1],
        Math.max(-8, Math.min(8, position[2] + dz)),
      ])
    }

    if (meshRef.current) {
      meshRef.current.position.set(...position)
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
      <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={0.3} />
    </mesh>
  )
}

function MechanismButton({
  mechanism,
  playerPos,
  currentStage,
  onActivate,
  onError,
}: {
  mechanism: PuzzleMechanism
  playerPos: [number, number, number]
  currentStage: number
  onActivate: (id: string) => void
  onError: (msg: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  const distance = Math.sqrt(
    Math.pow(playerPos[0] - mechanism.position[0], 2) + Math.pow(playerPos[2] - mechanism.position[2], 2),
  )
  const isNear = distance < 1.5
  const canActivate = isNear && currentStage === mechanism.stage && !mechanism.activated

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = mechanism.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05
    }
  })

  const handleClick = () => {
    if (!isNear) {
      onError('距离太远，请靠近机关后再触发！')
      return
    }

    if (mechanism.stage > currentStage) {
      onError(`需要先完成前面 ${mechanism.stage - currentStage} 个机关才能激活 ${mechanism.name}！`)
      return
    }

    if (mechanism.activated) {
      return
    }

    if (currentStage !== mechanism.stage) {
      onError(`机关顺序错误！请按正确顺序触发机关。当前应该完成阶段 ${currentStage} 的机关！`)
      return
    }

    onActivate(mechanism.id)
  }

  const displayColor = mechanism.activated ? '#4caf50' : canActivate ? mechanism.color : '#666666'

  return (
    <group ref={groupRef} position={mechanism.position}>
      <mesh
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 32]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={canActivate ? displayColor : '#000000'}
          emissiveIntensity={canActivate ? 0.5 : 0}
        />
      </mesh>

      {mechanism.activated && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}

      {hovered && canActivate && (
        <mesh position={[0, 0.65, 0]} scale={1.2}>
          <cylinderGeometry args={[0.45, 0.55, 0.35, 32]} />
          <meshBasicMaterial color="white" transparent opacity={0.2} />
        </mesh>
      )}

      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.2, 32]} />
        <meshStandardMaterial color="#444444" />
      </mesh>
    </group>
  )
}

function LiftPlatform({ active, position }: { active: boolean; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const targetY = active ? position[1] + 3 : position[1]

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.05
    }
  })

  return (
    <mesh ref={meshRef} position={position} receiveShadow>
      <boxGeometry args={[2.5, 0.3, 2.5]} />
      <meshStandardMaterial color={active ? '#4caf50' : '#ff9800'} metalness={0.5} roughness={0.3} />
    </mesh>
  )
}

function Gate({ open, position }: { open: boolean; position: [number, number, number] }) {
  const leftRef = useRef<THREE.Mesh>(null!)
  const rightRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (leftRef.current && rightRef.current) {
      const targetX = open ? 1.8 : 0.5
      leftRef.current.position.x += (-targetX - leftRef.current.position.x) * 0.05
      rightRef.current.position.x += (targetX - rightRef.current.position.x) * 0.05
    }
  })

  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[4.5, 0.3, 0.5]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh ref={leftRef} position={[-0.5, 0, 0]}>
        <boxGeometry args={[0.4, 3, 0.3]} />
        <meshStandardMaterial color={open ? '#81c784' : '#e57373'} metalness={0.7} />
      </mesh>
      <mesh ref={rightRef} position={[0.5, 0, 0]}>
        <boxGeometry args={[0.4, 3, 0.3]} />
        <meshStandardMaterial color={open ? '#81c784' : '#e57373'} metalness={0.7} />
      </mesh>
    </group>
  )
}

function FinishZone({
  position,
  playerPos,
  isUnlocked,
  onWin,
}: {
  position: [number, number, number]
  playerPos: [number, number, number]
  isUnlocked: boolean
  onWin: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const hasTriggered = useRef(false)

  const distance = Math.sqrt(Math.pow(playerPos[0] - position[0], 2) + Math.pow(playerPos[2] - position[2], 2))

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime
      const pulseScale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
      meshRef.current.scale.setScalar(isUnlocked ? pulseScale : 0.5)
    }
  })

  useEffect(() => {
    if (isUnlocked && distance < 1.2 && !hasTriggered.current) {
      hasTriggered.current = true
      onWin()
    }
  }, [distance, isUnlocked, onWin])

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial
          color={isUnlocked ? '#4caf50' : '#9e9e9e'}
          emissive={isUnlocked ? '#4caf50' : '#000000'}
          emissiveIntensity={isUnlocked ? 0.3 : 0}
        />
      </mesh>

      <mesh ref={meshRef} position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial
          color={isUnlocked ? '#ffd700' : '#666666'}
          emissive={isUnlocked ? '#ffd700' : '#000000'}
          emissiveIntensity={isUnlocked ? 0.8 : 0}
        />
      </mesh>
    </group>
  )
}

function StatusPanel({ gameState, onReset }: { gameState: GameState; onReset: () => void }) {
  return (
    <div className="puzzle-status-panel">
      <h3 className="panel-title">🎯 三阶段机关解谜</h3>

      <div className="status-section">
        <div className="status-item">
          <span className="status-label">当前阶段</span>
          <span className="status-value stage">{gameState.currentStage} / 3</span>
        </div>
        <div className="status-item">
          <span className="status-label">已完成机关</span>
          <span className="status-value success">{gameState.completedPuzzles} / 3</span>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(gameState.completedPuzzles / 3) * 100}%` }} />
      </div>

      {gameState.hasError && (
        <div className="error-message">
          <span>❌ {gameState.errorMessage}</span>
        </div>
      )}

      {gameState.isWin && (
        <div className="win-message">
          <span>🎉 恭喜通关！你成功解开了所有机关！</span>
        </div>
      )}

      <button className="reset-btn" onClick={onReset}>
        🔄 重新开始
      </button>

      <div className="control-hints">
        <p className="hint-title">操作说明：</p>
        <p>• WASD - 移动角色</p>
        <p>• 鼠标左键 - 点击机关按钮</p>
        <p>• 需要靠近机关才能触发</p>
        <p>• 按正确顺序完成三个阶段</p>
      </div>
    </div>
  )
}

function Scene({
  gameState,
  playerPos,
  setPlayerPos,
  mechanisms,
  onActivateMechanism,
  onError,
  onWin,
}: {
  gameState: GameState
  playerPos: [number, number, number]
  setPlayerPos: (pos: [number, number, number]) => void
  mechanisms: PuzzleMechanism[]
  onActivateMechanism: (id: string) => void
  onError: (msg: string) => void
  onWin: () => void
}) {
  const allCompleted = gameState.completedPuzzles === 3

  return (
    <>
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.4} />
      <pointLight decay={0} position={[10, 15, 10]} intensity={1} />
      <pointLight decay={0} position={[-10, 10, -10]} color="#4ecdc4" intensity={0.5} />

      <Player position={playerPos} setPosition={setPlayerPos} />

      {mechanisms.map((mech) => (
        <MechanismButton
          key={mech.id}
          mechanism={mech}
          playerPos={playerPos}
          currentStage={gameState.currentStage}
          onActivate={onActivateMechanism}
          onError={onError}
        />
      ))}

      <LiftPlatform active={mechanisms[0]?.activated || false} position={[-5, 0, -3]} />

      <Gate open={mechanisms[1]?.activated || false} position={[0, 0, -5]} />

      <FinishZone position={[5, 0, 5]} playerPos={playerPos} isUnlocked={allCompleted} onWin={onWin} />

      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[1, 0.1, 16, 48]} />
        <meshStandardMaterial
          color={mechanisms[2]?.activated ? '#4caf50' : '#ff9800'}
          emissive={mechanisms[2]?.activated ? '#4caf50' : '#ff9800'}
          emissiveIntensity={0.3}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2d3436" />
      </mesh>

      <gridHelper args={[20, 20, '#444444', '#333333']} position={[0, -0.49, 0]} />

      <OrbitControls makeDefault minDistance={5} maxDistance={25} />
    </>
  )
}

export default function App() {
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([-6, 0.5, 6])

  const [mechanisms, setMechanisms] = useState<PuzzleMechanism[]>([
    { id: 'puzzle1', name: '升降平台开关', stage: 1, position: [-5, 0, 0], activated: false, color: '#ff6b6b' },
    { id: 'puzzle2', name: '大门开关', stage: 2, position: [0, 0, -2], activated: false, color: '#4ecdc4' },
    { id: 'puzzle3', name: '能量环开关', stage: 3, position: [5, 0, 0], activated: false, color: '#45b7d1' },
  ])

  const [gameState, setGameState] = useState<GameState>({
    currentStage: 1,
    completedPuzzles: 0,
    hasError: false,
    errorMessage: '',
    isWin: false,
    activatedPuzzles: [],
  })

  const handleActivateMechanism = useCallback((id: string) => {
    setMechanisms((prev) => prev.map((m) => (m.id === id ? { ...m, activated: true } : m)))

    setGameState((prev) => ({
      ...prev,
      currentStage: prev.currentStage + 1,
      completedPuzzles: prev.completedPuzzles + 1,
      activatedPuzzles: [...prev.activatedPuzzles, id],
      hasError: false,
      errorMessage: '',
    }))
  }, [])

  const handleReset = useCallback(() => {
    setPlayerPos([-6, 0.5, 6])
    setMechanisms((prev) => prev.map((m) => ({ ...m, activated: false })))
    setGameState({
      currentStage: 1,
      completedPuzzles: 0,
      hasError: false,
      errorMessage: '',
      isWin: false,
      activatedPuzzles: [],
    })
  }, [])

  const handleError = useCallback(
    (message: string) => {
      setGameState((prev) => ({
        ...prev,
        hasError: true,
        errorMessage: message,
      }))

      setTimeout(() => {
        handleReset()
      }, 2500)
    },
    [handleReset],
  )

  const handleWin = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      isWin: true,
    }))
  }, [])

  return (
    <div className="puzzle-game-container">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 12, 15], fov: 50 }} className="puzzle-canvas">
        <Scene
          gameState={gameState}
          playerPos={playerPos}
          setPlayerPos={setPlayerPos}
          mechanisms={mechanisms}
          onActivateMechanism={handleActivateMechanism}
          onError={handleError}
          onWin={handleWin}
        />
      </Canvas>
      <StatusPanel gameState={gameState} onReset={handleReset} />
    </div>
  )
}
