/**
 * Automatic `material.needsUpdate` (#3892, #3993).
 *
 * Some material props are compiled into the shader program (WebGL) or render object (WebGPU), so
 * changing one after the first render used to need `material.needsUpdate = true` by hand. R3F now
 * sets it whenever one of those props changes value:
 *
 *   transparent, vertexColors, flatShading, fog, side, alphaHash, premultipliedAlpha, blending,
 *   alphaToCoverage, dithering, sizeAttenuation, combine, normalMapType, depthPacking
 *
 * and whenever a texture slot (map, normalMap, envMap, ...) gains or loses its texture, through a
 * prop or an `attach`. Swapping one texture for another keeps the program and does not count.
 * See `programProps` / `changesProgram` in packages/fiber/src/core/utils/props.ts.
 *
 * What to look for: every toggle below shows immediately, and there is no needsUpdate anywhere in
 * this file. `material.version` (which three bumps on each needsUpdate) climbs by one per program
 * change and stays put for color, a uniform. Removing the map is the case that throws on WebGPU
 * without needsUpdate. The renderer switch remounts the canvas so both backends can be checked.
 */

import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'

type Side = 'front' | 'back' | 'double'
const SIDES: Record<Side, THREE.Side> = { front: THREE.FrontSide, back: THREE.BackSide, double: THREE.DoubleSide }

interface Settings {
  flatShading: boolean
  vertexColors: boolean
  side: Side
  transparent: boolean
  opacity: number
  fog: boolean
  map: boolean
  color: string
}

/** A sphere with a wedge cut out (so `side` shows) and a per-vertex color attribute */
function useShellGeometry() {
  return useMemo(() => {
    const geometry = new THREE.SphereGeometry(1.4, 18, 12, 0, Math.PI * 1.5)
    const normal = geometry.getAttribute('normal')
    const colors = new Float32Array(normal.count * 3)
    for (let i = 0; i < normal.count; i++) {
      colors[i * 3] = normal.getX(i) * 0.5 + 0.5
      colors[i * 3 + 1] = normal.getY(i) * 0.5 + 0.5
      colors[i * 3 + 2] = normal.getZ(i) * 0.5 + 0.5
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])
}

/** A generated checker texture: no external assets */
function useCheckerTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')!
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#1d3557' : '#f1faee'
        ctx.fillRect(x * 32, y * 32, 32, 32)
      }
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(3, 2)
    return texture
  }, [])
}

function Shell({ settings, onVersion }: { settings: Settings; onVersion: (version: number) => void }) {
  const geometry = useShellGeometry()
  const texture = useCheckerTexture()
  const group = useRef<THREE.Group>(null!)
  const material = useRef<THREE.MeshStandardMaterial>(null!)
  const lastVersion = useRef(-1)

  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.3
    if (material.current.version !== lastVersion.current) onVersion((lastVersion.current = material.current.version))
  })

  return (
    <group ref={group}>
      {/* Turned so the cut-out wedge starts facing the camera */}
      <mesh geometry={geometry} rotation-y={Math.PI * 0.75 - 0.5}>
        <meshStandardMaterial
          ref={material}
          color={settings.color}
          flatShading={settings.flatShading}
          vertexColors={settings.vertexColors}
          side={SIDES[settings.side]}
          transparent={settings.transparent}
          opacity={settings.opacity}
          fog={settings.fog}
          map={settings.map ? texture : null}
          roughness={0.5}
        />
      </mesh>
      {/* Something inside the shell, to see through it when it is transparent or cut open */}
      <mesh>
        <torusKnotGeometry args={[0.45, 0.14, 128, 16]} />
        <meshStandardMaterial color="#ff9f1c" roughness={0.3} />
      </mesh>
    </group>
  )
}

//* UI ==============================

function Row({ children }: { children: ReactNode }) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>{children}</label>
}

export default function AutoNeedsUpdate() {
  const [webgpu, setWebgpu] = useState(true)
  const [settings, setSettings] = useState<Settings>({
    flatShading: false,
    vertexColors: false,
    side: 'front',
    transparent: false,
    opacity: 0.45,
    fog: true,
    map: false,
    color: '#ffffff',
  })
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }))
  const version = useRef<HTMLSpanElement>(null)
  const onVersion = (value: number) => {
    if (version.current) version.current.textContent = String(value)
  }

  const toggle = (key: 'flatShading' | 'vertexColors' | 'transparent' | 'fog' | 'map', text: string) => (
    <Row>
      <input type="checkbox" checked={settings[key]} onChange={(e) => set(key, e.target.checked)} />
      {text}
    </Row>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#d8dde6' }}>
      <Canvas key={webgpu ? 'webgpu' : 'webgl'} renderer={webgpu} camera={{ position: [0, 1.2, 5.5], fov: 45 }}>
        <color attach="background" args={['#d8dde6']} />
        <fog attach="fog" args={['#d8dde6', 4, 9]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 4, 5]} intensity={2.5} />
        <Shell settings={settings} onVersion={onVersion} />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '12px 14px',
          borderRadius: 6,
          background: 'rgba(20, 22, 28, 0.82)',
          color: '#eef0f4',
          font: '13px system-ui, sans-serif',
        }}>
        <strong style={{ fontSize: 12, letterSpacing: '0.06em' }}>COMPILED INTO THE SHADER</strong>
        {toggle('flatShading', 'flatShading')}
        {toggle('vertexColors', 'vertexColors')}
        {toggle('fog', 'fog')}
        {toggle('transparent', 'transparent')}
        <Row>
          side
          <select value={settings.side} onChange={(e) => set('side', e.target.value as Side)}>
            <option value="front">FrontSide</option>
            <option value="back">BackSide</option>
            <option value="double">DoubleSide</option>
          </select>
        </Row>
        {toggle('map', 'map (texture slot filled / emptied)')}

        <strong style={{ fontSize: 12, letterSpacing: '0.06em', marginTop: 6 }}>UNIFORMS (NO RECOMPILE)</strong>
        <Row>
          opacity
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.opacity}
            onChange={(e) => set('opacity', Number(e.target.value))}
          />
        </Row>
        <Row>
          color
          <input type="color" value={settings.color} onChange={(e) => set('color', e.target.value)} />
        </Row>

        <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}>
          material.version: <span ref={version}>0</span>
        </div>
        {!webgpu && settings.transparent && settings.side === 'double' && (
          <div style={{ maxWidth: 240, fontSize: 11, opacity: 0.75 }}>
            Climbing on its own: WebGLRenderer draws a transparent DoubleSide material in two passes and sets
            needsUpdate for each, every frame. That one is three, not R3F.
          </div>
        )}
        <Row>
          <input type="checkbox" checked={webgpu} onChange={(e) => setWebgpu(e.target.checked)} />
          WebGPU renderer (off: WebGL)
        </Row>
      </div>
    </div>
  )
}
