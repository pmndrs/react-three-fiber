import * as React from 'react'
import { AnimationTrack, Keyframe, TimelinePanelProps, TimelineProps } from './types'

const TIMELINE_HEIGHT = 60
const KEYFRAME_SIZE = 12
const TRACK_HEIGHT = 40
const HEADER_WIDTH = 150
const TIME_MARKER_HEIGHT = 24

interface TimelineStyles {
  container: React.CSSProperties
  header: React.CSSProperties
  trackContainer: React.CSSProperties
  track: React.CSSProperties
  trackLabel: React.CSSProperties
  timeline: React.CSSProperties
  timeMarkers: React.CSSProperties
  timeMarker: React.CSSProperties
  keyframeTrack: React.CSSProperties
  keyframe: React.CSSProperties
  keyframeSelected: React.CSSProperties
  playhead: React.CSSProperties
  controls: React.CSSProperties
  button: React.CSSProperties
  buttonActive: React.CSSProperties
  timeDisplay: React.CSSProperties
  speedControl: React.CSSProperties
}

const styles: TimelineStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '12px',
    color: '#e0e0e0',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #2a2a4a',
    gap: '8px',
  },
  trackContainer: {
    display: 'flex',
    maxHeight: '200px',
    overflowY: 'auto',
  },
  track: {
    display: 'flex',
    borderBottom: '1px solid #2a2a4a',
  },
  trackLabel: {
    width: `${HEADER_WIDTH}px`,
    padding: '8px 12px',
    backgroundColor: '#1a1a2e',
    borderRight: '1px solid #2a2a4a',
    display: 'flex',
    alignItems: 'center',
    fontWeight: 500,
  },
  timeline: {
    flex: 1,
    position: 'relative',
    height: `${TIMELINE_HEIGHT}px`,
    backgroundColor: '#0f0f23',
    cursor: 'pointer',
  },
  timeMarkers: {
    display: 'flex',
    height: `${TIME_MARKER_HEIGHT}px`,
    backgroundColor: '#16213e',
    borderBottom: '1px solid #2a2a4a',
  },
  timeMarker: {
    position: 'absolute',
    top: 0,
    height: '100%',
    borderLeft: '1px solid #3a3a5a',
    paddingLeft: '4px',
    fontSize: '10px',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
  },
  keyframeTrack: {
    position: 'absolute',
    top: `${TIME_MARKER_HEIGHT}px`,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyframe: {
    position: 'absolute',
    width: `${KEYFRAME_SIZE}px`,
    height: `${KEYFRAME_SIZE}px`,
    backgroundColor: '#e94560',
    borderRadius: '2px',
    transform: 'translate(-50%, -50%) rotate(45deg)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    top: '50%',
  },
  keyframeSelected: {
    backgroundColor: '#00d9ff',
    boxShadow: '0 0 8px rgba(0, 217, 255, 0.5)',
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '2px',
    backgroundColor: '#00d9ff',
    pointerEvents: 'none',
    zIndex: 10,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    backgroundColor: '#2a2a4a',
    border: 'none',
    borderRadius: '4px',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'background-color 0.15s ease',
  },
  buttonActive: {
    backgroundColor: '#e94560',
  },
  timeDisplay: {
    padding: '4px 8px',
    backgroundColor: '#2a2a4a',
    borderRadius: '4px',
    fontFamily: 'monospace',
    minWidth: '80px',
    textAlign: 'center',
  },
  speedControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const remainingMs = Math.floor((ms % 1000) / 10)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${remainingMs.toString().padStart(2, '0')}`
}

export function Timeline({
  duration,
  currentTime,
  keyframes,
  onTimeChange,
  onKeyframeClick,
  selectedKeyframeId,
}: TimelineProps): React.JSX.Element {
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  const timeToPosition = React.useCallback(
    (time: number): number => {
      if (!timelineRef.current) return 0
      const width = timelineRef.current.clientWidth
      return (time / duration) * width
    },
    [duration],
  )

  const positionToTime = React.useCallback(
    (position: number): number => {
      if (!timelineRef.current) return 0
      const width = timelineRef.current.clientWidth
      return (position / width) * duration
    },
    [duration],
  )

  const handleTimelineClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const time = positionToTime(x)
      onTimeChange(Math.max(0, Math.min(time, duration)))
    },
    [duration, onTimeChange, positionToTime],
  )

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      setIsDragging(true)
      handleTimelineClick(event)
    },
    [handleTimelineClick],
  )

  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const time = positionToTime(x)
      onTimeChange(Math.max(0, Math.min(time, duration)))
    },
    [isDragging, duration, onTimeChange, positionToTime],
  )

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const timeMarkers = React.useMemo(() => {
    const markers: React.JSX.Element[] = []
    const numMarkers = 10
    for (let i = 0; i <= numMarkers; i++) {
      const time = (duration / numMarkers) * i
      const position = timeToPosition(time)
      markers.push(
        <div key={i} style={{ ...styles.timeMarker, left: `${position}px` }}>
          {formatTime(time)}
        </div>,
      )
    }
    return markers
  }, [duration, timeToPosition])

  const keyframeElements = React.useMemo(() => {
    return keyframes.map((keyframe) => {
      const position = timeToPosition(keyframe.time)
      const isSelected = keyframe.id === selectedKeyframeId
      return (
        <div
          key={keyframe.id}
          style={{
            ...styles.keyframe,
            left: `${position}px`,
            ...(isSelected ? styles.keyframeSelected : {}),
          }}
          onClick={(e) => {
            e.stopPropagation()
            onKeyframeClick(keyframe)
          }}
          title={keyframe.label || `Keyframe at ${formatTime(keyframe.time)}`}
        />
      )
    })
  }, [keyframes, selectedKeyframeId, timeToPosition, onKeyframeClick])

  const playheadPosition = timeToPosition(currentTime)

  return (
    <div style={styles.track}>
      <div style={styles.trackLabel}>Timeline</div>
      <div style={styles.timeline} ref={timelineRef} onMouseDown={handleMouseDown}>
        <div style={styles.timeMarkers}>{timeMarkers}</div>
        <div style={styles.keyframeTrack}>{keyframeElements}</div>
        <div style={{ ...styles.playhead, left: `${playheadPosition}px` }} />
      </div>
    </div>
  )
}

export function TimelinePanel({
  animation,
  currentTime,
  playing,
  onTimeChange,
  onPlayPause,
  onKeyframeAdd,
  onKeyframeDelete,
  onKeyframeMove,
  onKeyframeSelect,
  selectedKeyframeId,
}: TimelinePanelProps): React.JSX.Element {
  const [speed, setSpeed] = React.useState(1)

  const handleSpeedChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(parseFloat(event.target.value))
  }, [])

  const handleKeyframeClick = React.useCallback(
    (keyframe: Keyframe) => {
      onKeyframeSelect(keyframe.id)
      onTimeChange(keyframe.time)
    },
    [onKeyframeSelect, onTimeChange],
  )

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.controls}>
          <button
            style={{ ...styles.button, ...(playing ? styles.buttonActive : {}) }}
            onClick={onPlayPause}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          <button style={styles.button} onClick={onKeyframeAdd}>
            + Keyframe
          </button>
          {selectedKeyframeId && (
            <button
              style={{ ...styles.button, backgroundColor: '#e94560' }}
              onClick={() => onKeyframeDelete(selectedKeyframeId)}
            >
              ✕ Delete
            </button>
          )}
        </div>
        <div style={styles.timeDisplay}>{formatTime(currentTime)}</div>
        <div style={styles.speedControl}>
          <span>Speed:</span>
          <select
            value={speed}
            onChange={handleSpeedChange}
            style={{
              ...styles.button,
              padding: '4px 8px',
            }}
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', color: '#888' }}>
          Duration: {formatTime(animation.duration)}
        </div>
      </div>
      <div style={styles.trackContainer}>
        <Timeline
          duration={animation.duration}
          currentTime={currentTime}
          keyframes={animation.keyframes}
          onTimeChange={onTimeChange}
          onKeyframeClick={handleKeyframeClick}
          selectedKeyframeId={selectedKeyframeId}
        />
      </div>
    </div>
  )
}

export type { AnimationTrack, Keyframe, TimelinePanelProps, TimelineProps }
