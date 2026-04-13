import { OrbitControls, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useState, useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

type EnergyLevel = 'low' | 'medium' | 'high' | 'critical'

type ObjectState = {
  id: string
  name: string
  visible: boolean
  color: string
  scale: number
  position: [number, number, number]
  connected: boolean
  bufferMode: boolean
  peakLimited: boolean
  level: EnergyLevel
  currentValue: number
  fluctuationSpeed: number
  fluctuationAmplitude: number
  phase: number
  stability: number
}

type CoreState = {
  currentLoad: number
  maxCapacity: number
  safeThreshold: number
  overloadThreshold: number
  timeInSafeZone: number
  timeInOverload: number
  bufferTimeRemaining: number
  status: 'normal' | 'warning' | 'critical' | 'success' | 'failed'
}

type SystemState = {
  totalLoad: number
  stableNodes: number
  isOverloaded: boolean
  bufferTimeRemaining: number
  result: 'running' | 'success' | 'failed'
  failReason: string
  successTimeRequired: number
  overloadTimeLimit: number
}

type CameraPreset = {
  name: string
  position: [number, number, number]
  target: [number, number, number]
}

const cameraPresets: CameraPreset[] = [
  { name: '正视图', position: [0, 0, 7], target: [0, 0, 0] },
  { name: '俯视图', position: [0, 8, 0], target: [0, 0, 0] },
  { name: '斜侧等距视角', position: [5, 5, 5], target: [0, 0, 0] },
]

const colorOptions = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe']

const levelConfig: Record<EnergyLevel, { color: string; output: number; fluctuation: number }> = {
  low: { color: '#4ecdc4', output: 0.3, fluctuation: 0.1 },
  medium: { color: '#ffeaa7', output: 0.6, fluctuation: 0.2 },
  high: { color: '#ff6b6b', output: 1.0, fluctuation: 0.3 },
  critical: { color: '#e84393', output: 1.5, fluctuation: 0.5 },
}

const initialObjects: ObjectState[] = [
  {
    id: 'cube',
    name: 'Alpha 节点',
    visible: true,
    color: '#ff6b6b',
    scale: 1,
    position: [-2.5, 0, 0],
    connected: true,
    bufferMode: false,
    peakLimited: false,
    level: 'medium',
    currentValue: 0.6,
    fluctuationSpeed: 1.2,
    fluctuationAmplitude: 0.2,
    phase: 0,
    stability: 0.8,
  },
  {
    id: 'sphere',
    name: 'Beta 节点',
    visible: true,
    color: '#4ecdc4',
    scale: 1,
    position: [0, 0, 0],
    connected: true,
    bufferMode: false,
    peakLimited: false,
    level: 'high',
    currentValue: 1.0,
    fluctuationSpeed: 0.8,
    fluctuationAmplitude: 0.3,
    phase: Math.PI / 3,
    stability: 0.6,
  },
  {
    id: 'cylinder',
    name: 'Gamma 节点',
    visible: true,
    color: '#45b7d1',
    scale: 1,
    position: [2.5, 0, 0],
    connected: true,
    bufferMode: false,
    peakLimited: false,
    level: 'low',
    currentValue: 0.3,
    fluctuationSpeed: 1.5,
    fluctuationAmplitude: 0.15,
    phase: (Math.PI * 2) / 3,
    stability: 0.9,
  },
]

const initialCore: CoreState = {
  currentLoad: 0,
  maxCapacity: 3.0,
  safeThreshold: 2.0,
  overloadThreshold: 2.5,
  timeInSafeZone: 0,
  timeInOverload: 0,
  bufferTimeRemaining: 10,
  status: 'normal',
}

const initialSystem: SystemState = {
  totalLoad: 0,
  stableNodes: 0,
  isOverloaded: false,
  bufferTimeRemaining: 10,
  result: 'running',
  failReason: '',
  successTimeRequired: 15,
  overloadTimeLimit: 5,
}

function ControllableObject({
  state,
  isSelected,
  onSelect,
  children,
}: {
  state: ObjectState
  isSelected: boolean
  onSelect: (id: string) => void
  children: React.ReactNode
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(state.scale)
    }
  }, [state.scale])

  useFrame((frameState) => {
    if (!groupRef.current || !meshRef.current || !glowRef.current) return

    const time = frameState.clock.elapsedTime

    groupRef.current.rotation.y = time * 0.3 + state.phase

    const pulseScale = state.connected ? 1 + Math.sin(time * state.fluctuationSpeed * 2 + state.phase) * 0.1 : 0.5
    meshRef.current.scale.setScalar(state.visible ? pulseScale : 0.5)

    const glowIntensity = state.connected && state.visible ? 0.3 + Math.sin(time * 3 + state.phase) * 0.2 : 0.1
    const glowMaterial = glowRef.current.material as THREE.MeshBasicMaterial
    glowMaterial.opacity = glowIntensity
    glowRef.current.scale.setScalar(state.visible && state.connected ? 1.5 + state.currentValue * 0.5 : 0.8)
  })

  if (!state.visible) return null

  const effectiveColor = state.connected ? levelConfig[state.level].color : '#666666'

  return (
    <group
      ref={groupRef}
      position={state.position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(state.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={effectiveColor} transparent opacity={0.3} />
      </mesh>

      <mesh ref={meshRef}>{children}</mesh>

      {state.bufferMode && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.05, 16, 32]} />
          <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
        </mesh>
      )}

      {state.peakLimited && (
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.6, 0.03, 16, 32]} />
          <meshBasicMaterial color="#ff8800" transparent opacity={0.6} />
        </mesh>
      )}

      {!state.connected && (
        <mesh>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color="#ff0000" wireframe />
        </mesh>
      )}

      {isSelected && (
        <mesh scale={1.3}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#ffd700" wireframe transparent opacity={0.8} />
        </mesh>
      )}

      {hovered && !isSelected && (
        <mesh scale={1.15}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
        </mesh>
      )}

      <Text
        position={[0, -1.2, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000">
        {state.name}
      </Text>

      <Text position={[0, -1.5, 0]} fontSize={0.18} color={effectiveColor} anchorX="center" anchorY="middle">
        {state.connected ? `${(state.currentValue * 100).toFixed(0)}%` : '已断开'}
      </Text>
    </group>
  )
}

function Cube({ color }: { color: string }) {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Sphere({ color }: { color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Cylinder({ color }: { color: string }) {
  return (
    <mesh>
      <cylinderGeometry args={[0.4, 0.4, 1.2, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function CoreCore({ core }: { core: CoreState }) {
  const groupRef = useRef<THREE.Group>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const outerRef = useRef<THREE.Mesh>(null)
  const ringsRef = useRef<THREE.Group>(null)

  const getStatusColor = () => {
    switch (core.status) {
      case 'success':
        return '#00ff88'
      case 'failed':
        return '#ff0000'
      case 'critical':
        return '#ff0044'
      case 'warning':
        return '#ffaa00'
      default:
        return '#4488ff'
    }
  }

  useFrame((frameState) => {
    if (!groupRef.current || !innerRef.current || !outerRef.current || !ringsRef.current) return

    const time = frameState.clock.elapsedTime
    const loadRatio = core.currentLoad / core.maxCapacity

    groupRef.current.rotation.y = time * 0.2

    const pulseSpeed = core.status === 'critical' ? 5 : core.status === 'warning' ? 3 : 1
    const pulseScale = 1 + Math.sin(time * pulseSpeed) * 0.1 * loadRatio
    innerRef.current.scale.setScalar(pulseScale)

    const innerMaterial = innerRef.current.material as THREE.MeshStandardMaterial
    innerMaterial.emissiveIntensity = 0.3 + loadRatio * 0.7

    const outerMaterial = outerRef.current.material as THREE.MeshBasicMaterial
    outerMaterial.opacity = 0.1 + loadRatio * 0.3

    ringsRef.current.children.forEach((ring, i) => {
      const ringMesh = ring as THREE.Mesh
      ringMesh.rotation.z = time * (0.5 + i * 0.3)
      const ringMaterial = ringMesh.material as THREE.MeshBasicMaterial
      ringMaterial.opacity = 0.3 + Math.sin(time * 2 + i) * 0.2
    })
  })

  const statusColor = getStatusColor()
  const loadRatio = core.currentLoad / core.maxCapacity

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      <mesh ref={outerRef}>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.2} />
      </mesh>

      <mesh ref={innerRef}>
        <icosahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      <group ref={ringsRef}>
        {[1.5, 1.7, 1.9].map((radius, i) => (
          <mesh key={i} rotation={[Math.PI / 2 + i * 0.3, i * 0.5, 0]}>
            <torusGeometry args={[radius, 0.02, 16, 64]} />
            <meshBasicMaterial color={statusColor} transparent opacity={0.3} />
          </mesh>
        ))}
      </group>

      <Text
        position={[0, -2.2, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000">
        总控核心
      </Text>

      <Text position={[0, -2.6, 0]} fontSize={0.22} color={statusColor} anchorX="center" anchorY="middle">
        负载: {(loadRatio * 100).toFixed(0)}%
      </Text>
    </group>
  )
}

function EnergyBeam({
  start,
  end,
  active,
  intensity,
}: {
  start: [number, number, number]
  end: [number, number, number]
  active: boolean
  intensity: number
}) {
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame((frameState) => {
    if (!beamRef.current) return
    const material = beamRef.current.material as THREE.MeshBasicMaterial
    if (active) {
      material.opacity = 0.3 + Math.sin(frameState.clock.elapsedTime * 5) * 0.2 * intensity
    } else {
      material.opacity = 0.05
    }
  })

  const direction = new THREE.Vector3(...end).sub(new THREE.Vector3(...start))
  const length = direction.length()
  const midPoint = new THREE.Vector3(...start).add(direction.multiplyScalar(0.5))

  return (
    <mesh ref={beamRef} position={midPoint.toArray()} rotation={[0, 0, Math.atan2(direction.y, direction.x)]}>
      <cylinderGeometry args={[0.03, 0.03, length, 8]} />
      <meshBasicMaterial color={active ? '#00ffff' : '#333333'} transparent opacity={active ? 0.5 : 0.1} />
    </mesh>
  )
}

function CameraController({ preset }: { preset: CameraPreset }) {
  const { camera, controls } = useThree()

  useEffect(() => {
    if (controls) {
      const startPos = camera.position.clone()
      const endPos = new THREE.Vector3(...preset.position)
      const orbitControls = controls as any
      const startTarget = orbitControls.target.clone()
      const endTarget = new THREE.Vector3(...preset.target)

      let progress = 0
      const duration = 1000
      const startTime = Date.now()

      const animate = () => {
        const elapsed = Date.now() - startTime
        progress = Math.min(elapsed / duration, 1)
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        camera.position.lerpVectors(startPos, endPos, easeProgress)
        orbitControls.target.lerpVectors(startTarget, endTarget, easeProgress)
        orbitControls.update()

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      animate()
    }
  }, [preset, camera, controls])

  return null
}

function ControlPanel({
  objects,
  selectedId,
  onSelect,
  onToggleVisibility,
  onChangeColor,
  onChangeScale,
  onChangeLevel,
  onToggleConnection,
  onToggleBuffer,
  onTogglePeakLimit,
  cameraPreset,
  onChangeCameraPreset,
  system,
  core,
}: {
  objects: ObjectState[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleVisibility: (id: string) => void
  onChangeColor: (id: string, color: string) => void
  onChangeScale: (id: string, scale: number) => void
  onChangeLevel: (id: string, level: EnergyLevel) => void
  onToggleConnection: (id: string) => void
  onToggleBuffer: (id: string) => void
  onTogglePeakLimit: (id: string) => void
  cameraPreset: number
  onChangeCameraPreset: (index: number) => void
  system: SystemState
  core: CoreState
}) {
  const selectedObject = objects.find((obj) => obj.id === selectedId)
  const levels: EnergyLevel[] = ['low', 'medium', 'high', 'critical']
  const levelNames: Record<EnergyLevel, string> = {
    low: '低档',
    medium: '中档',
    high: '高档',
    critical: '临界',
  }

  const getStatusClass = () => {
    if (system.result === 'success') return 'status-success'
    if (system.result === 'failed') return 'status-failed'
    if (system.isOverloaded) return 'status-critical'
    return 'status-normal'
  }

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3>能量节点列表</h3>
        <div className="object-list">
          {objects.map((obj) => (
            <div
              key={obj.id}
              className={`object-item ${selectedId === obj.id ? 'selected' : ''}`}
              onClick={() => onSelect(obj.id)}>
              <span className="object-name">{obj.name}</span>
              <span className={`visibility-indicator ${obj.visible ? 'visible' : 'hidden'}`}>
                {obj.visible ? '👁' : '🚫'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3>系统监控</h3>
        <div className={`system-monitor-mini ${getStatusClass()}`}>
          <div className="monitor-row">
            <span>总负载:</span>
            <span>{(system.totalLoad * 100).toFixed(0)}%</span>
          </div>
          <div className="monitor-row">
            <span>稳定节点:</span>
            <span>{system.stableNodes}/3</span>
          </div>
          <div className="monitor-row">
            <span>状态:</span>
            <span className={system.isOverloaded ? 'text-danger' : 'text-success'}>
              {system.isOverloaded ? '⚠️ 过载' : '✓ 正常'}
            </span>
          </div>
          <div className="monitor-row">
            <span>缓冲时间:</span>
            <span>{system.bufferTimeRemaining.toFixed(1)}s</span>
          </div>
          {system.result !== 'running' && (
            <div className={`result-badge ${system.result}`}>
              {system.result === 'success' ? '🎉 调度成功!' : `💥 ${system.failReason}`}
            </div>
          )}
        </div>
      </div>

      {selectedObject && (
        <>
          <div className="panel-section">
            <h3>节点信息</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>名称:</label>
                <span>{selectedObject.name}</span>
              </div>
              <div className="info-item">
                <label>状态:</label>
                <span>{selectedObject.connected ? '已连接' : '已断开'}</span>
              </div>
              <div className="info-item">
                <label>输出:</label>
                <span>{(selectedObject.currentValue * 100).toFixed(1)}%</span>
              </div>
              <div className="info-item">
                <label>稳定性:</label>
                <span>{(selectedObject.stability * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="panel-section">
            <h3>节点控制</h3>

            <div className="control-group">
              <label>显示/隐藏</label>
              <button
                className={`toggle-btn ${selectedObject.visible ? 'active' : ''}`}
                onClick={() => onToggleVisibility(selectedObject.id)}>
                {selectedObject.visible ? '隐藏对象' : '显示对象'}
              </button>
            </div>

            <div className="control-group">
              <label>连接状态</label>
              <button
                className={`toggle-btn ${selectedObject.connected ? 'connected' : 'disconnected'}`}
                onClick={() => onToggleConnection(selectedObject.id)}>
                {selectedObject.connected ? '已连接' : '已断开'}
              </button>
            </div>

            <div className="control-group">
              <label>输出档位</label>
              <div className="level-buttons">
                {levels.map((level) => (
                  <button
                    key={level}
                    className={`level-btn ${selectedObject.level === level ? 'active' : ''}`}
                    style={{ backgroundColor: levelConfig[level].color }}
                    onClick={() => onChangeLevel(selectedObject.id, level)}>
                    {levelNames[level]}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>缓冲模式</label>
              <button
                className={`toggle-btn ${selectedObject.bufferMode ? 'active' : ''}`}
                onClick={() => onToggleBuffer(selectedObject.id)}
                disabled={!selectedObject.connected}>
                {selectedObject.bufferMode ? '已开启' : '已关闭'}
              </button>
            </div>

            <div className="control-group">
              <label>峰值限制</label>
              <button
                className={`toggle-btn ${selectedObject.peakLimited ? 'active' : ''}`}
                onClick={() => onTogglePeakLimit(selectedObject.id)}
                disabled={!selectedObject.connected}>
                {selectedObject.peakLimited ? '已启用' : '已禁用'}
              </button>
            </div>

            <div className="control-group">
              <label>颜色选择</label>
              <div className="color-grid">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${selectedObject.color === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => onChangeColor(selectedObject.id, color)}
                  />
                ))}
              </div>
            </div>

            <div className="control-group">
              <label>缩放调整: {selectedObject.scale.toFixed(2)}x</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={selectedObject.scale}
                onChange={(e) => onChangeScale(selectedObject.id, parseFloat(e.target.value))}
              />
            </div>
          </div>
        </>
      )}

      <div className="panel-section">
        <h3>相机视角</h3>
        <div className="camera-presets">
          {cameraPresets.map((preset, index) => (
            <button
              key={preset.name}
              className={`preset-btn ${cameraPreset === index ? 'active' : ''}`}
              onClick={() => onChangeCameraPreset(index)}>
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Scene({
  objects,
  selectedId,
  onSelect,
  cameraPreset,
  core,
}: {
  objects: ObjectState[]
  selectedId: string | null
  onSelect: (id: string) => void
  cameraPreset: CameraPreset
  core: CoreState
}) {
  const corePosition: [number, number, number] = [0, -2, 0]

  return (
    <>
      <color attach="background" args={['#f0f0f0']} />
      <ambientLight intensity={Math.PI * 0.5} />
      <pointLight decay={0} position={[10, 10, 10]} />
      <pointLight decay={0} position={[-10, -10, -10]} color="#4ecdc4" />

      {objects.map((obj) => (
        <EnergyBeam
          key={obj.id}
          start={obj.position}
          end={corePosition}
          active={obj.connected && obj.visible}
          intensity={obj.currentValue}
        />
      ))}

      <ControllableObject state={objects[0]} isSelected={selectedId === objects[0].id} onSelect={onSelect}>
        <Cube color={objects[0].color} />
      </ControllableObject>

      <ControllableObject state={objects[1]} isSelected={selectedId === objects[1].id} onSelect={onSelect}>
        <Sphere color={objects[1].color} />
      </ControllableObject>

      <ControllableObject state={objects[2]} isSelected={selectedId === objects[2].id} onSelect={onSelect}>
        <Cylinder color={objects[2].color} />
      </ControllableObject>

      <CoreCore core={core} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      <CameraController preset={cameraPreset} />
      <OrbitControls makeDefault />
    </>
  )
}

export default function App() {
  const [objects, setObjects] = useState<ObjectState[]>(initialObjects)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cameraPresetIndex, setCameraPresetIndex] = useState(0)
  const [core, setCore] = useState<CoreState>(initialCore)
  const [system, setSystem] = useState<SystemState>(initialSystem)

  const updateSimulation = useCallback(() => {
    if (system.result !== 'running') return

    setObjects((prevNodes) => {
      return prevNodes.map((node) => {
        if (!node.connected || !node.visible) {
          return { ...node, currentValue: 0 }
        }

        const config = levelConfig[node.level]
        let newValue = config.output

        const time = Date.now() / 1000
        const fluctuation = Math.sin(time * node.fluctuationSpeed + node.phase) * node.fluctuationAmplitude
        newValue += fluctuation

        if (node.peakLimited) {
          newValue = Math.min(newValue, 1.2)
        }

        if (node.bufferMode) {
          newValue *= 0.7
        }

        const stability = 0.5 + Math.random() * 0.5
        newValue *= stability

        return {
          ...node,
          currentValue: Math.max(0, Math.min(2, newValue)),
          stability: node.bufferMode ? Math.min(1, node.stability + 0.01) : Math.max(0.3, node.stability - 0.005),
        }
      })
    })

    setObjects((currentNodes) => {
      const connectedNodes = currentNodes.filter((n) => n.connected && n.visible)
      const totalOutput = connectedNodes.reduce((sum, n) => sum + n.currentValue, 0)
      const stableCount = connectedNodes.filter((n) => n.stability > 0.7).length

      setCore((prevCore) => {
        const newLoad = totalOutput
        const isOverloaded = newLoad > prevCore.overloadThreshold
        const isSafe = newLoad < prevCore.safeThreshold

        let newTimeInSafeZone = prevCore.timeInSafeZone
        let newTimeInOverload = prevCore.timeInOverload
        let newBufferTime = prevCore.bufferTimeRemaining
        let newStatus: CoreState['status'] = 'normal'

        if (isSafe) {
          newTimeInSafeZone += 0.016
          newTimeInOverload = 0
        } else if (isOverloaded) {
          newTimeInOverload += 0.016
          newTimeInSafeZone = 0
          if (newBufferTime > 0) {
            newBufferTime = Math.max(0, newBufferTime - 0.016)
          }
        } else {
          newTimeInSafeZone = Math.max(0, newTimeInSafeZone - 0.008)
          newTimeInOverload = Math.max(0, newTimeInOverload - 0.008)
        }

        if (newLoad > prevCore.overloadThreshold) {
          newStatus = 'critical'
        } else if (newLoad > prevCore.safeThreshold) {
          newStatus = 'warning'
        }

        return {
          ...prevCore,
          currentLoad: newLoad,
          timeInSafeZone: newTimeInSafeZone,
          timeInOverload: newTimeInOverload,
          bufferTimeRemaining: newBufferTime,
          status: newStatus,
        }
      })

      return currentNodes
    })
  }, [system.result])

  useEffect(() => {
    if (system.result !== 'running') return

    const interval = setInterval(updateSimulation, 16)
    return () => clearInterval(interval)
  }, [system.result, updateSimulation])

  useEffect(() => {
    if (system.result !== 'running') return

    const checkResult = () => {
      if (core.timeInSafeZone >= system.successTimeRequired) {
        setSystem((prev) => ({ ...prev, result: 'success' }))
        setCore((prev) => ({ ...prev, status: 'success' }))
      } else if (core.timeInOverload >= system.overloadTimeLimit && core.bufferTimeRemaining <= 0) {
        setSystem((prev) => ({
          ...prev,
          result: 'failed',
          failReason: '持续过载导致系统崩溃',
        }))
        setCore((prev) => ({ ...prev, status: 'failed' }))
      }
    }

    checkResult()
  }, [
    core.timeInSafeZone,
    core.timeInOverload,
    core.bufferTimeRemaining,
    system.result,
    system.successTimeRequired,
    system.overloadTimeLimit,
  ])

  useEffect(() => {
    if (system.result !== 'running') return

    const connectedNodes = objects.filter((n) => n.connected && n.visible)
    const totalOutput = connectedNodes.reduce((sum, n) => sum + n.currentValue, 0)
    const stableCount = connectedNodes.filter((n) => n.stability > 0.7).length

    setSystem((prev) => ({
      ...prev,
      totalLoad: totalOutput,
      stableNodes: stableCount,
      isOverloaded: core.currentLoad > core.overloadThreshold,
      bufferTimeRemaining: core.bufferTimeRemaining,
    }))
  }, [objects, core, system.result])

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const handleToggleVisibility = (id: string) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, visible: !obj.visible } : obj)))
  }

  const handleChangeColor = (id: string, color: string) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, color } : obj)))
  }

  const handleChangeScale = (id: string, scale: number) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, scale } : obj)))
  }

  const handleChangeLevel = (id: string, level: EnergyLevel) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, level } : obj)))
  }

  const handleToggleConnection = (id: string) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, connected: !obj.connected, currentValue: 0 } : obj)),
    )
  }

  const handleToggleBuffer = (id: string) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, bufferMode: !obj.bufferMode } : obj)))
  }

  const handleTogglePeakLimit = (id: string) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, peakLimited: !obj.peakLimited } : obj)))
  }

  return (
    <div className="object-control-container">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3, 10] }} className="object-control-canvas">
        <Scene
          objects={objects}
          selectedId={selectedId}
          onSelect={handleSelect}
          cameraPreset={cameraPresets[cameraPresetIndex]}
          core={core}
        />
      </Canvas>
      <ControlPanel
        objects={objects}
        selectedId={selectedId}
        onSelect={handleSelect}
        onToggleVisibility={handleToggleVisibility}
        onChangeColor={handleChangeColor}
        onChangeScale={handleChangeScale}
        onChangeLevel={handleChangeLevel}
        onToggleConnection={handleToggleConnection}
        onToggleBuffer={handleToggleBuffer}
        onTogglePeakLimit={handleTogglePeakLimit}
        cameraPreset={cameraPresetIndex}
        onChangeCameraPreset={setCameraPresetIndex}
        system={system}
        core={core}
      />
    </div>
  )
}
