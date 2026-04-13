import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'

type RiskLevel = 'high' | 'medium' | 'low'

interface Annotation {
  id: string
  position: [number, number, number]
  title: string
  riskLevel: RiskLevel
  description: string
  resolved: boolean
}

const initialAnnotations: Annotation[] = [
  {
    id: '1',
    position: [-1.8, 1.2, 0],
    title: '结构焊缝开裂',
    riskLevel: 'high',
    description: '主支撑梁右侧焊缝出现3.5cm开裂，存在结构失效风险。建议立即停止使用并进行焊接修复。',
    resolved: false,
  },
  {
    id: '2',
    position: [1.5, -0.8, 0.5],
    title: '液压管路渗漏',
    riskLevel: 'high',
    description: '二号液压接头处存在油液渗漏，已观察到油滴形成。需更换密封件并加压测试。',
    resolved: false,
  },
  {
    id: '3',
    position: [0, 1.8, -1],
    title: '传感器偏移',
    riskLevel: 'medium',
    description: '温度传感器校准值偏差约8%，读数可靠性受影响。建议重新校准并检查安装固定。',
    resolved: false,
  },
  {
    id: '4',
    position: [-1.2, -1.5, 1],
    title: '防护罩松动',
    riskLevel: 'low',
    description: '底部安全防护罩固定螺丝有一颗缺失。存在异物进入风险，需补充螺丝紧固。',
    resolved: true,
  },
  {
    id: '5',
    position: [2, 0.5, -0.5],
    title: '电缆磨损',
    riskLevel: 'medium',
    description: '主电缆通过转角处外皮有磨损痕迹，约2cm长度。建议加装护套管保护。',
    resolved: false,
  },
]

const riskColors: Record<RiskLevel, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

const riskLabels: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

function AnnotationPoint({
  annotation,
  isExpanded,
  onToggleExpand,
  onToggleResolve,
}: {
  annotation: Annotation
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  onToggleResolve: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    const time = state.clock.elapsedTime
    meshRef.current.position.y = annotation.position[1] + Math.sin(time * 2 + Number(annotation.id)) * 0.05
    ringRef.current.rotation.z = time * 2
  })

  const scale = isExpanded ? 1.4 : hovered ? 1.2 : 1
  const baseColor = annotation.resolved ? '#9ca3af' : riskColors[annotation.riskLevel]

  return (
    <group position={[annotation.position[0], 0, annotation.position[2]]}>
      <mesh ref={ringRef} position={[0, annotation.position[1], 0]} scale={scale}>
        <ringGeometry args={[0.15, 0.22, 32]} />
        <meshBasicMaterial color={baseColor} transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      <mesh
        ref={meshRef}
        position={[0, annotation.position[1], 0]}
        scale={scale}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onToggleExpand(annotation.id)
        }}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color={baseColor} />
      </mesh>

      {isExpanded && (
        <group position={[0, annotation.position[1] + 0.5, 0]}>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.8, 0.8]} />
            <meshBasicMaterial color="#1f2937" transparent opacity={0.95} />
          </mesh>
        </group>
      )}

      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                annotation.position[0],
                annotation.position[1],
                annotation.position[2],
                annotation.position[0],
                annotation.position[1] + 0.8,
                annotation.position[2],
              ]),
              3,
            ]}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={baseColor} opacity={0.4} transparent />
      </line>
    </group>
  )
}

function FloatingBox({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
    </mesh>
  )
}

function SceneContent({
  annotations,
  expandedId,
  onToggleExpand,
  onToggleResolve,
  filter,
  showResolved,
}: {
  annotations: Annotation[]
  expandedId: string | null
  onToggleExpand: (id: string) => void
  onToggleResolve: (id: string) => void
  filter: RiskLevel | 'all'
  showResolved: boolean
}) {
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((a) => {
      const matchFilter = filter === 'all' || a.riskLevel === filter
      const matchResolved = showResolved || !a.resolved
      return matchFilter && matchResolved
    })
  }, [annotations, filter, showResolved])

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      <gridHelper args={[10, 20, '#374151', '#1f2937']} position={[0, -2, 0]} />

      <FloatingBox position={[-1.5, 0, 0]} color="#3b82f6" />
      <FloatingBox position={[1.5, 0.5, -0.5]} color="#8b5cf6" />
      <FloatingBox position={[0, -0.5, 1]} color="#06b6d4" />
      <FloatingBox position={[-0.5, 1, -1]} color="#ec4899" />

      {filteredAnnotations.map((annotation) => (
        <AnnotationPoint
          key={annotation.id}
          annotation={annotation}
          isExpanded={expandedId === annotation.id}
          onToggleExpand={onToggleExpand}
          onToggleResolve={onToggleResolve}
        />
      ))}
    </>
  )
}

function ControlPanel({
  annotations,
  expandedId,
  onToggleExpand,
  onToggleResolve,
  filter,
  setFilter,
  showResolved,
  setShowResolved,
}: {
  annotations: Annotation[]
  expandedId: string | null
  onToggleExpand: (id: string) => void
  onToggleResolve: (id: string) => void
  filter: RiskLevel | 'all'
  setFilter: (f: RiskLevel | 'all') => void
  showResolved: boolean
  setShowResolved: (v: boolean) => void
}) {
  const totalCount = annotations.length
  const unresolvedCount = annotations.filter((a) => !a.resolved).length
  const highRiskCount = annotations.filter((a) => a.riskLevel === 'high' && !a.resolved).length
  const allHighRiskResolved = annotations.filter((a) => a.riskLevel === 'high').every((a) => a.resolved)

  const filteredAnnotations = annotations.filter((a) => {
    const matchFilter = filter === 'all' || a.riskLevel === filter
    const matchResolved = showResolved || !a.resolved
    return matchFilter && matchResolved
  })

  return (
    <div className="inspection-panel">
      <div className="panel-header">
        <h2>场景检视面板</h2>
        {allHighRiskResolved && highRiskCount === 0 && (
          <div className="completion-badge">
            <span className="check-icon">✓</span>
            检视完成
          </div>
        )}
      </div>

      <div className="status-section">
        <h3>检视状态</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">标注总数</span>
            <span className="status-value total">{totalCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">未处理</span>
            <span className="status-value pending">{unresolvedCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">高风险</span>
            <span className="status-value high-risk">{highRiskCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">当前筛选</span>
            <span className="status-value filter">{filter === 'all' ? '全部' : riskLabels[filter]}</span>
          </div>
        </div>

        {!allHighRiskResolved && (
          <div className="warning-alert">
            <span className="warning-icon">⚠️</span>
            存在未处理的高风险标注，请优先处理
          </div>
        )}

        {allHighRiskResolved && (
          <div className="success-alert">
            <span className="success-icon">🎉</span>
            所有高风险标注已处理完毕！
          </div>
        )}
      </div>

      <div className="filter-section">
        <h3>筛选控制</h3>
        <div className="filter-buttons">
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''} ${f}`} onClick={() => setFilter(f)}>
              {f === 'all' ? '全部' : riskLabels[f]}
            </button>
          ))}
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          显示已处理项
        </label>
      </div>

      <div className="annotations-section">
        <h3>标注列表 ({filteredAnnotations.length})</h3>
        <div className="annotation-list">
          {filteredAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              className={`annotation-card ${expandedId === annotation.id ? 'expanded' : ''} ${
                annotation.resolved ? 'resolved' : ''
              }`}
              onClick={() => onToggleExpand(annotation.id)}>
              <div className="annotation-header">
                <span className={`risk-indicator ${annotation.riskLevel}`}></span>
                <span className="annotation-title">{annotation.title}</span>
                <button
                  className={`resolve-btn ${annotation.resolved ? 'resolved' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleResolve(annotation.id)
                  }}>
                  {annotation.resolved ? '已处理' : '未处理'}
                </button>
              </div>
              {expandedId === annotation.id && (
                <div className="annotation-detail">
                  <p className="annotation-desc">{annotation.description}</p>
                  <div className="annotation-meta">
                    <span className={`risk-badge ${annotation.riskLevel}`}>{riskLabels[annotation.riskLevel]}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [showResolved, setShowResolved] = useState(true)

  const onToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  const onToggleResolve = useCallback((id: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: !a.resolved } : a)))
  }, [])

  return (
    <div className="inspection-container">
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }} style={{ background: '#111827' }}>
        <SceneContent
          annotations={annotations}
          expandedId={expandedId}
          onToggleExpand={onToggleExpand}
          onToggleResolve={onToggleResolve}
          filter={filter}
          showResolved={showResolved}
        />
        <OrbitControls enableDamping dampingFactor={0.05} makeDefault />
      </Canvas>
      <ControlPanel
        annotations={annotations}
        expandedId={expandedId}
        onToggleExpand={onToggleExpand}
        onToggleResolve={onToggleResolve}
        filter={filter}
        setFilter={setFilter}
        showResolved={showResolved}
        setShowResolved={setShowResolved}
      />
    </div>
  )
}
