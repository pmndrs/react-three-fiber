import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { useRef, useState } from 'react'
import * as THREE from 'three/webgpu'

/**
 * Repro for #3926: unmounting a `<Canvas renderer>` must release the renderer R3F created.
 *
 * Each mount records its GPU device. Unmount the canvas and watch that device's row: on v10 before
 * the fix it stays `alive` forever, because nothing called `renderer.dispose()`. With the fix
 * `device.lost` resolves with reason `destroyed` right after the unmount commits.
 *
 * Expected: every unmounted row reads `destroyed`, and only the mounted one reads `alive`.
 */

interface Row {
  id: number
  status: string
  unmountedAt?: number
}

function SpinningKnot() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => (ref.current.rotation.y += delta))
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[0.8, 0.25, 128, 32]} />
      <meshNormalMaterial />
    </mesh>
  )
}

export default function WebGPURendererRelease() {
  const [mounted, setMounted] = useState(true)
  const [mountId, setMountId] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  const update = (id: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const toggle = () => {
    if (mounted) {
      update(mountId, { unmountedAt: performance.now() })
      setMounted(false)
    } else {
      setMountId((id) => id + 1)
      setMounted(true)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {mounted && (
        <Canvas
          key={mountId}
          renderer
          camera={{ position: [0, 0, 4] }}
          onCreated={({ renderer }) => {
            const id = mountId
            const device = (renderer.backend as { device?: GPUDevice }).device
            setRows((current) => [...current, { id, status: device ? 'alive' : 'no WebGPU device (WebGL 2 fallback)' }])
            device?.lost.then((info) => {
              const row = rowsRef.current.find((entry) => entry.id === id)
              const after =
                row?.unmountedAt === undefined
                  ? ''
                  : ` ${Math.round(performance.now() - row.unmountedAt)}ms after unmount`
              update(id, { status: `${info.reason}${after}` })
            })
          }}>
          <SpinningKnot />
        </Canvas>
      )}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          padding: '8px 10px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 12,
          borderRadius: 4,
        }}>
        <button onClick={toggle}>{mounted ? 'Unmount canvas' : 'Mount canvas'}</button>
        {rows.map((row) => (
          <div key={row.id}>
            mount #{row.id}: device {row.status}
          </div>
        ))}
      </div>
    </div>
  )
}
