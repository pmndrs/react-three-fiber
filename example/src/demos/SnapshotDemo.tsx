import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import {
  useSnapshot,
  SnapshotPlayer,
  TimelinePanel,
  AnimationTrack,
  Keyframe,
  downloadSnapshotConfig,
  uploadSnapshotConfig,
} from '@react-three/fiber'

function RotatingBox({ position, color }: { position: [number, number, number]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function SnapshotDemo() {
  const {
    snapshots,
    currentSnapshot,
    isRecording,
    capture,
    restore,
    delete: deleteSnapshot,
    clear,
    startRecording,
    stopRecording,
    addKeyframe,
    exportConfig,
    importConfig,
    listSnapshots,
  } = useSnapshot()

  const { camera } = useThree()
  const [animation, setAnimation] = useState<AnimationTrack | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null)

  const handleCapture = useCallback(() => {
    const id = capture(`Snapshot ${snapshots.size + 1}`)
    console.log('Captured snapshot:', id)
  }, [capture, snapshots.size])

  const handleRestore = useCallback(
    (id: string) => {
      restore(id, {
        restoreCamera: true,
        restoreObjects: true,
        restoreMaterials: true,
      })
    },
    [restore],
  )

  const handleStartRecording = useCallback(() => {
    startRecording()
    addKeyframe('Start')
  }, [startRecording, addKeyframe])

  const handleStopRecording = useCallback(() => {
    const keyframes = stopRecording()
    if (keyframes.length > 0) {
      setAnimation({
        id: `animation-${Date.now()}`,
        name: 'Recorded Animation',
        keyframes,
        duration: Math.max(...keyframes.map((k) => k.time)),
        loop: true,
        loopCount: 0,
      })
    }
  }, [stopRecording])

  const handleAddKeyframe = useCallback(() => {
    addKeyframe(`Keyframe ${Date.now()}`)
  }, [addKeyframe])

  const handleExport = useCallback(() => {
    const config = exportConfig()
    downloadSnapshotConfig(config, 'scene-snapshot.json')
  }, [exportConfig])

  const handleImport = useCallback(async () => {
    try {
      const config = await uploadSnapshotConfig()
      importConfig(config)
      if (config.animations.length > 0) {
        setAnimation(config.animations[0])
      }
    } catch (error) {
      console.error('Failed to import config:', error)
    }
  }, [importConfig])

  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev)
  }, [])

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const handleKeyframeDelete = useCallback(
    (id: string) => {
      if (animation) {
        const newKeyframes = animation.keyframes.filter((k) => k.id !== id)
        setAnimation({
          ...animation,
          keyframes: newKeyframes,
          duration: newKeyframes.length > 0 ? Math.max(...newKeyframes.map((k) => k.time)) : 0,
        })
      }
      if (selectedKeyframeId === id) {
        setSelectedKeyframeId(null)
      }
    },
    [animation, selectedKeyframeId],
  )

  const handleKeyframeMove = useCallback(
    (id: string, newTime: number) => {
      if (animation) {
        const newKeyframes = animation.keyframes
          .map((k) => (k.id === id ? { ...k, time: Math.max(0, newTime) } : k))
          .sort((a, b) => a.time - b.time)
        setAnimation({
          ...animation,
          keyframes: newKeyframes,
          duration: Math.max(...newKeyframes.map((k) => k.time)),
        })
      }
    },
    [animation],
  )

  const snapshotList = listSnapshots()

  return (
    <>
      <RotatingBox position={[-1.5, 0, 0]} color="orange" />
      <RotatingBox position={[0, 0, 0]} color="hotpink" />
      <RotatingBox position={[1.5, 0, 0]} color="aquamarine" />

      {animation && (
        <SnapshotPlayer
          animation={animation}
          playing={playing}
          currentTime={currentTime}
          loop={animation.loop}
          onTimeUpdate={setCurrentTime}
          onComplete={() => setPlaying(false)}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '16px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          maxWidth: '300px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Snapshot Controls</h3>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleCapture} style={buttonStyle}>
            📷 Capture
          </button>
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            style={{
              ...buttonStyle,
              backgroundColor: isRecording ? '#e94560' : '#2a2a4a',
            }}
          >
            {isRecording ? '⏹ Stop' : '⏺ Record'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={buttonStyle}>
            📤 Export
          </button>
          <button onClick={handleImport} style={buttonStyle}>
            📥 Import
          </button>
          <button onClick={clear} style={{ ...buttonStyle, backgroundColor: '#e94560' }}>
            🗑 Clear All
          </button>
        </div>

        {snapshotList.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Snapshots ({snapshotList.length})</h4>
            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {snapshotList.map((snap) => (
                <div
                  key={snap.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    backgroundColor: currentSnapshot?.timestamp === snap.timestamp ? '#3a3a5a' : '#2a2a4a',
                    borderRadius: '4px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{ cursor: 'pointer', flex: 1 }}
                    onClick={() => handleRestore(snap.id)}
                  >
                    {snap.name || `Snapshot ${snap.id.slice(0, 8)}`}
                  </span>
                  <button
                    onClick={() => deleteSnapshot(snap.id)}
                    style={{
                      ...buttonStyle,
                      padding: '2px 6px',
                      fontSize: '12px',
                      backgroundColor: 'transparent',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isRecording && (
          <div style={{ marginBottom: '12px' }}>
            <button onClick={handleAddKeyframe} style={buttonStyle}>
              + Add Keyframe
            </button>
          </div>
        )}
      </div>

      {animation && animation.keyframes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <TimelinePanel
            animation={animation}
            currentTime={currentTime}
            playing={playing}
            onTimeChange={handleTimeChange}
            onPlayPause={handlePlayPause}
            onKeyframeAdd={handleAddKeyframe}
            onKeyframeDelete={handleKeyframeDelete}
            onKeyframeMove={handleKeyframeMove}
            onKeyframeSelect={setSelectedKeyframeId}
            selectedKeyframeId={selectedKeyframeId}
          />
        </div>
      )}
    </>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: '#2a2a4a',
  border: 'none',
  borderRadius: '4px',
  color: 'white',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'background-color 0.15s ease',
}

export default function App() {
  return (
    <Canvas shadows camera={{ position: [0, 2, 5], fov: 75 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <pointLight position={[-5, -5, -5]} intensity={0.5} />

      <SnapshotDemo />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </Canvas>
  )
}
