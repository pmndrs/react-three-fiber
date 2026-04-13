import { Canvas, type ThreeElements, useFrame } from '@react-three/fiber'
import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import * as THREE from 'three'

// ============================================
// 原有 ClickAndHover 核心交互能力
// ============================================

const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: 'red' }))
const group = new THREE.Group()
group.add(mesh)

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  useFrame((state) => {
    ref.current.position.y = Math.sin(state.clock.elapsedTime) / 3
  })

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => setHovered(true)}
      onPointerOut={(e) => setHovered(false)}
      onClick={() => setClicked(!clicked)}
      scale={clicked ? [1.5, 1.5, 1.5] : [1, 1, 1]}
      {...props}>
      <boxGeometry />
      <meshBasicMaterial color={hovered ? 'hotpink' : 'aquamarine'} />
    </mesh>
  )
}

function Box2(props: ThreeElements['group']) {
  return <primitive object={group} {...props} onClick={() => console.log('hi')} />
}

// ============================================
// 新增能量调度功能
// ============================================

// 能量节点配置
const NODE_CONFIG = {
  ALPHA: {
    name: 'Alpha',
    baseOutput: 25,
    fluctuationRange: 10,
    color: '#4ade80',
    position: [-4, 2, 0] as [number, number, number],
  },
  BETA: {
    name: 'Beta',
    baseOutput: 30,
    fluctuationRange: 15,
    color: '#60a5fa',
    position: [0, 3, 0] as [number, number, number],
  },
  GAMMA: {
    name: 'Gamma',
    baseOutput: 20,
    fluctuationRange: 8,
    color: '#f472b6',
    position: [4, 2, 0] as [number, number, number],
  },
}

// 档位配置
const OUTPUT_LEVELS = [
  { label: '低', multiplier: 0.5, color: '#94a3b8' },
  { label: '中', multiplier: 1.0, color: '#fbbf24' },
  { label: '高', multiplier: 1.5, color: '#f97316' },
]

// 系统阈值
const SYSTEM_THRESHOLDS = {
  SAFE_MIN: 60,
  SAFE_MAX: 100,
  OVERLOAD_THRESHOLD: 120,
  SUCCESS_DURATION: 5000,
  OVERLOAD_DURATION: 3000,
}

// 能量节点状态类型
type NodeStatus = 'connected' | 'disconnected' | 'buffering'

interface EnergyNodeState {
  id: string
  currentOutput: number
  levelIndex: number
  status: NodeStatus
  isPeakLimited: boolean
  bufferTimeRemaining: number
}

interface SystemState {
  totalLoad: number
  stableNodes: number
  isOverloaded: boolean
  bufferTimeRemaining: number
  gameResult: 'running' | 'success' | 'failure'
  failureReason: string
}

// 3D 文本标签组件 - 使用 sprite 替代 HTML
function TextSprite({
  text,
  position,
  color = 'white',
  size = 1,
}: {
  text: string
  position: [number, number, number]
  color?: string
  size?: number
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.fillRect(0, 0, 256, 64)
    ctx.font = 'bold 24px system-ui'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 128, 32)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [text, color])

  return (
    <sprite position={position} scale={[size * 2, size * 0.5, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  )
}

// 能量节点组件
function EnergyNode({
  config,
  state,
  onLevelChange,
  onToggleConnection,
  onToggleBuffer,
  onTogglePeakLimit,
}: {
  config: (typeof NODE_CONFIG)['ALPHA']
  state: EnergyNodeState
  onLevelChange: () => void
  onToggleConnection: () => void
  onToggleBuffer: () => void
  onTogglePeakLimit: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  const level = OUTPUT_LEVELS[state.levelIndex]
  const isDisconnected = state.status === 'disconnected'
  const isBuffering = state.status === 'buffering'

  useFrame((frameState) => {
    if (meshRef.current) {
      const time = frameState.clock.elapsedTime
      const speed = isDisconnected ? 0.2 : 0.5 + (state.currentOutput / 100) * 2
      meshRef.current.rotation.y += speed * 0.02
      meshRef.current.rotation.z = Math.sin(time * 2) * 0.1

      if (isBuffering) {
        const scale = 1 + Math.sin(time * 4) * 0.1
        meshRef.current.scale.setScalar(scale)
      } else {
        const targetScale = hovered ? 1.2 : 1
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
      }
    }

    if (ringRef.current) {
      ringRef.current.rotation.z -= 0.03
    }
  })

  const getNodeColor = () => {
    if (isDisconnected) return '#64748b'
    if (isBuffering) return '#a855f7'
    if (state.isPeakLimited) return '#ef4444'
    return level.color
  }

  const nodeColor = getNodeColor()
  const statusText = isDisconnected ? '已断开' : isBuffering ? '缓冲中' : state.isPeakLimited ? '限峰中' : level.label

  return (
    <group position={config.position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.05, 8, 32]} />
        <meshBasicMaterial
          color={isDisconnected ? '#475569' : config.color}
          transparent
          opacity={isDisconnected ? 0.3 : 0.8}
        />
      </mesh>

      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onToggleConnection}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isDisconnected ? 0.1 : 0.3}
          transparent
          opacity={isDisconnected ? 0.5 : 0.9}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={isDisconnected ? 0 : 0.8}
        />
      </mesh>

      <group position={[0, -1.8, 0]}>
        {OUTPUT_LEVELS.map((lvl, idx) => (
          <mesh
            key={idx}
            position={[(idx - 1) * 0.5, 0, 0]}
            onClick={(e) => {
              e.stopPropagation()
              onLevelChange()
            }}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial
              color={idx === state.levelIndex ? lvl.color : '#334155'}
              transparent
              opacity={idx === state.levelIndex ? 1 : 0.4}
            />
          </mesh>
        ))}
      </group>

      <group position={[1.5, 0, 0]}>
        <mesh
          position={[0, 0.5, 0]}
          onClick={(e) => {
            e.stopPropagation()
            onToggleBuffer()
          }}>
          <boxGeometry args={[0.4, 0.4, 0.1]} />
          <meshStandardMaterial
            color={isBuffering ? '#a855f7' : '#475569'}
            emissive={isBuffering ? '#a855f7' : '#000000'}
            emissiveIntensity={isBuffering ? 0.5 : 0}
          />
        </mesh>

        <mesh
          position={[0, -0.5, 0]}
          onClick={(e) => {
            e.stopPropagation()
            onTogglePeakLimit()
          }}>
          <boxGeometry args={[0.4, 0.4, 0.1]} />
          <meshStandardMaterial
            color={state.isPeakLimited ? '#ef4444' : '#475569'}
            emissive={state.isPeakLimited ? '#ef4444' : '#000000'}
            emissiveIntensity={state.isPeakLimited ? 0.5 : 0}
          />
        </mesh>
      </group>

      <TextSprite
        text={`${config.name}: ${Math.round(state.currentOutput)}`}
        position={[0, 2.2, 0]}
        color={isDisconnected ? '#94a3b8' : config.color}
        size={1.5}
      />

      <TextSprite text={statusText} position={[0, -2.5, 0]} color="#cbd5e1" size={1} />
    </group>
  )
}

// 总控核心组件
function ControlCore({
  totalLoad,
  isOverloaded,
  gameResult,
}: {
  totalLoad: number
  isOverloaded: boolean
  gameResult: SystemState['gameResult']
}) {
  const coreRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const ringsRef = useRef<THREE.Group>(null!)

  useFrame((frameState) => {
    const time = frameState.clock.elapsedTime

    if (coreRef.current) {
      const loadFactor = Math.min(totalLoad / 100, 2)
      coreRef.current.rotation.y += 0.01 * (1 + loadFactor)
      coreRef.current.rotation.x = Math.sin(time * 0.5) * 0.2
    }

    if (innerRef.current) {
      innerRef.current.rotation.y -= 0.03
      innerRef.current.rotation.z = Math.cos(time * 0.7) * 0.3
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.x = Math.sin(time * 0.3) * 0.2
      ringsRef.current.rotation.y += 0.005 * (1 + totalLoad / 100)
    }
  })

  const getCoreColor = () => {
    if (gameResult === 'success') return '#22c55e'
    if (gameResult === 'failure') return '#dc2626'
    if (isOverloaded) return '#ef4444'
    if (totalLoad < SYSTEM_THRESHOLDS.SAFE_MIN) return '#3b82f6'
    return '#22c55e'
  }

  const coreColor = getCoreColor()
  const intensity = isOverloaded ? 1.5 : 0.5 + totalLoad / 200

  return (
    <group position={[0, -1.5, 0]}>
      <group ref={ringsRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.08, 16, 64]} />
          <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={intensity * 0.5} />
        </mesh>
        <mesh rotation={[0, Math.PI / 3, 0]}>
          <torusGeometry args={[2.3, 0.06, 16, 64]} />
          <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={intensity * 0.3} />
        </mesh>
      </group>

      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.2, 1]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={intensity}
          wireframe
          transparent
          opacity={0.8}
        />
      </mesh>

      <mesh ref={innerRef}>
        <dodecahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={intensity * 1.5} />
      </mesh>

      {isOverloaded && (
        <mesh>
          <sphereGeometry args={[3, 32, 32]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.1} />
        </mesh>
      )}

      <TextSprite text={`${Math.round(totalLoad)}%`} position={[0, 3.8, 0]} color={coreColor} size={2} />
    </group>
  )
}

// 连接线组件
function ConnectionLines({ nodes }: { nodes: EnergyNodeState[] }) {
  const materialsRef = useRef<THREE.LineBasicMaterial[]>([])

  const nodePositions = useMemo(
    () => [NODE_CONFIG.ALPHA.position, NODE_CONFIG.BETA.position, NODE_CONFIG.GAMMA.position],
    [],
  )
  const corePosition: [number, number, number] = [0, -1.5, 0]

  const lines = useMemo(() => {
    return nodePositions.map((pos, idx) => {
      const configKey = Object.keys(NODE_CONFIG)[idx] as keyof typeof NODE_CONFIG
      const points = [new THREE.Vector3(...pos), new THREE.Vector3(...corePosition)]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: NODE_CONFIG[configKey].color,
        transparent: true,
        opacity: 0.5,
      })
      materialsRef.current[idx] = material
      return new THREE.Line(geometry, material)
    })
  }, [nodePositions])

  useFrame((frameState) => {
    const time = frameState.clock.elapsedTime
    materialsRef.current.forEach((material, idx) => {
      if (material) {
        const node = nodes[idx]
        const isDisconnected = node.status === 'disconnected'
        material.opacity = isDisconnected ? 0.1 : 0.4 + Math.sin(time * 3 + idx) * 0.2
      }
    })
  })

  return (
    <group>
      {lines.map((line, idx) => (
        <primitive key={idx} object={line} />
      ))}
    </group>
  )
}

// 系统监控面板组件 - 放在 Canvas 外
function SystemMonitor({ systemState, onReset }: { systemState: SystemState; onReset: () => void }) {
  const { totalLoad, stableNodes, isOverloaded, bufferTimeRemaining, gameResult, failureReason } = systemState

  const getStatusColor = () => {
    if (gameResult === 'success') return '#22c55e'
    if (gameResult === 'failure') return '#dc2626'
    if (isOverloaded) return '#ef4444'
    if (totalLoad >= SYSTEM_THRESHOLDS.SAFE_MIN && totalLoad <= SYSTEM_THRESHOLDS.SAFE_MAX) return '#22c55e'
    return '#fbbf24'
  }

  const getStatusText = () => {
    if (gameResult === 'success') return '运行成功'
    if (gameResult === 'failure') return '运行失败'
    if (isOverloaded) return '系统过载'
    if (totalLoad < SYSTEM_THRESHOLDS.SAFE_MIN) return '负载不足'
    if (totalLoad > SYSTEM_THRESHOLDS.SAFE_MAX) return '负载偏高'
    return '运行稳定'
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: 280,
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(71, 85, 105, 0.5)',
        borderRadius: 12,
        padding: 20,
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 100,
      }}>
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#f8fafc',
          borderBottom: '1px solid rgba(71, 85, 105, 0.5)',
          paddingBottom: 12,
        }}>
        系统监控面板
      </h3>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          padding: '8px 12px',
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: 8,
          border: `2px solid ${getStatusColor()}`,
        }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: getStatusColor(),
            boxShadow: `0 0 10px ${getStatusColor()}`,
            animation: gameResult === 'running' && isOverloaded ? 'pulse 0.5s infinite' : 'none',
          }}
        />
        <span style={{ fontWeight: 600, color: getStatusColor() }}>{getStatusText()}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MonitorItem label="总负载" value={`${Math.round(totalLoad)}%`} color={getStatusColor()} />
        <MonitorItem label="稳定节点" value={`${stableNodes}/3`} color={stableNodes === 3 ? '#22c55e' : '#fbbf24'} />
        <MonitorItem
          label="安全区间"
          value={`${SYSTEM_THRESHOLDS.SAFE_MIN}-${SYSTEM_THRESHOLDS.SAFE_MAX}%`}
          color="#64748b"
        />
        {bufferTimeRemaining > 0 && (
          <MonitorItem label="缓冲时间" value={`${(bufferTimeRemaining / 1000).toFixed(1)}s`} color="#a855f7" />
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            height: 8,
            background: 'rgba(71, 85, 105, 0.5)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min((totalLoad / SYSTEM_THRESHOLDS.OVERLOAD_THRESHOLD) * 100, 100)}%`,
              background: getStatusColor(),
              transition: 'all 0.3s ease',
              boxShadow: `0 0 10px ${getStatusColor()}`,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: '11px',
            color: '#64748b',
          }}>
          <span>0%</span>
          <span>安全</span>
          <span>过载</span>
        </div>
      </div>

      {gameResult !== 'running' && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: gameResult === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(220, 38, 38, 0.2)',
            borderRadius: 8,
            border: `1px solid ${gameResult === 'success' ? '#22c55e' : '#dc2626'}`,
          }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: gameResult === 'success' ? '#22c55e' : '#dc2626',
              marginBottom: 4,
            }}>
            {gameResult === 'success' ? '✓ 系统运行成功' : '✗ 系统运行失败'}
          </div>
          {failureReason && <div style={{ fontSize: '12px', color: '#94a3b8' }}>原因: {failureReason}</div>}
        </div>
      )}

      {gameResult !== 'running' && (
        <button
          onClick={onReset}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#3b82f6')}>
          重新开始
        </button>
      )}

      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: 8,
          fontSize: '11px',
          color: '#94a3b8',
          lineHeight: 1.6,
        }}>
        <div style={{ fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>操作说明:</div>
        <div>• 点击节点: 连接/断开</div>
        <div>• 点击档位球: 切换输出档位</div>
        <div>• 紫色方块: 开启/关闭缓冲</div>
        <div>• 红色方块: 开启/关闭限峰</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

// 监控项组件
function MonitorItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94a3b8', fontSize: '13px' }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontSize: '14px' }}>{value}</span>
    </div>
  )
}

// ============================================
// 主应用组件
// ============================================

export default function ClickAndHover() {
  // 能量调度状态
  const [nodes, setNodes] = useState<EnergyNodeState[]>([
    {
      id: 'ALPHA',
      currentOutput: NODE_CONFIG.ALPHA.baseOutput,
      levelIndex: 1,
      status: 'connected',
      isPeakLimited: false,
      bufferTimeRemaining: 0,
    },
    {
      id: 'BETA',
      currentOutput: NODE_CONFIG.BETA.baseOutput,
      levelIndex: 1,
      status: 'connected',
      isPeakLimited: false,
      bufferTimeRemaining: 0,
    },
    {
      id: 'GAMMA',
      currentOutput: NODE_CONFIG.GAMMA.baseOutput,
      levelIndex: 1,
      status: 'connected',
      isPeakLimited: false,
      bufferTimeRemaining: 0,
    },
  ])

  const [systemState, setSystemState] = useState<SystemState>({
    totalLoad: 0,
    stableNodes: 3,
    isOverloaded: false,
    bufferTimeRemaining: 0,
    gameResult: 'running',
    failureReason: '',
  })

  const safeTimeRef = useRef(0)
  const overloadTimeRef = useRef(0)
  const lastTimeRef = useRef(Date.now())

  const calculateNodeOutput = useCallback(
    (node: EnergyNodeState, config: (typeof NODE_CONFIG)['ALPHA'], time: number) => {
      if (node.status === 'disconnected') return 0

      const baseValue = config.baseOutput * OUTPUT_LEVELS[node.levelIndex].multiplier
      const fluctuation = Math.sin(time * 0.001 + config.baseOutput) * config.fluctuationRange
      let output = baseValue + fluctuation

      if (node.isPeakLimited) {
        output = Math.min(output, config.baseOutput * 1.2)
      }

      if (node.status === 'buffering') {
        output = baseValue + fluctuation * 0.3
      }

      return Math.max(0, output)
    },
    [],
  )

  useEffect(() => {
    if (systemState.gameResult !== 'running') return

    const interval = setInterval(() => {
      const now = Date.now()
      setNodes((prevNodes) =>
        prevNodes.map((node, idx) => {
          const configKey = Object.keys(NODE_CONFIG)[idx] as keyof typeof NODE_CONFIG
          const config = NODE_CONFIG[configKey]
          const newOutput = calculateNodeOutput(node, config, now)
          return { ...node, currentOutput: newOutput }
        }),
      )
    }, 100)

    return () => clearInterval(interval)
  }, [calculateNodeOutput, systemState.gameResult])

  useEffect(() => {
    if (systemState.gameResult !== 'running') return

    const interval = setInterval(() => {
      const now = Date.now()
      const dt = now - lastTimeRef.current
      lastTimeRef.current = now

      const totalLoad = nodes.reduce((sum, node) => sum + node.currentOutput, 0)
      const stableNodes = nodes.filter((node) => node.status !== 'disconnected' && node.currentOutput > 10).length
      const isOverloaded = totalLoad > SYSTEM_THRESHOLDS.OVERLOAD_THRESHOLD

      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          bufferTimeRemaining: Math.max(0, node.bufferTimeRemaining - dt),
        })),
      )

      let newGameResult: SystemState['gameResult'] = 'running'
      let failureReason = ''

      if (isOverloaded) {
        overloadTimeRef.current += dt
        safeTimeRef.current = 0
        if (overloadTimeRef.current >= SYSTEM_THRESHOLDS.OVERLOAD_DURATION) {
          newGameResult = 'failure'
          failureReason = `系统持续过载 ${(SYSTEM_THRESHOLDS.OVERLOAD_DURATION / 1000).toFixed(0)} 秒`
        }
      } else if (totalLoad >= SYSTEM_THRESHOLDS.SAFE_MIN && totalLoad <= SYSTEM_THRESHOLDS.SAFE_MAX) {
        safeTimeRef.current += dt
        overloadTimeRef.current = 0
        if (safeTimeRef.current >= SYSTEM_THRESHOLDS.SUCCESS_DURATION) {
          newGameResult = 'success'
        }
      } else {
        safeTimeRef.current = 0
        overloadTimeRef.current = 0
      }

      setSystemState({
        totalLoad,
        stableNodes,
        isOverloaded,
        bufferTimeRemaining: nodes.reduce((sum, node) => sum + node.bufferTimeRemaining, 0),
        gameResult: newGameResult,
        failureReason,
      })
    }, 100)

    return () => clearInterval(interval)
  }, [nodes, systemState.gameResult])

  const handleLevelChange = useCallback((idx: number) => {
    setNodes((prev) =>
      prev.map((node, i) => (i === idx ? { ...node, levelIndex: (node.levelIndex + 1) % OUTPUT_LEVELS.length } : node)),
    )
  }, [])

  const handleToggleConnection = useCallback((idx: number) => {
    setNodes((prev) =>
      prev.map((node, i) =>
        i === idx ? { ...node, status: node.status === 'disconnected' ? 'connected' : 'disconnected' } : node,
      ),
    )
  }, [])

  const handleToggleBuffer = useCallback((idx: number) => {
    setNodes((prev) =>
      prev.map((node, i) =>
        i === idx
          ? {
              ...node,
              status: node.status === 'buffering' ? 'connected' : 'buffering',
              bufferTimeRemaining: node.status === 'buffering' ? 0 : 5000,
            }
          : node,
      ),
    )
  }, [])

  const handleTogglePeakLimit = useCallback((idx: number) => {
    setNodes((prev) => prev.map((node, i) => (i === idx ? { ...node, isPeakLimited: !node.isPeakLimited } : node)))
  }, [])

  const handleReset = useCallback(() => {
    setNodes([
      {
        id: 'ALPHA',
        currentOutput: NODE_CONFIG.ALPHA.baseOutput,
        levelIndex: 1,
        status: 'connected',
        isPeakLimited: false,
        bufferTimeRemaining: 0,
      },
      {
        id: 'BETA',
        currentOutput: NODE_CONFIG.BETA.baseOutput,
        levelIndex: 1,
        status: 'connected',
        isPeakLimited: false,
        bufferTimeRemaining: 0,
      },
      {
        id: 'GAMMA',
        currentOutput: NODE_CONFIG.GAMMA.baseOutput,
        levelIndex: 1,
        status: 'connected',
        isPeakLimited: false,
        bufferTimeRemaining: 0,
      },
    ])
    setSystemState({
      totalLoad: 0,
      stableNodes: 3,
      isOverloaded: false,
      bufferTimeRemaining: 0,
      gameResult: 'running',
      failureReason: '',
    })
    safeTimeRef.current = 0
    overloadTimeRef.current = 0
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }} style={{ background: '#0f172a' }}>
        {/* 原有 ClickAndHover 交互元素 */}
        <group position={[-6, -2, 0]}>
          <Box position={[-0.5, 0, 0]} />
          <Box2 position={[0.5, 0, 0]} />
        </group>

        {/* 新增能量调度系统 */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />

        <gridHelper args={[20, 20, '#1e293b', '#1e293b']} position={[0, -4, 0]} />

        <ConnectionLines nodes={nodes} />

        {nodes.map((node, idx) => {
          const configKey = Object.keys(NODE_CONFIG)[idx] as keyof typeof NODE_CONFIG
          return (
            <EnergyNode
              key={node.id}
              config={NODE_CONFIG[configKey]}
              state={node}
              onLevelChange={() => handleLevelChange(idx)}
              onToggleConnection={() => handleToggleConnection(idx)}
              onToggleBuffer={() => handleToggleBuffer(idx)}
              onTogglePeakLimit={() => handleTogglePeakLimit(idx)}
            />
          )
        })}

        <ControlCore
          totalLoad={systemState.totalLoad}
          isOverloaded={systemState.isOverloaded}
          gameResult={systemState.gameResult}
        />
      </Canvas>

      <SystemMonitor systemState={systemState} onReset={handleReset} />
    </div>
  )
}
