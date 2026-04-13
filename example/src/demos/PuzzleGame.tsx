import { Canvas, type ThreeElements, useFrame } from '@react-three/fiber'
import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'

// 游戏状态类型
type GamePhase = 'idle' | 'phase1' | 'phase2' | 'phase3' | 'completed' | 'failed'

interface GameState {
  phase: GamePhase
  completedPuzzles: number
  errorMessage: string | null
  isError: boolean
}

// 全局游戏状态（用于UI和3D场景通信）
let globalGameState: GameState = {
  phase: 'idle',
  completedPuzzles: 0,
  errorMessage: null,
  isError: false,
}

let setGlobalGameStateCallback: ((state: GameState) => void) | null = null

function updateGameState(newState: Partial<GameState>) {
  globalGameState = { ...globalGameState, ...newState }
  if (setGlobalGameStateCallback) {
    setGlobalGameStateCallback(globalGameState)
  }
}

function resetGame() {
  globalGameState = {
    phase: 'idle',
    completedPuzzles: 0,
    errorMessage: null,
    isError: false,
  }
  if (setGlobalGameStateCallback) {
    setGlobalGameStateCallback(globalGameState)
  }
}

// 可控制的角色组件
function Player({ position, onMove }: { position: THREE.Vector3; onMove: (pos: THREE.Vector3) => void }) {
  const ref = useRef<THREE.Mesh>(null!)
  const velocity = useRef(new THREE.Vector3())
  const keys = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase())
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useFrame((state, delta) => {
    const speed = 5
    const moveVec = new THREE.Vector3()

    if (keys.current.has('w') || keys.current.has('arrowup')) moveVec.z -= 1
    if (keys.current.has('s') || keys.current.has('arrowdown')) moveVec.z += 1
    if (keys.current.has('a') || keys.current.has('arrowleft')) moveVec.x -= 1
    if (keys.current.has('d') || keys.current.has('arrowright')) moveVec.x += 1

    if (moveVec.length() > 0) {
      moveVec.normalize().multiplyScalar(speed * delta)
      ref.current.position.add(moveVec)
      // 限制移动范围
      ref.current.position.x = Math.max(-8, Math.min(8, ref.current.position.x))
      ref.current.position.z = Math.max(-8, Math.min(8, ref.current.position.z))
      onMove(ref.current.position.clone())
    }

    // 角色动画
    ref.current.rotation.x += delta * 2
    ref.current.rotation.y += delta * 2
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="#4fc3f7" emissive="#0288d1" emissiveIntensity={0.3} />
    </mesh>
  )
}

// 机关1：压力板（触发平台升降）
function PressurePlate({
  position,
  isActive,
  onActivate,
  canActivate,
}: {
  position: [number, number, number]
  isActive: boolean
  onActivate: () => void
  canActivate: boolean
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const [isPressed, setIsPressed] = useState(false)

  useFrame(() => {
    if (isActive && !isPressed) {
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, position[1] - 0.1, 0.1)
      setIsPressed(true)
    } else if (!isActive && isPressed) {
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, position[1], 0.1)
      if (Math.abs(ref.current.position.y - position[1]) < 0.01) {
        setIsPressed(false)
      }
    }
  })

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={() => {
        if (canActivate && !isActive) {
          onActivate()
        }
      }}>
      <boxGeometry args={[1.5, 0.2, 1.5]} />
      <meshStandardMaterial
        color={isActive ? '#4caf50' : canActivate ? '#ff9800' : '#757575'}
        emissive={isActive ? '#2e7d32' : canActivate ? '#e65100' : '#000000'}
        emissiveIntensity={isActive ? 0.5 : canActivate ? 0.3 : 0}
      />
    </mesh>
  )
}

// 机关2：旋转开关（触发障碍开闭）
function RotarySwitch({
  position,
  isActive,
  onActivate,
  canActivate,
}: {
  position: [number, number, number]
  isActive: boolean
  onActivate: () => void
  canActivate: boolean
}) {
  const ref = useRef<THREE.Group>(null!)
  const handleRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (isActive) {
      handleRef.current.rotation.y += 0.05
    }
  })

  return (
    <group ref={ref} position={position}>
      {/* 底座 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.3, 32]} />
        <meshStandardMaterial
          color={isActive ? '#4caf50' : canActivate ? '#ff9800' : '#757575'}
          emissive={isActive ? '#2e7d32' : canActivate ? '#e65100' : '#000000'}
          emissiveIntensity={isActive ? 0.5 : canActivate ? 0.3 : 0}
        />
      </mesh>
      {/* 旋转把手 */}
      <mesh
        ref={handleRef}
        position={[0, 0.3, 0]}
        onClick={() => {
          if (canActivate && !isActive) {
            onActivate()
          }
        }}>
        <boxGeometry args={[0.2, 0.8, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* 顶部按钮 */}
      <mesh
        position={[0, 0.7, 0]}
        onClick={() => {
          if (canActivate && !isActive) {
            onActivate()
          }
        }}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? '#00ff00' : canActivate ? '#ffff00' : '#333333'}
          emissive={isActive ? '#00ff00' : canActivate ? '#ffff00' : '#000000'}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

// 机关3：能量水晶（材质变化和计数）
function EnergyCrystal({
  position,
  isActive,
  onActivate,
  canActivate,
}: {
  position: [number, number, number]
  isActive: boolean
  onActivate: () => void
  canActivate: boolean
}) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    ref.current.rotation.y += 0.02
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
  })

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={() => {
        if (canActivate && !isActive) {
          onActivate()
        }
      }}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color={isActive ? '#e040fb' : canActivate ? '#ff5722' : '#424242'}
        emissive={isActive ? '#aa00ff' : canActivate ? '#ff3d00' : '#000000'}
        emissiveIntensity={isActive ? 0.8 : canActivate ? 0.4 : 0}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

// 升降平台（机关1激活后升起）
function ElevatorPlatform({ isRaised }: { isRaised: boolean }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    const targetY = isRaised ? 1 : -2
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, 0.05)
  })

  return (
    <mesh ref={ref} position={[-3, -2, -3]}>
      <boxGeometry args={[2, 0.5, 2]} />
      <meshStandardMaterial color="#8d6e63" />
    </mesh>
  )
}

// 移动障碍（机关2激活后打开通道）
function MovingBarrier({ isOpen }: { isOpen: boolean }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    const targetX = isOpen ? 5 : 2
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, targetX, 0.03)
  })

  return (
    <mesh ref={ref} position={[2, 1, 0]}>
      <boxGeometry args={[0.5, 3, 4]} />
      <meshStandardMaterial color="#d32f2f" transparent opacity={0.8} />
    </mesh>
  )
}

// 能量门（机关3激活后消失）
function EnergyGate({ isDisabled }: { isDisabled: boolean }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    const targetScale = isDisabled ? 0 : 1
    ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, targetScale, 0.05))
  })

  return (
    <mesh ref={ref} position={[0, 1.5, 5]}>
      <boxGeometry args={[4, 3, 0.2]} />
      <meshStandardMaterial color="#ff1744" emissive="#d50000" emissiveIntensity={0.5} transparent opacity={0.6} />
    </mesh>
  )
}

// 终点区域
function GoalZone({ onReach }: { onReach: () => void }) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    ref.current.rotation.y += 0.01
    const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
    ref.current.scale.setScalar(scale)
  })

  return (
    <group position={[0, 0.5, 7]}>
      <mesh ref={ref} onClick={onReach}>
        <torusGeometry args={[1, 0.2, 16, 100]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffab00" emissiveIntensity={0.5} />
      </mesh>
      {/* 终点标记柱 */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
        <meshStandardMaterial color="#4caf50" />
      </mesh>
    </group>
  )
}

// 地面网格
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#263238" />
      </mesh>
      {/* 网格线 */}
      <gridHelper args={[20, 20, '#455a64', '#37474f']} position={[0, -0.49, 0]} />
    </>
  )
}

// 提示标记
function HintMarker({
  position,
  text,
  visible,
}: {
  position: [number, number, number]
  text: string
  visible: boolean
}) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (visible) {
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2
    }
  })

  if (!visible) return null

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#ffff00" emissive="#ffea00" emissiveIntensity={0.8} />
    </mesh>
  )
}

// 主游戏场景
function GameScene() {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 0, -6))
  const [puzzle1Active, setPuzzle1Active] = useState(false)
  const [puzzle2Active, setPuzzle2Active] = useState(false)
  const [puzzle3Active, setPuzzle3Active] = useState(false)

  // 检查错误操作
  const checkError = useCallback(
    (puzzleNumber: number): boolean => {
      const currentPhase = globalGameState.phase

      // 错误情况：
      // 1. 在idle阶段尝试激活非机关1
      // 2. 在phase1阶段尝试激活非机关2
      // 3. 在phase2阶段尝试激活非机关3
      // 4. 重复激活已完成的机关

      if (puzzleNumber === 1 && currentPhase !== 'idle') {
        if (puzzle1Active) return false // 已激活不算错误
        updateGameState({
          phase: 'failed',
          errorMessage: '错误！机关1已经激活过了，不能重复操作',
          isError: true,
        })
        return true
      }

      if (puzzleNumber === 2 && currentPhase !== 'phase1') {
        if (puzzle2Active) return false // 已激活不算错误
        updateGameState({
          phase: 'failed',
          errorMessage: '错误！必须先激活机关1（压力板）才能操作机关2',
          isError: true,
        })
        return true
      }

      if (puzzleNumber === 3 && currentPhase !== 'phase2') {
        if (puzzle3Active) return false // 已激活不算错误
        updateGameState({
          phase: 'failed',
          errorMessage: '错误！必须先激活机关2（旋转开关）才能操作机关3',
          isError: true,
        })
        return true
      }

      return false
    },
    [puzzle1Active, puzzle2Active, puzzle3Active],
  )

  // 激活机关1
  const activatePuzzle1 = useCallback(() => {
    if (checkError(1)) return
    setPuzzle1Active(true)
    updateGameState({
      phase: 'phase1',
      completedPuzzles: 1,
      errorMessage: null,
      isError: false,
    })
  }, [checkError])

  // 激活机关2
  const activatePuzzle2 = useCallback(() => {
    if (checkError(2)) return
    setPuzzle2Active(true)
    updateGameState({
      phase: 'phase2',
      completedPuzzles: 2,
      errorMessage: null,
      isError: false,
    })
  }, [checkError])

  // 激活机关3
  const activatePuzzle3 = useCallback(() => {
    if (checkError(3)) return
    setPuzzle3Active(true)
    updateGameState({
      phase: 'phase3',
      completedPuzzles: 3,
      errorMessage: null,
      isError: false,
    })
  }, [checkError])

  // 检查是否到达终点
  const checkGoal = useCallback(() => {
    if (globalGameState.phase === 'phase3') {
      updateGameState({
        phase: 'completed',
        errorMessage: null,
        isError: false,
      })
    } else {
      updateGameState({
        phase: 'failed',
        errorMessage: '错误！必须先完成所有三个机关才能进入终点',
        isError: true,
      })
    }
  }, [])

  // 监听重置
  useEffect(() => {
    const checkReset = setInterval(() => {
      if (globalGameState.phase === 'failed') {
        // 重置所有状态
        setPuzzle1Active(false)
        setPuzzle2Active(false)
        setPuzzle3Active(false)
        setPlayerPos(new THREE.Vector3(0, 0, -6))
        // 延迟重置游戏状态，让用户看到错误信息
        setTimeout(() => {
          resetGame()
        }, 2000)
      }
    }, 100)

    return () => clearInterval(checkReset)
  }, [])

  return (
    <>
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#4fc3f7" />

      <Ground />

      {/* 玩家角色 */}
      <Player position={playerPos} onMove={setPlayerPos} />

      {/* 机关1：压力板 - 触发平台升降 */}
      <group>
        <PressurePlate
          position={[-3, 0.1, -3]}
          isActive={puzzle1Active}
          onActivate={activatePuzzle1}
          canActivate={globalGameState.phase === 'idle'}
        />
        <HintMarker position={[-3, 1.5, -3]} text="1" visible={globalGameState.phase === 'idle'} />
      </group>

      {/* 机关2：旋转开关 - 触发障碍开闭 */}
      <group>
        <RotarySwitch
          position={[3, 0.15, 0]}
          isActive={puzzle2Active}
          onActivate={activatePuzzle2}
          canActivate={globalGameState.phase === 'phase1'}
        />
        <HintMarker position={[3, 2, 0]} text="2" visible={globalGameState.phase === 'phase1'} />
      </group>

      {/* 机关3：能量水晶 - 材质变化和计数 */}
      <group>
        <EnergyCrystal
          position={[-3, 1, 3]}
          isActive={puzzle3Active}
          onActivate={activatePuzzle3}
          canActivate={globalGameState.phase === 'phase2'}
        />
        <HintMarker position={[-3, 2.5, 3]} text="3" visible={globalGameState.phase === 'phase2'} />
      </group>

      {/* 联动效果 */}
      <ElevatorPlatform isRaised={puzzle1Active} />
      <MovingBarrier isOpen={puzzle2Active} />
      <EnergyGate isDisabled={puzzle3Active} />

      {/* 终点区域 */}
      <GoalZone onReach={checkGoal} />

      {/* 装饰性元素 */}
      <mesh position={[5, 0.5, 5]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color="#5c6bc0" />
      </mesh>
      <mesh position={[-5, 0.5, -5]}>
        <boxGeometry args={[0.5, 1, 0.5]} />
        <meshStandardMaterial color="#5c6bc0" />
      </mesh>
    </>
  )
}

// UI状态面板组件
function GameStatusPanel() {
  const [gameState, setGameState] = useState<GameState>(globalGameState)

  useEffect(() => {
    setGlobalGameStateCallback = setGameState
    return () => {
      setGlobalGameStateCallback = null
    }
  }, [])

  const getPhaseText = (phase: GamePhase) => {
    switch (phase) {
      case 'idle':
        return '准备阶段 - 激活机关1开始'
      case 'phase1':
        return '第一阶段 - 已激活机关1'
      case 'phase2':
        return '第二阶段 - 已激活机关2'
      case 'phase3':
        return '第三阶段 - 已激活机关3，前往终点'
      case 'completed':
        return '恭喜通关！'
      case 'failed':
        return '挑战失败'
      default:
        return '未知状态'
    }
  }

  const getPhaseColor = (phase: GamePhase) => {
    switch (phase) {
      case 'completed':
        return '#4caf50'
      case 'failed':
        return '#f44336'
      default:
        return '#2196f3'
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '20px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        minWidth: '300px',
        border: `2px solid ${getPhaseColor(gameState.phase)}`,
        boxShadow: `0 0 20px ${getPhaseColor(gameState.phase)}40`,
      }}>
      <h3 style={{ margin: '0 0 15px 0', color: getPhaseColor(gameState.phase) }}>🎮 机关解谜挑战</h3>

      <div style={{ marginBottom: '10px' }}>
        <span style={{ color: '#aaa' }}>当前阶段: </span>
        <span style={{ color: getPhaseColor(gameState.phase), fontWeight: 'bold' }}>
          {getPhaseText(gameState.phase)}
        </span>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <span style={{ color: '#aaa' }}>已完成机关: </span>
        <span style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{gameState.completedPuzzles} / 3</span>
      </div>

      {gameState.isError && gameState.errorMessage && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(244, 67, 54, 0.2)',
            borderRadius: '5px',
            border: '1px solid #f44336',
            color: '#ff8a80',
            animation: 'pulse 0.5s ease-in-out',
          }}>
          <strong>⚠️ 错误:</strong> {gameState.errorMessage}
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#aaa' }}>2秒后自动重置...</div>
        </div>
      )}

      {gameState.phase === 'completed' && (
        <div
          style={{
            marginTop: '15px',
            padding: '10px',
            background: 'rgba(76, 175, 80, 0.2)',
            borderRadius: '5px',
            border: '1px solid #4caf50',
            color: '#81c784',
          }}>
          <strong>🎉 恭喜!</strong> 你成功完成了所有机关挑战！
          <div style={{ marginTop: '5px', fontSize: '12px', color: '#aaa' }}>刷新页面重新开始</div>
        </div>
      )}

      <div
        style={{
          marginTop: '15px',
          padding: '10px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#aaa',
        }}>
        <strong>操作说明:</strong>
        <div style={{ marginTop: '5px' }}>• WASD / 方向键: 移动角色</div>
        <div>• 点击机关: 激活（按正确顺序）</div>
        <div>• 金色光环: 终点区域</div>
        <div>• 黄色标记: 当前可交互机关</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

// 主应用组件
export default function PuzzleGame() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas camera={{ position: [0, 10, 10], fov: 60 }}>
        <GameScene />
      </Canvas>
      <GameStatusPanel />
    </div>
  )
}
