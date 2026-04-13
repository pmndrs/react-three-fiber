import { OrbitControls, Text, Billboard } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useState, useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

type RiskLevel = 'high' | 'medium' | 'low'

type Annotation = {
  id: string
  title: string
  riskLevel: RiskLevel
  description: string
  position: [number, number, number]
  isProcessed: boolean
  details: string
  createdAt: string
}

type FilterCondition = 'all' | 'high' | 'medium' | 'low'

type ObjectState = {
  id: string
  name: string
  visible: boolean
  color: string
  scale: number
  position: [number, number, number]
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

const riskColors: Record<RiskLevel, string> = {
  high: '#ff4444',
  medium: '#ffaa00',
  low: '#44aa44',
}

const riskLabels: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

const initialAnnotations: Annotation[] = [
  {
    id: 'anno-1',
    title: '结构裂纹检测',
    riskLevel: 'high',
    description: '在建筑主体结构发现明显裂纹，需要立即评估',
    position: [-2.5, 1.5, 0],
    isProcessed: false,
    details: '裂纹长度约 15cm，宽度 2mm，建议进行结构加固处理。该区域需要专业工程师进行详细评估。',
    createdAt: '2024-01-15 09:30',
  },
  {
    id: 'anno-2',
    title: '电气线路隐患',
    riskLevel: 'high',
    description: '配电箱附近发现裸露电线，存在触电风险',
    position: [2, 2, 1.5],
    isProcessed: false,
    details: '发现 3 处电线绝缘层破损，需要立即更换。建议在维修完成前设置警示标识。',
    createdAt: '2024-01-15 10:15',
  },
  {
    id: 'anno-3',
    title: '消防通道阻塞',
    riskLevel: 'medium',
    description: '西侧消防通道被杂物占用，影响紧急疏散',
    position: [0, 0.5, 2.5],
    isProcessed: false,
    details: '消防通道宽度被占用约 60%，需要清理杂物。建议在 24 小时内完成整改。',
    createdAt: '2024-01-15 11:00',
  },
  {
    id: 'anno-4',
    title: '照明设备老化',
    riskLevel: 'low',
    description: '部分照明设备亮度不足，建议更换',
    position: [-1, 3, -1.5],
    isProcessed: false,
    details: '约 30% 的照明设备存在亮度衰减，建议在下个维护周期统一更换为 LED 节能灯具。',
    createdAt: '2024-01-15 14:20',
  },
  {
    id: 'anno-5',
    title: '管道泄漏风险',
    riskLevel: 'medium',
    description: '供水管道接口处有渗水痕迹',
    position: [1.5, -0.5, -2],
    isProcessed: false,
    details: '管道接口处发现轻微渗水，建议在 48 小时内进行检修，防止问题扩大。',
    createdAt: '2024-01-15 15:45',
  },
]

function ControllableObject({
  id,
  state,
  isSelected,
  onSelect,
  children,
}: {
  id: string
  state: ObjectState
  isSelected: boolean
  onSelect: (id: string) => void
  children: React.ReactNode
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.setScalar(state.scale)
    }
  }, [state.scale])

  if (!state.visible) return null

  return (
    <group
      ref={groupRef}
      position={state.position}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}>
      {isSelected && (
        <mesh scale={1.1}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#ffd700" wireframe transparent opacity={0.8} />
        </mesh>
      )}
      {hovered && !isSelected && (
        <mesh scale={1.05}>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
        </mesh>
      )}
      {children}
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

function AnnotationMarker({
  annotation,
  isSelected,
  onSelect,
  isFiltered,
}: {
  annotation: Annotation
  isSelected: boolean
  onSelect: (id: string) => void
  isFiltered: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (ringRef.current && !annotation.isProcessed) {
      const ring = ringRef.current
      let angle = 0
      const animate = () => {
        angle += 0.02
        ring.rotation.z = angle
        requestAnimationFrame(animate)
      }
      const animationId = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationId)
    }
  }, [annotation.isProcessed])

  if (isFiltered) return null

  const baseColor = riskColors[annotation.riskLevel]
  const opacity = annotation.isProcessed ? 0.4 : 1

  return (
    <group position={annotation.position}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group
          onClick={(e) => {
            e.stopPropagation()
            onSelect(annotation.id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}>
          {!annotation.isProcessed && (
            <mesh ref={ringRef} position={[0, 0, -0.01]}>
              <ringGeometry args={[0.5, 0.6, 32]} />
              <meshBasicMaterial color={baseColor} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          )}

          <mesh>
            <circleGeometry args={[0.4, 32]} />
            <meshBasicMaterial color={baseColor} transparent opacity={opacity} />
          </mesh>

          {isSelected && (
            <mesh position={[0, 0, -0.02]}>
              <ringGeometry args={[0.45, 0.55, 32]} />
              <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
            </mesh>
          )}

          {hovered && !isSelected && (
            <mesh position={[0, 0, -0.02]}>
              <ringGeometry args={[0.42, 0.52, 32]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
          )}

          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.15, 32]} />
            <meshBasicMaterial color={annotation.isProcessed ? '#888888' : '#ffffff'} />
          </mesh>

          {annotation.isProcessed && (
            <Text
              position={[0, 0, 0.02]}
              fontSize={0.2}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              font={undefined}>
              ✓
            </Text>
          )}
        </group>

        <Text
          position={[0, 0.7, 0]}
          fontSize={0.18}
          color={annotation.isProcessed ? '#888888' : '#ffffff'}
          anchorX="center"
          anchorY="bottom"
          maxWidth={2}
          font={undefined}>
          {annotation.title}
        </Text>

        <Text
          position={[0, 0.5, 0]}
          fontSize={0.12}
          color={annotation.isProcessed ? '#666666' : baseColor}
          anchorX="center"
          anchorY="top"
          font={undefined}>
          {riskLabels[annotation.riskLevel]}
        </Text>
      </Billboard>
    </group>
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
  cameraPreset,
  onChangeCameraPreset,
}: {
  objects: ObjectState[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleVisibility: (id: string) => void
  onChangeColor: (id: string, color: string) => void
  onChangeScale: (id: string, scale: number) => void
  cameraPreset: number
  onChangeCameraPreset: (index: number) => void
}) {
  const selectedObject = objects.find((obj) => obj.id === selectedId)

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3>对象列表</h3>
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
        <h3>选中对象信息</h3>
        {selectedObject ? (
          <div className="info-grid">
            <div className="info-item">
              <label>名称:</label>
              <span>{selectedObject.name}</span>
            </div>
            <div className="info-item">
              <label>状态:</label>
              <span>{selectedObject.visible ? '显示' : '隐藏'}</span>
            </div>
            <div className="info-item">
              <label>颜色:</label>
              <span className="color-preview" style={{ backgroundColor: selectedObject.color }} />
            </div>
            <div className="info-item">
              <label>缩放:</label>
              <span>{selectedObject.scale.toFixed(2)}x</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">请从上方列表选择一个对象查看详细信息</div>
        )}
      </div>

      {selectedObject && (
        <div className="panel-section">
          <h3>对象控制</h3>

          <div className="control-group">
            <label>显示/隐藏</label>
            <button
              className={`toggle-btn ${selectedObject.visible ? 'active' : ''}`}
              onClick={() => onToggleVisibility(selectedObject.id)}>
              {selectedObject.visible ? '隐藏对象' : '显示对象'}
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

function InspectionStatusPanel({
  annotations,
  filterCondition,
  hideProcessed,
  onChangeFilter,
  onToggleHideProcessed,
}: {
  annotations: Annotation[]
  filterCondition: FilterCondition
  hideProcessed: boolean
  onChangeFilter: (filter: FilterCondition) => void
  onToggleHideProcessed: () => void
}) {
  const totalCount = annotations.length
  const unprocessedCount = annotations.filter((a) => !a.isProcessed).length
  const highRiskCount = annotations.filter((a) => a.riskLevel === 'high' && !a.isProcessed).length
  const processedCount = annotations.filter((a) => a.isProcessed).length

  const allHighRiskProcessed = annotations.filter((a) => a.riskLevel === 'high').every((a) => a.isProcessed)
  const hasHighRisk = annotations.some((a) => a.riskLevel === 'high')

  return (
    <div className="inspection-status-panel">
      <div className="status-header">
        <h2>场景标注检视</h2>
        {allHighRiskProcessed && hasHighRisk && (
          <div className="completion-badge">
            <span className="check-icon">✓</span>
            <span>所有高风险标注已处理完成</span>
          </div>
        )}
        {!allHighRiskProcessed && hasHighRisk && highRiskCount > 0 && (
          <div className="warning-badge">
            <span className="warning-icon">⚠</span>
            <span>仍有 {highRiskCount} 个高风险标注未处理</span>
          </div>
        )}
      </div>

      <div className="status-metrics">
        <div className="metric-card">
          <div className="metric-value">{totalCount}</div>
          <div className="metric-label">标注总数</div>
        </div>
        <div className="metric-card">
          <div className="metric-value unprocessed">{unprocessedCount}</div>
          <div className="metric-label">未处理</div>
        </div>
        <div className="metric-card">
          <div className="metric-value high-risk">{highRiskCount}</div>
          <div className="metric-label">高风险</div>
        </div>
        <div className="metric-card">
          <div className="metric-value processed">{processedCount}</div>
          <div className="metric-label">已处理</div>
        </div>
      </div>

      <div className="filter-section">
        <h3>筛选条件</h3>
        <div className="filter-buttons">
          {(['all', 'high', 'medium', 'low'] as FilterCondition[]).map((filter) => (
            <button
              key={filter}
              className={`filter-btn ${filterCondition === filter ? 'active' : ''}`}
              onClick={() => onChangeFilter(filter)}>
              {filter === 'all' ? '全部' : riskLabels[filter]}
            </button>
          ))}
        </div>

        <label className="hide-processed-toggle">
          <input type="checkbox" checked={hideProcessed} onChange={onToggleHideProcessed} />
          <span>隐藏已处理标注</span>
        </label>
      </div>
    </div>
  )
}

function AnnotationDetailPanel({
  annotation,
  onClose,
  onToggleProcessed,
}: {
  annotation: Annotation | null
  onClose: () => void
  onToggleProcessed: (id: string) => void
}) {
  if (!annotation) return null

  return (
    <div className="annotation-detail-panel">
      <div className="detail-header">
        <h3>{annotation.title}</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-row">
          <span className="detail-label">风险等级</span>
          <span className={`risk-badge ${annotation.riskLevel}`}>{riskLabels[annotation.riskLevel]}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">处理状态</span>
          <span className={`status-badge ${annotation.isProcessed ? 'processed' : 'unprocessed'}`}>
            {annotation.isProcessed ? '已处理' : '未处理'}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">创建时间</span>
          <span className="detail-value">{annotation.createdAt}</span>
        </div>

        <div className="detail-section">
          <span className="detail-label">问题描述</span>
          <p className="detail-text">{annotation.description}</p>
        </div>

        <div className="detail-section">
          <span className="detail-label">详细说明</span>
          <p className="detail-text">{annotation.details}</p>
        </div>

        <div className="detail-section">
          <span className="detail-label">位置坐标</span>
          <p className="detail-text">
            X: {annotation.position[0].toFixed(2)}, Y: {annotation.position[1].toFixed(2)}, Z:
            {annotation.position[2].toFixed(2)}
          </p>
        </div>
      </div>

      <div className="detail-actions">
        <button
          className={`action-btn ${annotation.isProcessed ? 'unprocess' : 'process'}`}
          onClick={() => onToggleProcessed(annotation.id)}>
          {annotation.isProcessed ? '标记为未处理' : '标记为已处理'}
        </button>
      </div>
    </div>
  )
}

function AnnotationListPanel({
  annotations,
  selectedId,
  onSelect,
  filterCondition,
  hideProcessed,
}: {
  annotations: Annotation[]
  selectedId: string | null
  onSelect: (id: string) => void
  filterCondition: FilterCondition
  hideProcessed: boolean
}) {
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((anno) => {
      if (hideProcessed && anno.isProcessed) return false
      if (filterCondition !== 'all' && anno.riskLevel !== filterCondition) return false
      return true
    })
  }, [annotations, filterCondition, hideProcessed])

  return (
    <div className="annotation-list-panel">
      <h3>标注列表</h3>
      <div className="annotation-list">
        {filteredAnnotations.length === 0 ? (
          <div className="empty-list">没有符合条件的标注</div>
        ) : (
          filteredAnnotations.map((anno) => (
            <div
              key={anno.id}
              className={`annotation-item ${selectedId === anno.id ? 'selected' : ''} ${
                anno.isProcessed ? 'processed' : ''
              }`}
              onClick={() => onSelect(anno.id)}>
              <div className="item-header">
                <span className={`risk-indicator ${anno.riskLevel}`} />
                <span className="item-title">{anno.title}</span>
                {anno.isProcessed && <span className="processed-tag">已处理</span>}
              </div>
              <div className="item-description">{anno.description}</div>
              <div className="item-meta">
                <span className={`risk-label ${anno.riskLevel}`}>{riskLabels[anno.riskLevel]}</span>
                <span className="time-label">{anno.createdAt}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Scene({
  objects,
  selectedObjectId,
  onObjectSelect,
  annotations,
  selectedAnnotationId,
  onAnnotationSelect,
  cameraPreset,
  filterCondition,
  hideProcessed,
}: {
  objects: ObjectState[]
  selectedObjectId: string | null
  onObjectSelect: (id: string) => void
  annotations: Annotation[]
  selectedAnnotationId: string | null
  onAnnotationSelect: (id: string) => void
  cameraPreset: CameraPreset
  filterCondition: FilterCondition
  hideProcessed: boolean
}) {
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((anno) => {
      if (hideProcessed && anno.isProcessed) return false
      if (filterCondition !== 'all' && anno.riskLevel !== filterCondition) return false
      return true
    })
  }, [annotations, filterCondition, hideProcessed])

  return (
    <>
      <color attach="background" args={['#f0f0f0']} />
      <ambientLight intensity={Math.PI * 0.5} />
      <pointLight decay={0} position={[10, 10, 10]} />
      <pointLight decay={0} position={[-10, -10, -10]} color="#4ecdc4" />

      <ControllableObject
        id={objects[0].id}
        state={objects[0]}
        isSelected={selectedObjectId === objects[0].id}
        onSelect={onObjectSelect}>
        <Cube color={objects[0].color} />
      </ControllableObject>

      <ControllableObject
        id={objects[1].id}
        state={objects[1]}
        isSelected={selectedObjectId === objects[1].id}
        onSelect={onObjectSelect}>
        <Sphere color={objects[1].color} />
      </ControllableObject>

      <ControllableObject
        id={objects[2].id}
        state={objects[2]}
        isSelected={selectedObjectId === objects[2].id}
        onSelect={onObjectSelect}>
        <Cylinder color={objects[2].color} />
      </ControllableObject>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {annotations.map((anno) => (
        <AnnotationMarker
          key={anno.id}
          annotation={anno}
          isSelected={selectedAnnotationId === anno.id}
          onSelect={onAnnotationSelect}
          isFiltered={!filteredAnnotations.find((a) => a.id === anno.id)}
        />
      ))}

      <CameraController preset={cameraPreset} />
      <OrbitControls makeDefault />
    </>
  )
}

export default function App() {
  const [objects, setObjects] = useState<ObjectState[]>([
    {
      id: 'cube',
      name: '立方体',
      visible: true,
      color: '#ff6b6b',
      scale: 1,
      position: [-2, 0, 0],
    },
    {
      id: 'sphere',
      name: '球体',
      visible: true,
      color: '#4ecdc4',
      scale: 1,
      position: [0, 0, 0],
    },
    {
      id: 'cylinder',
      name: '圆柱体',
      visible: true,
      color: '#45b7d1',
      scale: 1,
      position: [2, 0, 0],
    },
  ])

  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>(null)
  const [cameraPresetIndex, setCameraPresetIndex] = useState(0)
  const [filterCondition, setFilterCondition] = useState<FilterCondition>('all')
  const [hideProcessed, setHideProcessed] = useState(false)

  const handleObjectSelect = (id: string) => {
    setSelectedObjectId(id)
    setSelectedAnnotationId(null)
  }

  const handleAnnotationSelect = (id: string) => {
    setSelectedAnnotationId(id)
    setSelectedObjectId(null)
    setExpandedAnnotationId(id)
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

  const handleToggleProcessed = (id: string) => {
    setAnnotations((prev) => prev.map((anno) => (anno.id === id ? { ...anno, isProcessed: !anno.isProcessed } : anno)))
  }

  const handleChangeFilter = (filter: FilterCondition) => {
    setFilterCondition(filter)
  }

  const handleToggleHideProcessed = () => {
    setHideProcessed((prev) => !prev)
  }

  const handleCloseDetail = () => {
    setExpandedAnnotationId(null)
  }

  const expandedAnnotation = annotations.find((a) => a.id === expandedAnnotationId) || null

  return (
    <div className="object-control-container">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3, 7] }} className="object-control-canvas">
        <Scene
          objects={objects}
          selectedObjectId={selectedObjectId}
          onObjectSelect={handleObjectSelect}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationSelect={handleAnnotationSelect}
          cameraPreset={cameraPresets[cameraPresetIndex]}
          filterCondition={filterCondition}
          hideProcessed={hideProcessed}
        />
      </Canvas>

      <ControlPanel
        objects={objects}
        selectedId={selectedObjectId}
        onSelect={handleObjectSelect}
        onToggleVisibility={handleToggleVisibility}
        onChangeColor={handleChangeColor}
        onChangeScale={handleChangeScale}
        cameraPreset={cameraPresetIndex}
        onChangeCameraPreset={setCameraPresetIndex}
      />

      <InspectionStatusPanel
        annotations={annotations}
        filterCondition={filterCondition}
        hideProcessed={hideProcessed}
        onChangeFilter={handleChangeFilter}
        onToggleHideProcessed={handleToggleHideProcessed}
      />

      <AnnotationListPanel
        annotations={annotations}
        selectedId={selectedAnnotationId}
        onSelect={handleAnnotationSelect}
        filterCondition={filterCondition}
        hideProcessed={hideProcessed}
      />

      {expandedAnnotation && (
        <AnnotationDetailPanel
          annotation={expandedAnnotation}
          onClose={handleCloseDetail}
          onToggleProcessed={handleToggleProcessed}
        />
      )}
    </div>
  )
}
