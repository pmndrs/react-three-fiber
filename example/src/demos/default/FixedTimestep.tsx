/**
 * Fixed-timestep physics with render interpolation.
 *
 * The `physics` phase runs on a fixed clock (1/60 s by default): a `{ phase: 'physics' }` job runs
 * 0..8 times per frame, always with `delta === timestep`, so the simulation below is deterministic
 * no matter the display rate. `state.overstep` in [0, 1) is how far the clock already is into the
 * next step.
 *
 * One simulation, drawn twice:
 * - left, RAW: each ball at its last simulated position. Moves in steps of `timestep`.
 * - right, INTERPOLATED: an `update` job lerps previous → current by `state.overstep`. Smooth at
 *   any timestep, one step behind the simulation.
 *
 * What to look for: at 1/60 both look alike on a 60 Hz display. Switch to 1/20 or 1/10 and the raw
 * balls stutter while the interpolated ones keep gliding along the same paths. The readout shows
 * how many substeps ran this frame and the current overstep. The timestep is changed live with
 * `scheduler.setPhaseTimestep('physics', step)`, and restored to 1/60 when the demo unmounts.
 */

import { Canvas, useFrame } from '@react-three/fiber'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'

const DEFAULT_STEP = 1 / 60
const STEPS = [
  { label: '1/60', value: 1 / 60 },
  { label: '1/30', value: 1 / 30 },
  { label: '1/20', value: 1 / 20 },
  { label: '1/10', value: 1 / 10 },
  { label: '1/5', value: 1 / 5 },
]

//* Simulation ==============================
// Plain symplectic Euler in a 2D box. No physics library: the point is the clock, not the solver.

const BOX = { halfWidth: 1.6, height: 3 }
const GRAVITY = -9.8
const RADIUS = 0.16
const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff']

interface Body {
  x: number
  y: number
  vx: number
  vy: number
}

// Deterministic start: same throw every mount
const initialBodies = (): Body[] =>
  COLORS.map((_, i) => ({ x: -1.2 + i * 0.6, y: 0.5 + i * 0.35, vx: 2.4 - i * 1.1, vy: 1 + i * 0.6 }))

function step(bodies: Body[], dt: number) {
  for (const b of bodies) {
    b.vy += GRAVITY * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    // Perfectly elastic walls and floor, so the balls keep bouncing forever
    const wall = BOX.halfWidth - RADIUS
    if (Math.abs(b.x) > wall) {
      b.x = Math.sign(b.x) * wall
      b.vx = -b.vx
    }
    if (b.y < RADIUS) {
      b.y = RADIUS
      b.vy = Math.abs(b.vy)
    }
  }
}

//* Scene ==============================

function Simulation({ onStats }: { onStats: (steps: number, overstep: number) => void }) {
  const raw = useRef<(THREE.Mesh | null)[]>([])
  const smooth = useRef<(THREE.Mesh | null)[]>([])
  const sim = useRef<{ previous: Body[]; current: Body[]; steps: number } | null>(null)
  sim.current ??= { previous: initialBodies(), current: initialBodies(), steps: 0 }

  // Fixed: 0..8 calls per frame, each with dt === the physics timestep
  useFrame(
    (_, dt) => {
      const s = sim.current!
      s.previous = s.current.map((b) => ({ ...b }))
      step(s.current, dt)
      s.steps++
    },
    { phase: 'physics' },
  )

  // Per frame: draw both views from the latest two simulation states
  useFrame(
    ({ overstep }) => {
      const s = sim.current!
      s.current.forEach((b, i) => {
        const prev = s.previous[i]
        raw.current[i]?.position.set(b.x, b.y, 0)
        smooth.current[i]?.position.set(
          THREE.MathUtils.lerp(prev.x, b.x, overstep),
          THREE.MathUtils.lerp(prev.y, b.y, overstep),
          0,
        )
      })
      onStats(s.steps, overstep)
      s.steps = 0
    },
    { phase: 'update' },
  )

  return (
    <>
      {[
        { offset: -2.1, refs: raw },
        { offset: 2.1, refs: smooth },
      ].map(({ offset, refs }) => (
        <group key={offset} position={[offset, -BOX.height / 2, 0]}>
          <mesh position={[0, BOX.height / 2, -RADIUS]}>
            <planeGeometry args={[BOX.halfWidth * 2, BOX.height]} />
            <meshStandardMaterial color="#20232b" />
          </mesh>
          {COLORS.map((color, i) => (
            <mesh key={color} ref={(mesh) => void (refs.current[i] = mesh)}>
              <sphereGeometry args={[RADIUS, 24, 16]} />
              <meshStandardMaterial color={color} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

/** Sets the physics phase's timestep live, and puts the default back on unmount. */
function Timestep({ value }: { value: number }) {
  const { scheduler } = useFrame()
  useLayoutEffect(() => scheduler.setPhaseTimestep('physics', value), [scheduler, value])
  useLayoutEffect(() => () => scheduler.setPhaseTimestep('physics', DEFAULT_STEP), [scheduler])
  return null
}

//* UI ==============================

const label: CSSProperties = {
  position: 'absolute',
  top: 16,
  width: '50%',
  textAlign: 'center',
  color: '#e8e8ee',
  font: '600 13px system-ui, sans-serif',
  letterSpacing: '0.04em',
  pointerEvents: 'none',
}

export default function FixedTimestep() {
  const [timestep, setTimestep] = useState(DEFAULT_STEP)
  const stats = useRef<HTMLSpanElement>(null)
  // Written straight to the DOM: a React state update per frame would re-render the whole demo
  const onStats = (steps: number, overstep: number) => {
    if (stats.current)
      stats.current.textContent = `${steps} substep${steps === 1 ? '' : 's'} · overstep ${overstep.toFixed(2)}`
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#121318' }}>
      <Canvas renderer camera={{ position: [0, 0, 7], fov: 50 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 4, 5]} intensity={2.5} />
        <Timestep value={timestep} />
        <Simulation onStats={onStats} />
      </Canvas>

      <div style={{ ...label, left: 0 }}>RAW · last physics step</div>
      <div style={{ ...label, right: 0 }}>INTERPOLATED · lerp by state.overstep</div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 20,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          font: '12px system-ui, sans-serif',
          color: '#c8c8d0',
        }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span>physics timestep</span>
          {STEPS.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={s.value === timestep}
              onClick={() => setTimestep(s.value)}
              style={{
                padding: '4px 10px',
                border: '1px solid #3a3d48',
                borderRadius: 4,
                cursor: 'pointer',
                color: s.value === timestep ? '#121318' : '#e8e8ee',
                background: s.value === timestep ? '#ffd166' : '#22252e',
                font: 'inherit',
              }}>
              {s.label}
            </button>
          ))}
        </div>
        <span ref={stats} style={{ fontFamily: 'monospace', opacity: 0.8 }} />
      </div>
    </div>
  )
}
