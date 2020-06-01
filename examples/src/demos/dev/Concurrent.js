import React, { useRef, useState, useEffect } from 'react'
import { BoxBufferGeometry, MeshNormalMaterial } from 'three'
import { Canvas, Dom, useFrame, useThree } from 'react-three-fiber'
import { Controls, useControl } from 'react-three-gui'
import { unstable_LowPriority as low, unstable_runWithPriority as run } from 'scheduler'

const SLOWDOWN = 1
const ROW = 20
const BLOCK_AMOUNT = 600
const SPIKE_AMOUNT = 1000
const geom = new BoxBufferGeometry(1, 1, 1)
const matr = new MeshNormalMaterial()
const rpi = () => Math.random() * Math.PI

function Block({ change, ...props }) {
  const [color, set] = useState(0)

  // Artificial slowdown ...
  if (color > 0) {
    const e = performance.now() + SLOWDOWN
    while (performance.now() < e) {}
  }

  useEffect(() => {
    if (change) setTimeout(() => run(low, () => set(Math.round(Math.random() * 0xffffff))), Math.random() * 1000)
  }, [change])

  return (
    <mesh {...props} geometry={geom}>
      <meshBasicMaterial attach="material" color={color} />
    </mesh>
  )
}

function Blocks() {
  const [changeBlocks, set] = useState(false)
  useEffect(() => {
    const handler = setInterval(() => set((state) => !state), 2000)
    return () => clearInterval(handler)
  })

  console.log(changeBlocks)

  const { viewport } = useThree()
  const width = viewport.width / 100
  const size = width / ROW
  return new Array(BLOCK_AMOUNT).fill().map((_, i) => {
    const left = -viewport.width / 100 / 2 + size / 2
    const top = viewport.height / 100 / 2 - size / 2
    const x = (i % ROW) * size
    const y = Math.floor(i / ROW) * -size
    return <Block key={i} change={changeBlocks} scale={[size, size, size]} position={[left + x, top + y, 0]} />
  })
}

function Fps() {
  let ref = useRef()
  let last = Date.now()
  let qty = 0
  let currentAvg = 0
  useFrame(() => {
    let now = Date.now()
    let fps = 1 / ((now - last) / 1000)
    let avg = Math.round((fps - currentAvg) / ++qty)
    if (currentAvg + avg !== currentAvg) {
      ref.current.innerText =
        `${SPIKE_AMOUNT} spikes\n${BLOCK_AMOUNT} blocks\n${BLOCK_AMOUNT * SLOWDOWN}ms potential load\nfps avg ` +
        (currentAvg += avg)
    }
    last = now
  })
  return <Dom className="fps" center ref={ref} />
}

function Box() {
  let t = 0
  const mesh = useRef()
  const [coords] = useState(() => [rpi(), rpi(), rpi()])
  useFrame(
    ({ clock }) => mesh.current && mesh.current.rotation.set(coords[0] + (t += 0.01), coords[1] + t, coords[2] + t)
  )
  return <mesh ref={mesh} geometry={geom} material={matr} scale={[2, 2, 2]} />
}

function AnimatedSpikes() {
  return new Array(SPIKE_AMOUNT).fill().map((_, i) => <Box key={i} />)
}

function Dolly() {
  const { clock, camera } = useThree()
  useFrame(() => camera.updateProjectionMatrix(void (camera.zoom = 130 + Math.sin(clock.getElapsedTime() * 3) * 30)))
  return null
}

export default function App() {
  const root = useControl('React', { type: 'select', group: 'Performance', items: ['Concurrent', 'Legacy'] })
  const concurrent = root === 'Concurrent'
  return (
    <>
      <Canvas concurrent={concurrent} key={root} orthographic camera={{ zoom: 100 }} style={{ background: '#272737' }}>
        <Fps />
        <Blocks />
        <AnimatedSpikes />
        <Dolly />
      </Canvas>
      <Controls />
    </>
  )
}
