import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { Suspense, useEffect, useReducer, useState, useMemo, useCallback, useRef } from 'react'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'

// 风险等级类型
type RiskLevel = 'high' | 'medium' | 'low'

// 标注点数据接口
interface AnnotationPoint {
  id: string
  title: string
  riskLevel: RiskLevel
  description: string
  position: [number, number, number]
  processed: boolean
}

// 初始标注数据
const initialAnnotations: AnnotationPoint[] = [
  {
    id: '1',
    title: '引擎过热',
    riskLevel: 'high',
    description: '左引擎温度超过正常范围，需要立即检查冷却系统',
    position: [-0.8, 0.5, 0.2],
    processed: false,
  },
  {
    id: '2',
    title: '液压泄漏',
    riskLevel: 'high',
    description: '主液压系统发现轻微泄漏，建议更换密封件',
    position: [0.6, 0.3, -0.3],
    processed: false,
  },
  {
    id: '3',
    title: '轮胎磨损',
    riskLevel: 'medium',
    description: '前起落架轮胎磨损程度达到70%，建议下次维护时更换',
    position: [0.2, -0.8, 0.5],
    processed: false,
  },
  {
    id: '4',
    title: '通讯天线',
    riskLevel: 'low',
    description: '通讯天线外观检查正常，信号强度良好',
    position: [-0.3, 1.2, -0.5],
    processed: true,
  },
]

// 风险等级配置
const riskConfig: Record<RiskLevel, { color: string; bgColor: string; label: string }> = {
  high: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)', label: '高风险' },
  medium: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)', label: '中风险' },
  low: { color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.2)', label: '低风险' },
}

// 3D场景中的标注点组件
function AnnotationMarker({
  point,
  isSelected,
  isVisible,
  onClick,
}: {
  point: AnnotationPoint
  isSelected: boolean
  isVisible: boolean
  onClick: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const config = riskConfig[point.riskLevel]

  useFrame((state) => {
    if (ref.current && !point.processed) {
      ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1)
    }
  })

  if (!isVisible) return null

  return (
    <group position={point.position}>
      <mesh ref={ref} onClick={onClick}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={point.processed ? '#6b7280' : config.color}
          transparent
          opacity={point.processed ? 0.5 : 0.9}
        />
      </mesh>
      {!point.processed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.15, 32]} />
          <meshBasicMaterial color={config.color} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, -point.position[1], 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={config.color} transparent opacity={0.3} />
      </line>
      <Html distanceFactor={10} position={[0.15, 0.15, 0]} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            background: point.processed ? 'rgba(107, 114, 128, 0.9)' : config.bgColor,
            border: `2px solid ${point.processed ? '#6b7280' : config.color}`,
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: point.processed ? '#fff' : config.color,
            whiteSpace: 'nowrap',
            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            transition: 'all 0.2s ease',
            boxShadow: isSelected ? `0 0 10px ${config.color}` : 'none',
          }}>
          {point.processed && '✓ '}
          {point.title}
        </div>
      </Html>
    </group>
  )
}

// 原有的模型切换组件
function ModelSwitcher() {
  const [flag, toggle] = useReducer((state) => !state, true)
  const { scene } = useLoader(GLTFLoader, flag ? '/Stork.glb' : '/Parrot.glb')

  useEffect(() => {
    const interval = setInterval(toggle, 1000)
    return () => clearInterval(interval)
  }, [])

  return <primitive object={scene} />
}

// 详情面板组件
function DetailPanel({
  point,
  onToggleProcessed,
  onClose,
}: {
  point: AnnotationPoint | null
  onToggleProcessed: (id: string) => void
  onClose: () => void
}) {
  if (!point) {
    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          minWidth: '280px',
        }}>
        <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>点击场景中的标注点查看详情</p>
      </div>
    )
  }

  const config = riskConfig[point.riskLevel]

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '300px',
        borderLeft: `4px solid ${config.color}`,
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>{point.title}</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          ×
        </button>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            background: config.bgColor,
            color: config.color,
          }}>
          {config.label}
        </span>
        {point.processed && (
          <span
            style={{
              display: 'inline-block',
              marginLeft: '8px',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
            }}>
            已处理
          </span>
        )}
      </div>
      <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6', margin: '0 0 16px 0' }}>{point.description}</p>
      <button
        onClick={() => onToggleProcessed(point.id)}
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: '8px',
          border: 'none',
          background: point.processed ? '#f59e0b' : '#10b981',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}>
        {point.processed ? '标记为未处理' : '标记为已处理'}
      </button>
    </div>
  )
}

// 统计面板组件
function StatsPanel({
  annotations,
  filter,
  showProcessed,
  onFilterChange,
  onToggleShowProcessed,
}: {
  annotations: AnnotationPoint[]
  filter: RiskLevel | 'all'
  showProcessed: boolean
  onFilterChange: (filter: RiskLevel | 'all') => void
  onToggleShowProcessed: () => void
}) {
  const stats = useMemo(() => {
    const total = annotations.length
    const unprocessed = annotations.filter((a) => !a.processed).length
    const highRisk = annotations.filter((a) => a.riskLevel === 'high' && !a.processed).length
    const allHighRiskProcessed = annotations.filter((a) => a.riskLevel === 'high').every((a) => a.processed)
    return { total, unprocessed, highRisk, allHighRiskProcessed }
  }, [annotations])

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '280px',
      }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#1f2937' }}>检视状态</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div style={{ textAlign: 'center', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#374151' }}>{stats.total}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>标注总数</div>
        </div>
        <div style={{ textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706' }}>{stats.unprocessed}</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>未处理</div>
        </div>
        <div
          style={{
            textAlign: 'center',
            padding: '12px',
            background: stats.highRisk > 0 ? '#fee2e2' : '#d1fae5',
            borderRadius: '8px',
          }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: stats.highRisk > 0 ? '#dc2626' : '#059669' }}>
            {stats.highRisk}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>高风险</div>
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
          风险等级筛选
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'high', 'medium', 'low'] as const).map((level) => (
            <button
              key={level}
              onClick={() => onFilterChange(level)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '12px',
                cursor: 'pointer',
                background: filter === level ? '#3b82f6' : '#e5e7eb',
                color: filter === level ? 'white' : '#374151',
              }}>
              {level === 'all' ? '全部' : riskConfig[level as RiskLevel].label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
          }}>
          <input
            type="checkbox"
            checked={showProcessed}
            onChange={onToggleShowProcessed}
            style={{ cursor: 'pointer' }}
          />
          显示已处理项
        </label>
      </div>
      <div
        style={{
          padding: '16px',
          borderRadius: '8px',
          textAlign: 'center',
          background: stats.allHighRiskProcessed ? '#d1fae5' : '#fee2e2',
          border: `2px solid ${stats.allHighRiskProcessed ? '#10b981' : '#ef4444'}`,
        }}>
        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stats.allHighRiskProcessed ? '✅' : '⚠️'}</div>
        <div
          style={{ fontSize: '14px', fontWeight: 'bold', color: stats.allHighRiskProcessed ? '#059669' : '#dc2626' }}>
          {stats.allHighRiskProcessed ? '检视完成' : '存在未处理高风险项'}
        </div>
        {stats.allHighRiskProcessed && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>所有高风险标注已处理完毕</div>
        )}
      </div>
    </div>
  )
}

// 标注列表面板
function AnnotationList({
  annotations,
  selectedId,
  filter,
  showProcessed,
  onSelect,
  onToggleProcessed,
}: {
  annotations: AnnotationPoint[]
  selectedId: string | null
  filter: RiskLevel | 'all'
  showProcessed: boolean
  onSelect: (id: string) => void
  onToggleProcessed: (id: string) => void
}) {
  const filteredAnnotations = annotations.filter((a) => {
    if (filter !== 'all' && a.riskLevel !== filter) return false
    if (!showProcessed && a.processed) return false
    return true
  })

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        minWidth: '280px',
        maxHeight: '300px',
        overflow: 'auto',
      }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1f2937' }}>标注列表</h3>
      {filteredAnnotations.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', margin: '20px 0' }}>暂无符合条件的标注</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredAnnotations.map((point) => {
            const config = riskConfig[point.riskLevel]
            const isSelected = selectedId === point.id
            return (
              <div
                key={point.id}
                onClick={() => onSelect(point.id)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : point.processed ? '#f9fafb' : 'white',
                  border: `2px solid ${isSelected ? '#3b82f6' : point.processed ? '#e5e7eb' : config.color}`,
                  opacity: point.processed ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {point.processed && <span style={{ color: '#10b981' }}>✓</span>}
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>{point.title}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: config.bgColor,
                      color: config.color,
                    }}>
                    {config.label}
                  </span>
                </div>
                {isSelected && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                      {point.description}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleProcessed(point.id)
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: point.processed ? '#f59e0b' : '#10b981',
                        color: 'white',
                      }}>
                      {point.processed ? '标记未处理' : '标记已处理'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 主应用组件
export default function App() {
  const [annotations, setAnnotations] = useState<AnnotationPoint[]>(initialAnnotations)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all')
  const [showProcessed, setShowProcessed] = useState(true)

  const selectedPoint = annotations.find((a) => a.id === selectedId) || null

  const handleToggleProcessed = useCallback((id: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, processed: !a.processed } : a)))
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <Canvas camera={{ position: [3, 2, 4], fov: 50 }} style={{ background: '#1a1a2e' }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <Suspense fallback={null}>
          <ModelSwitcher />
        </Suspense>
        {annotations.map((point) => {
          const isVisible = (filter === 'all' || point.riskLevel === filter) && (showProcessed || !point.processed)
          return (
            <AnnotationMarker
              key={point.id}
              point={point}
              isSelected={selectedId === point.id}
              isVisible={isVisible}
              onClick={() => setSelectedId(selectedId === point.id ? null : point.id)}
            />
          )
        })}
        <OrbitControls makeDefault />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: 'calc(100vh - 40px)',
          overflow: 'auto',
        }}>
        <StatsPanel
          annotations={annotations}
          filter={filter}
          showProcessed={showProcessed}
          onFilterChange={setFilter}
          onToggleShowProcessed={() => setShowProcessed(!showProcessed)}
        />
        <DetailPanel
          point={selectedPoint}
          onToggleProcessed={handleToggleProcessed}
          onClose={() => setSelectedId(null)}
        />
        <AnnotationList
          annotations={annotations}
          selectedId={selectedId}
          filter={filter}
          showProcessed={showProcessed}
          onSelect={setSelectedId}
          onToggleProcessed={handleToggleProcessed}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
        场景标注检视系统
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '12px',
        }}>
        左键旋转视角 | 右键平移 | 滚轮缩放 | 点击标注点查看详情
      </div>
    </div>
  )
}
