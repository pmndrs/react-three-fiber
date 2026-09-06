import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { useRef, useState } from 'react'
import * as THREE from 'three/webgpu'

/**
 * A lone `<Canvas id>` — a primary with no secondaries.
 *
 * Repro for the alpha.4 regression of #3847: giving a WebGPU canvas an id made R3F size a second
 * CanvasTarget around the same element while the renderer kept drawing (and building its depth
 * buffer) with its own. Without a secondary to trigger setCanvasTarget the two never met, so every
 * frame raised:
 *
 *   GPUValidationError: The depth stencil attachment [depthBuffer] size (300, 150) does not match
 *   the size of the other attachments' base plane (…)
 *
 * Expected: a spinning box, an empty console, and the readout below agreeing with the renderer's
 * drawing buffer. Resize the window and check the readout follows.
 */

function SpinningBox() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    ref.current.rotation.x += delta * 0.5
    ref.current.rotation.y += delta
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  )
}

/** Compares R3F's size with what the renderer actually draws into. They must agree. */
function SizeReadout({ onChange }: { onChange: (text: string) => void }) {
  const last = useRef('')
  const buffer = useRef(new THREE.Vector2())
  useFrame(({ renderer, size, viewport }) => {
    renderer.getCanvasTarget().getDrawingBufferSize(buffer.current)
    const expected = `${Math.floor(size.width * viewport.dpr)}x${Math.floor(size.height * viewport.dpr)}`
    const actual = `${buffer.current.x}x${buffer.current.y}`
    const text = `expected ${expected} · drawing buffer ${actual} · ${expected === actual ? 'OK' : 'MISMATCH'}`
    if (text !== last.current) onChange((last.current = text))
  })
  return null
}

export default function WebGPUPrimaryOnly() {
  const [readout, setReadout] = useState('…')
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* The id is the trigger: it registers this canvas as a primary and gives it a canvas target. */}
      <Canvas id="primary-only" dpr={[1, 2]} camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={2} />
        <SpinningBox />
        <SizeReadout onChange={setReadout} />
      </Canvas>
      <div
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 12,
          borderRadius: 4,
          pointerEvents: 'none',
        }}>
        {readout}
      </div>
    </div>
  )
}
