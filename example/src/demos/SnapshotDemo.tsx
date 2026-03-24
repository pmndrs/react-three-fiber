import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  SnapshotProvider,
  useSnapshot,
  SnapshotPlayer,
  SnapshotTimeline,
  SnapshotComparer,
  exportSnapshotsToFile,
  importSnapshotsFromFile,
} from '@react-three/fiber'
import * as THREE from 'three'

// ============================================================================
// Demo Scene Components
// ============================================================================

function AnimatedCube({ color, position }: { color: string; position: [number, number, number] }) {
  const meshRef = React.useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function Scene() {
  const [cubeColor, setCubeColor] = React.useState('#3b82f6')
  const [cubePosition, setCubePosition] = React.useState<[number, number, number]>([0, 0, 0])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />

      <AnimatedCube color={cubeColor} position={cubePosition} />

      <mesh position={[-3, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>

      <mesh position={[3, 0, 0]}>
        <coneGeometry args={[0.8, 1.5, 32]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>

      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </>
  )
}

// ============================================================================
// Snapshot Demo UI
// ============================================================================

function SnapshotDemoUI() {
  const {
    snapshots,
    currentSnapshot,
    capture,
    apply,
    remove,
    exportToJSON,
    importFromJSON,
    sequences,
    createSequence,
    play,
    stop,
    isPlaying,
  } = useSnapshot()

  const [showComparer, setShowComparer] = React.useState(false)
  const [compareSnapshotA, setCompareSnapshotA] = React.useState<string | null>(null)
  const [compareSnapshotB, setCompareSnapshotB] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleExport = () => {
    if (currentSnapshot) {
      const data = exportToJSON(currentSnapshot.id)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `snapshot-${currentSnapshot.id.slice(0, 8)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleExportAll = () => {
    exportSnapshotsToFile(snapshots, 'all-snapshots.json')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importSnapshotsFromFile(file).then((imported) => {
        imported.forEach((snapshot) => {
          importFromJSON(JSON.stringify(snapshot))
        })
      })
    }
  }

  const handleCreateSequence = () => {
    if (snapshots.length >= 2) {
      const keyframes = snapshots.slice(0, 3).map((s, i) => ({
        snapshotId: s.id,
        time: i * 2000,
        duration: 1000,
        easing: 'easeInOutQuad' as const,
      }))
      createSequence(`Sequence ${sequences.length + 1}`, keyframes)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '400px',
      }}
    >
      {/* Snapshot Player */}
      <SnapshotPlayer />

      {/* Snapshot Timeline */}
      {sequences.length > 0 && <SnapshotTimeline height={80} />}

      {/* Advanced Controls */}
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '16px',
          color: '#fff',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Advanced Controls</h4>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button
            onClick={handleExport}
            disabled={!currentSnapshot}
            style={{
              padding: '6px 12px',
              background: currentSnapshot ? '#3b82f6' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: currentSnapshot ? 'pointer' : 'not-allowed',
              fontSize: '12px',
            }}
          >
            Export Current
          </button>
          <button
            onClick={handleExportAll}
            disabled={snapshots.length === 0}
            style={{
              padding: '6px 12px',
              background: snapshots.length > 0 ? '#3b82f6' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: snapshots.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '12px',
            }}
          >
            Export All
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '6px 12px',
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Import
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button
            onClick={handleCreateSequence}
            disabled={snapshots.length < 2}
            style={{
              padding: '6px 12px',
              background: snapshots.length >= 2 ? '#8b5cf6' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: snapshots.length >= 2 ? 'pointer' : 'not-allowed',
              fontSize: '12px',
            }}
          >
            Create Sequence
          </button>
          <button
            onClick={() => setShowComparer(!showComparer)}
            disabled={snapshots.length < 2}
            style={{
              padding: '6px 12px',
              background: snapshots.length >= 2 ? '#f59e0b' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: snapshots.length >= 2 ? 'pointer' : 'not-allowed',
              fontSize: '12px',
            }}
          >
            Compare
          </button>
        </div>

        {/* Sequences List */}
        {sequences.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>Sequences</h5>
            {sequences.map((seq) => (
              <div
                key={seq.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  background: '#2a2a2a',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '12px' }}>{seq.name}</span>
                <button
                  onClick={() => play(seq.id)}
                  style={{
                    padding: '4px 8px',
                    background: '#22c55e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  Play
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot Comparer */}
      {showComparer && snapshots.length >= 2 && (
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: '8px',
            padding: '16px',
            color: '#fff',
          }}
        >
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Compare Snapshots</h4>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#888' }}>Snapshot A:</label>
            <select
              value={compareSnapshotA || ''}
              onChange={(e) => setCompareSnapshotA(e.target.value || null)}
              style={{
                width: '100%',
                padding: '6px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                marginTop: '4px',
              }}
            >
              <option value="">Select...</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state.metadata?.name || s.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#888' }}>Snapshot B:</label>
            <select
              value={compareSnapshotB || ''}
              onChange={(e) => setCompareSnapshotB(e.target.value || null)}
              style={{
                width: '100%',
                padding: '6px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                marginTop: '4px',
              }}
            >
              <option value="">Select...</option>
              {snapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.state.metadata?.name || s.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {compareSnapshotA && compareSnapshotB && (
            <SnapshotComparer
              snapshotA={snapshots.find((s) => s.id === compareSnapshotA)!}
              snapshotB={snapshots.find((s) => s.id === compareSnapshotB)!}
            />
          )}
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '16px',
          color: '#888',
          fontSize: '12px',
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '14px' }}>How to use:</h4>
        <ol style={{ margin: 0, paddingLeft: '16px' }}>
          <li>Click "Capture" to save the current scene state</li>
          <li>Modify the scene (move camera, change colors, etc.)</li>
          <li>Capture another snapshot</li>
          <li>Click on snapshots to restore them</li>
          <li>Create sequences to animate between snapshots</li>
          <li>Use Export/Import to save and share snapshots</li>
        </ol>
      </div>
    </div>
  )
}

// ============================================================================
// Main Demo Component
// ============================================================================

export default function SnapshotDemo() {
  return (
    <SnapshotProvider maxSnapshots={20}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          style={{ background: '#111' }}
        >
          <Scene />
        </Canvas>
        <SnapshotDemoUI />
      </div>
    </SnapshotProvider>
  )
}
