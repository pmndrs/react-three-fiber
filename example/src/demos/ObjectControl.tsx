import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { create } from 'zustand'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

type ObjectId = 'box' | 'sphere' | 'torus'

interface ObjectState {
  visible: boolean
  color: string
  scale: number
}

interface StoreState {
  selectedObject: ObjectId | null
  objects: Record<ObjectId, ObjectState>
  cameraPreset: number
  setSelectedObject: (id: ObjectId | null) => void
  setObjectVisible: (id: ObjectId, visible: boolean) => void
  setObjectColor: (id: ObjectId, color: string) => void
  setObjectScale: (id: ObjectId, scale: number) => void
  setCameraPreset: (preset: number) => void
}

const useStore = create<StoreState>((set) => ({
  selectedObject: null,
  objects: {
    box: { visible: true, color: '#4fc3f7', scale: 1 },
    sphere: { visible: true, color: '#81c784', scale: 1 },
    torus: { visible: true, color: '#ffb74d', scale: 1 },
  },
  cameraPreset: 0,
  setSelectedObject: (id) => set({ selectedObject: id }),
  setObjectVisible: (id, visible) =>
    set((state) => ({
      objects: { ...state.objects, [id]: { ...state.objects[id], visible } },
    })),
  setObjectColor: (id, color) =>
    set((state) => ({
      objects: { ...state.objects, [id]: { ...state.objects[id], color } },
    })),
  setObjectScale: (id, scale) =>
    set((state) => ({
      objects: { ...state.objects, [id]: { ...state.objects[id], scale } },
    })),
  setCameraPreset: (preset) => set({ cameraPreset: preset }),
}))

const CAMERA_PRESETS = [
  { position: [0, 0, 10] as [number, number, number], name: '正视图' },
  { position: [0, 10, 0] as [number, number, number], name: '俯视图' },
  { position: [5, 5, 5] as [number, number, number], name: '斜侧等距视角' },
]

const COLOR_OPTIONS = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292', '#ba68c8', '#ff8a65', '#4db6ac', '#aed581']

const OBJECT_NAMES: Record<ObjectId, string> = {
  box: '立方体',
  sphere: '球体',
  torus: '圆环',
}

function CameraController() {
  const { camera } = useThree()
  const cameraPreset = useStore((state) => state.cameraPreset)
  const targetPosition = useRef(new THREE.Vector3(...CAMERA_PRESETS[0].position))
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    targetPosition.current.set(...CAMERA_PRESETS[cameraPreset].position)
  }, [cameraPreset])

  useFrame(() => {
    camera.position.lerp(targetPosition.current, 0.05)
    camera.lookAt(0, 0, 0)
  })

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} />
}

function SelectableObject({
  id,
  geometry,
  position,
}: {
  id: ObjectId
  geometry: React.ReactNode
  position: [number, number, number]
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const selectedObject = useStore((state) => state.selectedObject)
  const objectState = useStore((state) => state.objects[id])
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const isSelected = selectedObject === id
  const targetScaleVec = useRef(new THREE.Vector3(1, 1, 1))

  useFrame(() => {
    if (meshRef.current) {
      const targetScale = objectState.scale * (isSelected ? 1.15 : 1)
      targetScaleVec.current.set(targetScale, targetScale, targetScale)
      meshRef.current.scale.lerp(targetScaleVec.current, 0.1)
    }
  })

  if (!objectState.visible) return null

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedObject(isSelected ? null : id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}>
      {geometry}
      <meshStandardMaterial
        color={objectState.color}
        emissive={isSelected ? '#ffffff' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[meshRef.current?.geometry]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8888ff" />
      <SelectableObject id="box" position={[-2, 0, 0]} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <SelectableObject id="sphere" position={[0, 0, 0]} geometry={<sphereGeometry args={[0.6, 32, 32]} />} />
      <SelectableObject id="torus" position={[2, 0, 0]} geometry={<torusGeometry args={[0.5, 0.2, 16, 32]} />} />
      <gridHelper args={[10, 10, '#444444', '#333333']} />
      <CameraController />
    </>
  )
}

function ControlPanel() {
  const selectedObject = useStore((state) => state.selectedObject)
  const objects = useStore((state) => state.objects)
  const setSelectedObject = useStore((state) => state.setSelectedObject)
  const setObjectVisible = useStore((state) => state.setObjectVisible)
  const setObjectColor = useStore((state) => state.setObjectColor)
  const setObjectScale = useStore((state) => state.setObjectScale)
  const setCameraPreset = useStore((state) => state.setCameraPreset)
  const cameraPreset = useStore((state) => state.cameraPreset)

  const objectIds: ObjectId[] = ['box', 'sphere', 'torus']

  return (
    <div className="control-panel">
      <div className="panel-section">
        <h3 className="panel-title">对象选择</h3>
        <div className="object-buttons">
          {objectIds.map((id) => (
            <button
              key={id}
              className={`object-btn ${selectedObject === id ? 'selected' : ''}`}
              onClick={() => setSelectedObject(selectedObject === id ? null : id)}
              style={{
                borderColor: selectedObject === id ? objects[id].color : 'transparent',
                backgroundColor: selectedObject === id ? `${objects[id].color}22` : 'transparent',
              }}>
              {OBJECT_NAMES[id]}
            </button>
          ))}
        </div>
      </div>

      {selectedObject && (
        <div className="panel-section">
          <h3 className="panel-title">对象控制</h3>
          <div className="control-group">
            <label className="control-label">显示/隐藏</label>
            <button
              className={`toggle-btn ${objects[selectedObject].visible ? 'active' : ''}`}
              onClick={() => setObjectVisible(selectedObject, !objects[selectedObject].visible)}>
              {objects[selectedObject].visible ? '隐藏' : '显示'}
            </button>
          </div>

          <div className="control-group">
            <label className="control-label">颜色</label>
            <div className="color-grid">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  className={`color-btn ${objects[selectedObject].color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setObjectColor(selectedObject, color)}
                />
              ))}
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">缩放: {objects[selectedObject].scale.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={objects[selectedObject].scale}
              onChange={(e) => setObjectScale(selectedObject, parseFloat(e.target.value))}
              className="scale-slider"
            />
          </div>
        </div>
      )}

      <div className="panel-section">
        <h3 className="panel-title">相机视角</h3>
        <div className="camera-buttons">
          {CAMERA_PRESETS.map((preset, index) => (
            <button
              key={index}
              className={`camera-btn ${cameraPreset === index ? 'active' : ''}`}
              onClick={() => setCameraPreset(index)}>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">对象信息</h3>
        {selectedObject ? (
          <div className="info-display">
            <div className="info-row">
              <span className="info-label">名称:</span>
              <span className="info-value">{OBJECT_NAMES[selectedObject]}</span>
            </div>
            <div className="info-row">
              <span className="info-label">显示:</span>
              <span className={`info-value status ${objects[selectedObject].visible ? 'visible' : 'hidden'}`}>
                {objects[selectedObject].visible ? '可见' : '隐藏'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">颜色:</span>
              <span className="info-value color-display">
                <span className="color-preview" style={{ backgroundColor: objects[selectedObject].color }} />
                {objects[selectedObject].color}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">缩放:</span>
              <span className="info-value">{objects[selectedObject].scale.toFixed(1)}x</span>
            </div>
          </div>
        ) : (
          <div className="info-empty">点击场景中的对象或使用上方按钮选择</div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }} style={{ background: '#1a1a2e' }}>
        <Scene />
      </Canvas>
      <ControlPanel />
    </div>
  )
}
