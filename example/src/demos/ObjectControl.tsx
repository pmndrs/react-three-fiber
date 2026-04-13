import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import * as THREE from 'three'

type PowerLevel = 0 | 1 | 2 | 3
type NodeType = 'solar' | 'wind' | 'thermal'
type GameStatus = 'running' | 'success' | 'fail'

interface EnergyNode {
  id: string
  name: string
  type: NodeType
  position: [number, number, number]
  connected: boolean
  powerLevel: PowerLevel
  bufferMode: boolean
  peakLimit: number
  currentOutput: number
  stability: number
  color: string
}

interface CoreState {
  totalLoad: number
  maxCapacity: number
  bufferRemaining: number
  maxBuffer: number
  safeTime: number
  overloadTime: number
  status: GameStatus
  failReason: string
}

interface SystemState {
  nodes: EnergyNode[]
  core: CoreState
  selectedNodeId: string | null
}

const SAFE_THRESHOLD = 0.85
const OVERLOAD_THRESHOLD = 1.0
const SUCCESS_SAFE_DURATION = 15
const FAIL_OVERLOAD_DURATION = 5
const MAX_BUFFER = 10

const nodeConfigs = [
  {
    id: 'solar',
    name: '太阳能节点',
    type: 'solar' as NodeType,
    position: [-4, 0, 0] as [number, number, number],
    color: '#ffd93d',
    basePower: 25,
  },
  {
    id: 'wind',
    name: '风能节点',
    type: 'wind' as NodeType,
    position: [0, 0, -4] as [number, number, number],
    color: '#6bcb77',
    basePower: 20,
  },
  {
    id: 'thermal',
    name: '热能节点',
    type: 'thermal' as NodeType,
    position: [4, 0, 0] as [number, number, number],
    color: '#ff6b6b',
    basePower: 30,
  },
]

function EnergyNodeMesh({
  node,
  isSelected,
  onSelect,
  onOutputChange,
}: {
  node: EnergyNode
  isSelected: boolean
  onSelect: (id: string) => void
  onOutputChange: (id: string, value: number) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }) => {
    if (!groupRef.current || !meshRef.current || !glowRef.current) return

    const time = clock.getElapsedTime()
    const typeOffset = node.type === 'solar' ? 0 : node.type === 'wind' ? 2 : 4
    const wave = Math.sin(time * 1.5 + typeOffset) * 0.15 + Math.sin(time * 0.7 + typeOffset) * 0.1

    const baseOutput = node.connected ? (node.powerLevel * nodeConfigs.find((n) => n.id === node.id)!.basePower) / 3 : 0
    const fluctuation = node.connected ? wave * baseOutput * 0.3 : 0
    const bufferEffect = node.bufferMode ? Math.abs(wave) * -5 : 0
    const peakLimited = Math.min(baseOutput + fluctuation + bufferEffect, node.peakLimit)
    const finalOutput = node.connected ? Math.max(0, peakLimited) : 0

    onOutputChange(node.id, finalOutput)

    const pulseScale = 1 + wave * 0.1
    meshRef.current.scale.setScalar(pulseScale)

    const glowIntensity = node.connected ? (finalOutput / 30) * 0.5 + 0.3 : 0.1
    const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial
    glowMaterial.opacity = glowIntensity * (hovered || isSelected ? 1.5 : 1)

    groupRef.current.rotation.y += 0.005
  })

  const getGeometry = () => {
    switch (node.type) {
      case 'solar':
        return <octahedronGeometry args={[0.8, 0]} />
      case 'wind':
        return <icosahedronGeometry args={[0.8, 0]} />
      case 'thermal':
        return <torusKnotGeometry args={[0.5, 0.2, 64, 8]} />
    }
  }

  return (
    <group
      ref={groupRef}
      position={node.position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}>
      <mesh ref={glowRef} scale={1.5}>
        {node.type === 'thermal' ? (
          <torusKnotGeometry args={[0.5, 0.2, 64, 8]} />
        ) : (
          <sphereGeometry args={[1, 32, 32]} />
        )}
        <meshBasicMaterial color={node.color} transparent opacity={0.3} side={THREE.BackSide} />
      </mesh>

      {isSelected && (
        <mesh scale={2}>
          <ringGeometry args={[1.1, 1.3, 32]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      <mesh ref={meshRef}>
        {getGeometry()}
        <meshStandardMaterial
          color={node.connected ? node.color : '#555555'}
          emissive={node.connected ? node.color : '#222222'}
          emissiveIntensity={node.connected ? 0.4 : 0.1}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {!node.connected && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      )}

      {node.bufferMode && node.connected && (
        <mesh position={[0, 1.2, 0]}>
          <ringGeometry args={[0.15, 0.25, 16]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )}
    </group>
  )
}

function ControlCore({ state }: { state: CoreState }) {
  const coreRef = useRef<THREE.Group>(null)
  const shellRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!coreRef.current || !shellRef.current) return

    const time = clock.getElapsedTime()
    const loadRatio = state.totalLoad / state.maxCapacity

    coreRef.current.rotation.y += 0.01
    coreRef.current.rotation.x = Math.sin(time * 0.5) * 0.2

    const pulseSpeed = loadRatio > OVERLOAD_THRESHOLD ? 3 : loadRatio > SAFE_THRESHOLD ? 2 : 1
    const pulse = Math.sin(time * pulseSpeed) * 0.1 + 1
    shellRef.current.scale.setScalar(pulse * (1 + loadRatio * 0.3))

    const shellMaterial = shellRef.current.material as THREE.MeshStandardMaterial
    if (state.status === 'fail') {
      shellMaterial.emissive.set('#ff0000')
      shellMaterial.emissiveIntensity = 1
    } else if (state.status === 'success') {
      shellMaterial.emissive.set('#00ff00')
      shellMaterial.emissiveIntensity = 1
    } else if (loadRatio > OVERLOAD_THRESHOLD) {
      shellMaterial.emissive.set('#ff4400')
      shellMaterial.emissiveIntensity = 0.8
    } else if (loadRatio > SAFE_THRESHOLD) {
      shellMaterial.emissive.set('#ffaa00')
      shellMaterial.emissiveIntensity = 0.5
    } else {
      shellMaterial.emissive.set('#00aaff')
      shellMaterial.emissiveIntensity = 0.3
    }
  })

  return (
    <group ref={coreRef} position={[0, 0, 0]}>
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} wireframe={false} />
      </mesh>

      <mesh scale={0.6}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>

      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} rotation={[(i * Math.PI) / 3, 0, 0]}>
          <torusGeometry args={[1.5, 0.02, 8, 100]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

function EnergyConnection({
  start,
  end,
  active,
}: {
  start: [number, number, number]
  end: [number, number, number]
  active: boolean
}) {
  const ref = useRef<THREE.Line>(null)
  const points = useMemo(() => {
    const p1 = new THREE.Vector3(...start)
    const p2 = new THREE.Vector3(...end)
    const mid = p1.clone().add(p2).multiplyScalar(0.5)
    mid.y += 1
    return [p1, mid, p2]
  }, [start, end])

  const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2])
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50))

  useFrame(({ clock }) => {
    if (!ref.current || !active) return
    const material = ref.current.material as THREE.LineBasicMaterial
    material.opacity = 0.3 + Math.sin(clock.getElapsedTime() * 3) * 0.2
  })

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: active ? '#00ffff' : '#333333',
        transparent: true,
        opacity: active ? 0.5 : 0.2,
      }),
    [active],
  )

  const line = useMemo(() => {
    const l = new THREE.Line()
    l.geometry = geometry
    l.material = material
    return l
  }, [geometry, material])

  return <primitive object={line} ref={ref} />
}

function ControlPanel({
  state,
  onSelectNode,
  onToggleConnection,
  onChangePowerLevel,
  onToggleBufferMode,
  onChangePeakLimit,
  onReset,
}: {
  state: SystemState
  onSelectNode: (id: string | null) => void
  onToggleConnection: (id: string) => void
  onChangePowerLevel: (id: string, level: PowerLevel) => void
  onToggleBufferMode: (id: string) => void
  onChangePeakLimit: (id: string, limit: number) => void
  onReset: () => void
}) {
  const selectedNode = state.nodes.find((n) => n.id === state.selectedNodeId)
  const stableNodes = state.nodes.filter((n) => n.connected && n.currentOutput > 0 && n.stability > 0.6).length
  const loadRatio = (state.core.totalLoad / state.core.maxCapacity) * 100
  const isOverloaded = loadRatio > OVERLOAD_THRESHOLD * 100

  return (
    <div className="control-panel">
      <div className="panel-section system-status">
        <h3>⚡ 系统监控中心</h3>
        <div className={`status-badge ${state.core.status}`}>
          {state.core.status === 'running'
            ? '系统运行中'
            : state.core.status === 'success'
            ? '✓ 调度成功'
            : '✗ 系统失败'}
        </div>

        <div className="monitor-grid">
          <div className="monitor-item">
            <label>总负载</label>
            <div className="progress-bar">
              <div
                className={`progress-fill ${
                  isOverloaded ? 'danger' : loadRatio > SAFE_THRESHOLD * 100 ? 'warning' : 'safe'
                }`}
                style={{ width: `${Math.min(loadRatio, 120)}%` }}
              />
            </div>
            <span className="value">
              {state.core.totalLoad.toFixed(1)} / {state.core.maxCapacity} MW
            </span>
          </div>

          <div className="monitor-item">
            <label>稳定节点</label>
            <span className="value large">
              {stableNodes} / {state.nodes.length}
            </span>
          </div>

          <div className="monitor-item">
            <label>过载状态</label>
            <span className={`value status ${isOverloaded ? 'danger' : 'safe'}`}>
              {isOverloaded ? '⚠ 过载' : '正常'}
            </span>
          </div>

          <div className="monitor-item">
            <label>剩余缓冲</label>
            <span className="value large">{state.core.bufferRemaining.toFixed(1)} s</span>
          </div>

          <div className="monitor-item">
            <label>安全运行计时</label>
            <span className="value">
              {state.core.safeTime.toFixed(1)} / {SUCCESS_SAFE_DURATION} s
            </span>
          </div>

          <div className="monitor-item">
            <label>过载计时</label>
            <span className={`value ${state.core.overloadTime > 2 ? 'danger' : ''}`}>
              {state.core.overloadTime.toFixed(1)} / {FAIL_OVERLOAD_DURATION} s
            </span>
          </div>
        </div>

        {state.core.status === 'fail' && (
          <div className="result-panel fail">
            <h4>调度失败</h4>
            <p>失败原因: {state.core.failReason}</p>
            <button className="reset-btn" onClick={onReset}>
              重新开始
            </button>
          </div>
        )}

        {state.core.status === 'success' && (
          <div className="result-panel success">
            <h4>🎉 调度成功!</h4>
            <p>系统已连续安全运行 {SUCCESS_SAFE_DURATION} 秒</p>
            <button className="reset-btn" onClick={onReset}>
              再次挑战
            </button>
          </div>
        )}
      </div>

      <div className="panel-section">
        <h3>🔋 能量节点列表</h3>
        <div className="node-list">
          {state.nodes.map((node) => (
            <div
              key={node.id}
              className={`node-item ${state.selectedNodeId === node.id ? 'selected' : ''}`}
              onClick={() => onSelectNode(state.selectedNodeId === node.id ? null : node.id)}>
              <span className="node-dot" style={{ backgroundColor: node.color }} />
              <span className="node-name">{node.name}</span>
              <span className={`node-status ${node.connected ? 'connected' : 'disconnected'}`}>
                {node.connected ? `${node.currentOutput.toFixed(0)}MW` : '离线'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="panel-section">
          <h3>🎛️ 节点控制 - {selectedNode.name}</h3>

          <div className="control-group">
            <label>连接状态</label>
            <button
              className={`toggle-btn ${selectedNode.connected ? 'active' : ''}`}
              onClick={() => onToggleConnection(selectedNode.id)}>
              {selectedNode.connected ? '✓ 已连接' : '✗ 已断开'}
            </button>
          </div>

          <div className="control-group">
            <label>输出档位: Lv.{selectedNode.powerLevel}</label>
            <div className="level-buttons">
              {[0, 1, 2, 3].map((level) => (
                <button
                  key={level}
                  className={`level-btn ${selectedNode.powerLevel === level ? 'active' : ''}`}
                  onClick={() => onChangePowerLevel(selectedNode.id, level as PowerLevel)}
                  disabled={!selectedNode.connected}>
                  {level === 0 ? '待机' : `Lv.${level}`}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>缓冲模式: {selectedNode.bufferMode ? '开启' : '关闭'}</label>
            <button
              className={`toggle-btn ${selectedNode.bufferMode ? 'active' : ''}`}
              onClick={() => onToggleBufferMode(selectedNode.id)}
              disabled={!selectedNode.connected}>
              {selectedNode.bufferMode ? '✓ 波动抑制中' : '开启缓冲'}
            </button>
          </div>

          <div className="control-group">
            <label>峰值限制: {selectedNode.peakLimit} MW</label>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={selectedNode.peakLimit}
              onChange={(e) => onChangePeakLimit(selectedNode.id, parseInt(e.target.value))}
              disabled={!selectedNode.connected}
            />
          </div>

          <div className="info-grid">
            <div className="info-item">
              <label>当前输出</label>
              <span>{selectedNode.currentOutput.toFixed(1)} MW</span>
            </div>
            <div className="info-item">
              <label>稳定性</label>
              <span>{(selectedNode.stability * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="panel-section tips">
        <h4>💡 操作提示</h4>
        <ul>
          <li>点击场景中的节点或列表选中进行控制</li>
          <li>保持总负载在 85% 以下维持安全状态</li>
          <li>缓冲模式可降低波动但减少输出</li>
          <li>连续过载5秒将导致系统崩溃</li>
          <li>连续安全运行15秒即可通关</li>
        </ul>
      </div>
    </div>
  )
}

function Scene({
  state,
  onNodeOutputChange,
  onSelectNode,
}: {
  state: SystemState
  onNodeOutputChange: (id: string, value: number) => void
  onSelectNode: (id: string) => void
}) {
  return (
    <>
      <color attach="background" args={['#0a0a1a']} />
      <ambientLight intensity={0.2} />
      <pointLight decay={0} position={[10, 10, 10]} intensity={1} />
      <pointLight decay={0} position={[-10, -10, -10]} color="#00ffff" intensity={0.5} />

      <ControlCore state={state.core} />

      {state.nodes.map((node) => (
        <EnergyConnection key={`line-${node.id}`} start={node.position} end={[0, 0, 0]} active={node.connected} />
      ))}

      {state.nodes.map((node) => (
        <EnergyNodeMesh
          key={node.id}
          node={node}
          isSelected={state.selectedNodeId === node.id}
          onSelect={onSelectNode}
          onOutputChange={onNodeOutputChange}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#0f0f23" metalness={0.9} roughness={0.3} />
      </mesh>

      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 6]} position={[0, -2.49, 0]}>
          <ringGeometry args={[6, 6.2, 1, 1]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
        </mesh>
      ))}

      <OrbitControls makeDefault minDistance={5} maxDistance={20} />
    </>
  )
}

export default function App() {
  const createInitialState = (): SystemState => ({
    nodes: nodeConfigs.map((config) => ({
      ...config,
      connected: true,
      powerLevel: 1 as PowerLevel,
      bufferMode: false,
      peakLimit: 35,
      currentOutput: 0,
      stability: 0.8,
    })),
    core: {
      totalLoad: 0,
      maxCapacity: 80,
      bufferRemaining: MAX_BUFFER,
      maxBuffer: MAX_BUFFER,
      safeTime: 0,
      overloadTime: 0,
      status: 'running',
      failReason: '',
    },
    selectedNodeId: null,
  })

  const [state, setState] = useState<SystemState>(createInitialState)

  const handleNodeOutputChange = useCallback((nodeId: string, value: number) => {
    setState((prev) => {
      if (prev.core.status !== 'running') return prev

      const newNodes = prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, currentOutput: value, stability: 0.6 + Math.random() * 0.4 } : n,
      )
      const totalLoad = newNodes.reduce((sum, n) => sum + n.currentOutput, 0)

      return { ...prev, nodes: newNodes, core: { ...prev.core, totalLoad } }
    })
  }, [])

  useEffect(() => {
    if (state.core.status !== 'running') return

    const interval = setInterval(() => {
      setState((prev) => {
        const loadRatio = prev.core.totalLoad / prev.core.maxCapacity
        let { safeTime, overloadTime, bufferRemaining, status, failReason } = prev.core

        if (loadRatio > OVERLOAD_THRESHOLD) {
          overloadTime += 0.1
          safeTime = 0
          if (overloadTime >= FAIL_OVERLOAD_DURATION) {
            status = 'fail'
            failReason = `系统持续过载 ${FAIL_OVERLOAD_DURATION} 秒，核心熔断`
          }
        } else if (loadRatio <= SAFE_THRESHOLD && loadRatio > 0) {
          safeTime += 0.1
          overloadTime = Math.max(0, overloadTime - 0.05)
          if (safeTime >= SUCCESS_SAFE_DURATION) {
            status = 'success'
          }
        } else {
          safeTime = Math.max(0, safeTime - 0.05)
          overloadTime = Math.max(0, overloadTime - 0.02)
        }

        bufferRemaining = Math.max(0, bufferRemaining - (loadRatio > SAFE_THRESHOLD ? 0.15 : 0))

        return {
          ...prev,
          core: { ...prev.core, safeTime, overloadTime, bufferRemaining, status, failReason },
        }
      })
    }, 100)

    return () => clearInterval(interval)
  }, [state.core.status])

  const handleSelectNode = (id: string | null) => setState((prev) => ({ ...prev, selectedNodeId: id }))

  const handleToggleConnection = (id: string) =>
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, connected: !n.connected } : n)),
    }))

  const handleChangePowerLevel = (id: string, level: PowerLevel) =>
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, powerLevel: level } : n)),
    }))

  const handleToggleBufferMode = (id: string) =>
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, bufferMode: !n.bufferMode } : n)),
    }))

  const handleChangePeakLimit = (id: string, limit: number) =>
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, peakLimit: limit } : n)),
    }))

  const handleReset = () => setState(createInitialState())

  return (
    <div className="object-control-container">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 8, 12], fov: 50 }} className="object-control-canvas">
        <Scene state={state} onNodeOutputChange={handleNodeOutputChange} onSelectNode={handleSelectNode} />
      </Canvas>
      <ControlPanel
        state={state}
        onSelectNode={handleSelectNode}
        onToggleConnection={handleToggleConnection}
        onChangePowerLevel={handleChangePowerLevel}
        onToggleBufferMode={handleToggleBufferMode}
        onChangePeakLimit={handleChangePeakLimit}
        onReset={handleReset}
      />
    </div>
  )
}
