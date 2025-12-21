import { useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'

//* Control Button Component ==============================

interface ControlButtonProps {
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'success'
  children: React.ReactNode
}

function ControlButton({ onClick, disabled, variant = 'primary', children }: ControlButtonProps) {
  const colors = {
    primary: { bg: '#3b82f6', hover: '#2563eb' },
    danger: { bg: '#ef4444', hover: '#dc2626' },
    success: { bg: '#22c55e', hover: '#16a34a' },
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '500',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: disabled ? '#374151' : colors[variant].bg,
        color: disabled ? '#6b7280' : 'white',
        transition: 'all 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}>
      {children}
    </button>
  )
}

//* Control Panel UI (outside Canvas) ==============================

interface ControlPanelProps {
  sphereControls: {
    pause: () => void
    resume: () => void
    step: () => void
    stepAll: () => void
    isPaused: boolean
    scheduler: any
    id: string
  } | null
}

export function ControlPanel({ sphereControls }: ControlPanelProps) {
  if (!sphereControls) return null

  const [schedulerRunning, setSchedulerRunning] = useState(true)

  const { pause, resume, step, stepAll, isPaused, scheduler, id } = sphereControls

  // we have access to the same scheduler so no need to pass it in
  const handleSchedulerToggle = useCallback(() => {
    if (!scheduler) return
    if (scheduler.isRunning) {
      scheduler.stop()
      setSchedulerRunning(false)
    } else {
      scheduler.start()
      setSchedulerRunning(true)
    }
  }, [scheduler])
  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '16px',
        fontFamily: 'system-ui, sans-serif',
        color: 'white',
        minWidth: '360px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
      {/* Title */}
      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#94a3b8' }}>useFrame Controls</div>

      {/* Two-column layout for job vs scheduler */}
      <div style={{ display: 'flex', gap: '24px', width: '100%' }}>
        {/* Individual Job Control */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
          }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Sphere Job
          </div>

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: isPaused ? '#ef4444' : '#22c55e',
                boxShadow: isPaused ? '0 0 8px #ef4444' : '0 0 8px #22c55e',
              }}
            />
            {isPaused ? 'PAUSED' : 'RUNNING'}
          </div>

          {/* Job controls */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <ControlButton onClick={pause} disabled={isPaused}>
              ⏸️
            </ControlButton>
            <ControlButton onClick={resume} disabled={!isPaused}>
              ▶️
            </ControlButton>
            <ControlButton onClick={() => step()}>⏭️</ControlButton>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            ID: <code style={{ color: '#60a5fa' }}>{id}</code>
          </div>
        </div>

        {/* Scheduler Control */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '10px',
          }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Scheduler
          </div>

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 'bold' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: schedulerRunning ? '#22c55e' : '#ef4444',
                boxShadow: schedulerRunning ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
              }}
            />
            {schedulerRunning ? 'RUNNING' : 'STOPPED'}
          </div>

          {/* Scheduler controls */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <ControlButton onClick={handleSchedulerToggle} variant={schedulerRunning ? 'danger' : 'success'}>
              {schedulerRunning ? '⏹️ Stop All' : '▶️ Start All'}
            </ControlButton>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Jobs: <code style={{ color: '#60a5fa' }}>{scheduler?.getJobCount() ?? 0}</code>
          </div>
        </div>
      </div>

      {/* Step All button - affects all jobs */}
      <ControlButton onClick={() => stepAll()}>⏩ Step All Jobs</ControlButton>

      {/* Info text */}
      <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', maxWidth: '320px' }}>
        <strong>Sphere Job:</strong> Controls only the center sphere (fps: 30)
        <br />
        <strong>Scheduler:</strong> Controls the entire loop (affects orbiting ball + light too)
      </div>
    </div>
  )
}

// Control for the spotlight
export function SpotlightControls() {
  const { scheduler } = useFrame()
  const pause = useCallback(() => {
    scheduler.pauseJob('moving-spotlight')
  }, [scheduler])
  const resume = useCallback(() => {
    scheduler.resumeJob('moving-spotlight')
  }, [scheduler])
  return (
    <group position={[0, 8, 0]}>
      <Html center>
        <div
          id="spotlight-controls"
          style={{
            position: 'absolute',
            top: '57vh',
            left: '-50vw',
            display: 'flex',
            gap: '8px',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.75)',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
          }}>
          <ControlButton onClick={pause}>⏸️ Spotlight</ControlButton>
          <ControlButton onClick={resume}>▶️ Spotlight</ControlButton>
        </div>
      </Html>
    </group>
  )
}
