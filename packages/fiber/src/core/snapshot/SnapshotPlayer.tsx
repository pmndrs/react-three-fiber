import * as React from 'react'
import { createPortal } from 'react-dom'
import type { Snapshot, AnimationSequence, PlaybackOptions } from './types'
import { useAnimationPlayer } from './useAnimationPlayer'
import { useThree } from '../hooks'

export interface SnapshotPlayerProps {
  snapshots: Snapshot[]
  sequence?: AnimationSequence
  autoPlay?: boolean
  loop?: boolean
  playbackSpeed?: number
  showControls?: boolean
  showTimeline?: boolean
  showSnapshotList?: boolean
  position?: 'top' | 'bottom'
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onSeek?: (time: number) => void
  onComplete?: () => void
}

export const SnapshotPlayer: React.FC<SnapshotPlayerProps> = ({
  snapshots,
  sequence,
  autoPlay = false,
  loop = false,
  playbackSpeed = 1,
  showControls = true,
  showTimeline = true,
  showSnapshotList = false,
  position = 'bottom',
  onPlay,
  onPause,
  onStop,
  onSeek,
  onComplete,
}) => {
  const { gl } = useThree()
  const player = useAnimationPlayer(snapshots, sequence, {
    autoPlay,
    loop,
    playbackSpeed,
    onPlay,
    onPause,
    onStop,
    onSeek,
    onComplete,
  })

  const [portalRoot, setPortalRoot] = React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = gl.domElement.parentElement
    if (!container) return

    let root = container.querySelector<HTMLDivElement>('.r3f-snapshot-player-root')
    if (!root) {
      root = document.createElement('div')
      root.className = 'r3f-snapshot-player-root'
      root.style.position = 'absolute'
      root.style.top = '0'
      root.style.left = '0'
      root.style.width = '100%'
      root.style.height = '100%'
      root.style.pointerEvents = 'none'
      root.style.zIndex = '99'
      container.appendChild(root)
    }
    setPortalRoot(root)

    return () => {
      if (root && root.childElementCount === 0) {
        root.remove()
      }
    }
  }, [gl])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!portalRoot || snapshots.length < 2) return null

  const playerContent = (
    <div
      style={{
        position: 'absolute',
        [position]: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '12px',
        padding: '16px 20px',
        width: '90%',
        maxWidth: '600px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            🎬 Animation Player
          </span>
          <span
            style={{
              fontSize: '12px',
              color: '#aaa',
              background: '#333',
              padding: '2px 8px',
              borderRadius: '4px',
            }}
          >
            {snapshots.length} snapshots
          </span>
        </div>
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {formatTime(player.currentTime)} / {formatTime(player.duration)}
        </span>
      </div>

      {showTimeline && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              position: 'relative',
              height: '8px',
              background: '#333',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                background: '#4a90d9',
                width: `${(player.currentTime / player.duration) * 100}%`,
                transition: 'width 0.1s linear',
              }}
            />
            <input
              type="range"
              min={0}
              max={player.duration}
              step={0.01}
              value={player.currentTime}
              onChange={(e) => player.seek(parseFloat(e.target.value))}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                margin: 0,
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              position: 'relative',
              height: '20px',
            }}
          >
            {snapshots.map((snapshot, index) => {
              const keyframeTime = (index / (snapshots.length - 1)) * player.duration
              return (
                <div
                  key={snapshot.id}
                  style={{
                    position: 'absolute',
                    left: `${(index / (snapshots.length - 1)) * 100}%`,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      background: player.currentTime >= keyframeTime ? '#4a90d9' : '#555',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onClick={() => player.seek(keyframeTime)}
                    title={snapshot.name}
                  />
                  {showSnapshotList && (
                    <span
                      style={{
                        fontSize: '10px',
                        color: '#888',
                        marginTop: '4px',
                        whiteSpace: 'nowrap',
                        maxWidth: '60px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {snapshot.name}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={() => player.seek(0)}
            style={{
              padding: '8px 12px',
              background: '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title="Go to start"
          >
            ⏮️
          </button>

          <button
            onClick={() => player.isPlaying ? player.pause() : player.play()}
            style={{
              padding: '10px 24px',
              background: '#4a90d9',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              minWidth: '80px',
            }}
          >
            {player.isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>

          <button
            onClick={player.stop}
            style={{
              padding: '8px 12px',
              background: '#333',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title="Stop"
          >
            ⏹️
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '12px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#aaa' }}>Speed:</span>
            <select
              value={player.playbackSpeed}
              onChange={(e) => player.setPlaybackSpeed(parseFloat(e.target.value))}
              style={{
                padding: '4px 8px',
                background: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#aaa',
            }}
          >
            <input
              type="checkbox"
              checked={player.loop}
              onChange={(e) => player.setLoop(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Loop
          </label>
        </div>
      )}
    </div>
  )

  return createPortal(playerContent, portalRoot)
}
