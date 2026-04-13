import { OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'

// 对象状态类型
type ObjectState = {
  id: string
  name: string
  visible: boolean
  color: string
  scale: number
  position: [number, number, number]
}

// 相机预设视角类型
type CameraPreset = {
  name: string
  position: [number, number, number]
  target: [number, number, number]
}

// 相机预设视角
const cameraPresets: CameraPreset[] = [
  { name: '正视图', position: [0, 0, 7], target: [0, 0, 0] },
  { name: '俯视图', position: [0, 8, 0], target: [0, 0, 0] },
  { name: '斜侧等距视角', position: [5, 5, 5], target: [0, 0, 0] },
]

// 可选颜色列表
const colorOptions = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe']

// 3D 对象组件
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
      {/* 选中时的高亮边框 */}
      {isSelected && (
        <mesh scale={1.1}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshBasicMaterial color="#ffd700" wireframe transparent opacity={0.8} />
        </mesh>
      )}
      {/* 悬停效果 */}
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

// 立方体对象
function Cube({ color }: { color: string }) {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 球体对象
function Sphere({ color }: { color: string }) {
  return (
    <mesh>
      <sphereGeometry args={[0.6, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 圆柱体对象
function Cylinder({ color }: { color: string }) {
  return (
    <mesh>
      <cylinderGeometry args={[0.4, 0.4, 1.2, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

// 相机控制组件
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

// 控制面板组件
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

// 主场景组件
function Scene({
  objects,
  selectedId,
  onSelect,
  cameraPreset,
}: {
  objects: ObjectState[]
  selectedId: string | null
  onSelect: (id: string) => void
  cameraPreset: CameraPreset
}) {
  return (
    <>
      <color attach="background" args={['#f0f0f0']} />
      <ambientLight intensity={Math.PI * 0.5} />
      <pointLight decay={0} position={[10, 10, 10]} />
      <pointLight decay={0} position={[-10, -10, -10]} color="#4ecdc4" />

      <ControllableObject
        id={objects[0].id}
        state={objects[0]}
        isSelected={selectedId === objects[0].id}
        onSelect={onSelect}>
        <Cube color={objects[0].color} />
      </ControllableObject>

      <ControllableObject
        id={objects[1].id}
        state={objects[1]}
        isSelected={selectedId === objects[1].id}
        onSelect={onSelect}>
        <Sphere color={objects[1].color} />
      </ControllableObject>

      <ControllableObject
        id={objects[2].id}
        state={objects[2]}
        isSelected={selectedId === objects[2].id}
        onSelect={onSelect}>
        <Cylinder color={objects[2].color} />
      </ControllableObject>

      {/* 地面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      <CameraController preset={cameraPreset} />
      <OrbitControls makeDefault />
    </>
  )
}

// 主应用组件
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cameraPresetIndex, setCameraPresetIndex] = useState(0)

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

  return (
    <div className="object-control-container">
      <Canvas dpr={[1, 2]} camera={{ position: [0, 3, 7] }} className="object-control-canvas">
        <Scene
          objects={objects}
          selectedId={selectedId}
          onSelect={handleSelect}
          cameraPreset={cameraPresets[cameraPresetIndex]}
        />
      </Canvas>
      <ControlPanel
        objects={objects}
        selectedId={selectedId}
        onSelect={handleSelect}
        onToggleVisibility={handleToggleVisibility}
        onChangeColor={handleChangeColor}
        onChangeScale={handleChangeScale}
        cameraPreset={cameraPresetIndex}
        onChangeCameraPreset={setCameraPresetIndex}
      />
    </div>
  )
}
