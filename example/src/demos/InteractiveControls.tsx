import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']

interface ObjectState {
  id: string
  name: string
  position: [number, number, number]
  visible: boolean
  color: string
  scale: number
}

const initialObjects: ObjectState[] = [
  { id: 'box', name: '立方体', position: [-2, 0, 0] },
  { id: 'sphere', name: '球体', position: [0, 0, 0] },
  { id: 'torus', name: '圆环', position: [2, 0, 0] },
].map((obj) => ({ ...obj, visible: true, color: COLORS[Math.floor(Math.random() * COLORS.length)], scale: 1 }))

function Object3D({
  state,
  isSelected,
  onSelect,
}: {
  state: ObjectState
  isSelected: boolean
  onSelect: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  const handleClick = (e: any) => {
    e.stopPropagation()
    onSelect(state.id)
  }

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    setHovered(true)
  }

  const handlePointerOut = () => {
    setHovered(false)
  }

  const geometry = useMemo(() => {
    switch (state.id) {
      case 'box':
        return new THREE.BoxGeometry(1, 1, 1)
      case 'sphere':
        return new THREE.SphereGeometry(0.6, 32, 32)
      case 'torus':
        return new THREE.TorusGeometry(0.5, 0.2, 16, 100)
      default:
        return new THREE.BoxGeometry(1, 1, 1)
    }
  }, [state.id])

  const materialColor = isSelected ? '#ffeb3b' : state.color

  return (
    <mesh
      ref={meshRef}
      visible={state.visible}
      position={state.position}
      scale={[state.scale, state.scale, state.scale]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      geometry={geometry}
    >
      <meshStandardMaterial
        color={materialColor}
        emissive={isSelected ? '#ff9800' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
        roughness={0.5}
        metalness={0.2}
      />
    </mesh>
  )
}

function Scene({
  objects,
  selectedId,
  onSelect,
  cameraPosition,
}: {
  objects: ObjectState[]
  selectedId: string | null
  onSelect: (id: string) => void
  cameraPosition: [number, number, number]
}) {
  const { camera } = useThree()

  useFrame(() => {
    camera.position.lerp(new THREE.Vector3(...cameraPosition), 0.1)
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#4ecdc4" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      {objects.map((obj) => (
        <Object3D
          key={obj.id}
          state={obj}
          isSelected={selectedId === obj.id}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}

function ControlPanel({
  objects,
  selectedId,
  onSelect,
  onUpdateObject,
  onCameraPreset,
}: {
  objects: ObjectState[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdateObject: (id: string, updates: Partial<ObjectState>) => void
  onCameraPreset: (preset: string) => void
}) {
  const selectedObject = objects.find((obj) => obj.id === selectedId)

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '320px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '12px',
        padding: '20px',
        color: 'white',
        fontFamily: "'Inter var', sans-serif",
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 600 }}>对象控制面板</h2>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#aaa' }}>选择对象</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {objects.map((obj) => (
            <button
              key={obj.id}
              onClick={() => onSelect(obj.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: selectedId === obj.id ? '2px solid #ff6b6b' : '2px solid transparent',
                background: selectedId === obj.id ? '#ff6b6b' : '#333',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              {obj.name}
            </button>
          ))}
        </div>
      </div>

      {selectedObject ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#aaa' }}>对象信息</h3>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#aaa' }}>名称: </span>
                <span>{selectedObject.name}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#aaa' }}>显示状态: </span>
                <span style={{ color: selectedObject.visible ? '#4ecdc4' : '#ff6b6b' }}>
                  {selectedObject.visible ? '可见' : '隐藏'}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#aaa' }}>当前颜色: </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    background: selectedObject.color,
                    borderRadius: '4px',
                    verticalAlign: 'middle',
                    marginRight: '8px',
                  }}
                />
                <span>{selectedObject.color}</span>
              </div>
              <div>
                <span style={{ color: '#aaa' }}>当前缩放: </span>
                <span>{selectedObject.scale.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#aaa' }}>控制</h3>

            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => onUpdateObject(selectedObject.id, { visible: !selectedObject.visible })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedObject.visible ? '#ff6b6b' : '#4ecdc4',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                {selectedObject.visible ? '隐藏对象' : '显示对象'}
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                颜色切换
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdateObject(selectedObject.id, { color })}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: selectedObject.color === color ? '3px solid white' : 'none',
                      background: color,
                      cursor: 'pointer',
                      boxShadow: selectedObject.color === color ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#aaa' }}>
                缩放调整: {selectedObject.scale.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={selectedObject.scale}
                onChange={(e) => onUpdateObject(selectedObject.id, { scale: parseFloat(e.target.value) })}
                style={{
                  width: '100%',
                  accentColor: '#ff6b6b',
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '24px 12px',
              textAlign: 'center',
              color: '#aaa',
            }}
          >
            <div style={{ marginBottom: '8px' }}>请从上方选择一个对象</div>
            <div style={{ fontSize: '12px' }}>点击按钮或直接在场景中点击对象</div>
          </div>
        </div>
      )}

      <div>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#aaa' }}>相机视角</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onCameraPreset('front')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#333',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            正面
          </button>
          <button
            onClick={() => onCameraPreset('isometric')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#333',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            斜侧等距
          </button>
          <button
            onClick={() => onCameraPreset('top')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#333',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            俯视
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [objects, setObjects] = useState<ObjectState[]>(initialObjects)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 2, 6])

  const handleUpdateObject = (id: string, updates: Partial<ObjectState>) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj)))
  }

  const handleCameraPreset = (preset: string) => {
    switch (preset) {
      case 'front':
        setCameraPosition([0, 2, 6])
        break
      case 'isometric':
        setCameraPosition([5, 4, 5])
        break
      case 'top':
        setCameraPosition([0, 6, 0.1])
        break
    }
  }

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas 
        style={{ background: '#1a1a2e' }}
        onClick={(e) => {
          if (e.object === null) {
            setSelectedId(null)
          }
        }}
      >
        <Scene
          objects={objects}
          selectedId={selectedId}
          onSelect={setSelectedId}
          cameraPosition={cameraPosition}
        />
      </Canvas>
      <ControlPanel
        objects={objects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onUpdateObject={handleUpdateObject}
        onCameraPreset={handleCameraPreset}
      />
    </div>
  )
}
