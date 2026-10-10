/**
 * Who owns the renderer: `<Canvas primary>`, automatic sharing, `share="id"` and `share={false}`.
 *
 * - top left, `<Canvas id="owner" primary>`: builds the WebGPURenderer and registers it.
 * - top right, a plain `<Canvas>`: one primary is mounted, so it borrows that renderer
 *   automatically. Its `renderer={{ toneMappingExposure: 3 }}` bag is IGNORED (and warns once in
 *   development): renderer-wide settings on a shared renderer would change every canvas drawing with
 *   it, so they come from the primary.
 * - bottom left, `<Canvas share="owner">`: names the primary to borrow. With several primaries
 *   mounted this is required; a `share="id"` canvas also waits for that primary to mount.
 * - bottom right, `<Canvas share={false}>`: opts out and builds its own renderer, so the same
 *   exposure bag APPLIES here and this canvas renders visibly brighter.
 *
 * Each label reads the canvas's state live: which renderer instance it draws with (#1 is the
 * primary's), and whether it borrows it (`internal.isSecondary`).
 *
 * Without WebGPU (`navigator.gpu` missing, e.g. headless Chromium), three's renderer falls back to
 * WebGL2, whose context is bound to one canvas element and cannot be shared. The canvases that would
 * share then build their own WebGL2 renderer instead (`internal.sharedRendererFallback`), apply their
 * own settings, and the labels say so. See docs/webgpu/multi-canvas.mdx.
 */

import { Canvas, useFrame, type RootState } from '@react-three/fiber/webgpu'
import { useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three/webgpu'

//* Live renderer status ==============================

// Number renderer instances in the order canvases first report them
const rendererIds = new WeakMap<object, number>()
let nextRendererId = 1
const rendererId = (renderer: object) => {
  if (!rendererIds.has(renderer)) rendererIds.set(renderer, nextRendererId++)
  return rendererIds.get(renderer)!
}

function describe(state: RootState) {
  const { internal, renderer, webGPUSupported } = state
  const backend = webGPUSupported ? 'WebGPU' : 'WebGL2 fallback'
  const ownership = internal.isSecondary
    ? "borrows the primary's renderer"
    : internal.sharedRendererFallback
      ? 'own renderer: WebGL2 cannot be shared'
      : 'owns its renderer'
  return `renderer #${rendererId(renderer)} · ${backend} · ${ownership}`
}

function Status({ onChange }: { onChange: (text: string) => void }) {
  const last = useRef('')
  useFrame((state) => {
    const text = describe(state)
    if (text !== last.current) onChange((last.current = text))
  })
  return null
}

//* Scene ==============================

function Spinner({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    ref.current.rotation.x += delta * 0.4
    ref.current.rotation.y += delta * 0.8
  })
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[0.7, 0.25, 128, 24]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  )
}

function Scene({ color, background, onStatus }: { color: string; background: string; onStatus: (t: string) => void }) {
  return (
    <>
      <color attach="background" args={[background]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <Spinner color={color} />
      <Status onChange={onStatus} />
    </>
  )
}

//* Layout ==============================

const camera = { position: [0, 0, 5] as [number, number, number] }

function Cell({ title, code, children, status }: { title: string; code: string; children: ReactNode; status: string }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {children}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          right: 12,
          color: 'white',
          font: '13px system-ui, sans-serif',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}>
        <div style={{ fontWeight: 650 }}>{title}</div>
        <code style={{ fontSize: 12, opacity: 0.8 }}>{code}</code>
        <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 12, opacity: 0.9 }}>{status}</div>
      </div>
    </div>
  )
}

export default function WebGPUShareOptOut() {
  const [status, setStatus] = useState<Record<string, string>>({})
  const report = (key: string) => (text: string) => setStatus((s) => ({ ...s, [key]: text }))

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 2,
        width: '100%',
        height: '100%',
        background: '#111',
      }}>
      <Cell title="Primary — owns the renderer" code='<Canvas id="owner" primary>' status={status.primary ?? '…'}>
        <Canvas id="owner" primary camera={camera}>
          <Scene color="orange" background="#241a12" onStatus={report('primary')} />
        </Canvas>
      </Cell>

      <Cell
        title="Shares automatically — its renderer bag is ignored while sharing"
        code="<Canvas renderer={{ toneMappingExposure: 3 }}>"
        status={status.auto ?? '…'}>
        <Canvas renderer={{ toneMappingExposure: 3 }} camera={camera}>
          <Scene color="hotpink" background="#24131f" onStatus={report('auto')} />
        </Canvas>
      </Cell>

      <Cell title="Shares a named primary" code='<Canvas share="owner">' status={status.named ?? '…'}>
        <Canvas share="owner" camera={camera}>
          <Scene color="aquamarine" background="#10221f" onStatus={report('named')} />
        </Canvas>
      </Cell>

      <Cell
        title="Opts out — its own renderer, its bag applies"
        code="<Canvas share={false} renderer={{ toneMappingExposure: 3 }}>"
        status={status.own ?? '…'}>
        <Canvas share={false} renderer={{ toneMappingExposure: 3 }} camera={camera}>
          <Scene color="lightskyblue" background="#121a26" onStatus={report('own')} />
        </Canvas>
      </Cell>
    </div>
  )
}
