import * as React from 'react'
import { BoxBufferGeometry, MeshNormalMaterial } from 'three'
import { Canvas, useFrame, useThree } from 'react-three-fiber'
import { Controls, useControl } from 'react-three-gui'
import { Html } from 'drei'
import { unstable_LowPriority as low, unstable_runWithPriority as run } from 'scheduler'

const SLOWDOWN = 1
const ROW = 20
const BLOCK_AMOUNT = 600
const SPIKE_AMOUNT = 1000
const geom = new BoxBufferGeometry(1, 1, 1)
const material = new MeshNormalMaterial()
const rpi = () => Math.random() * Math.PI

function Block({ i, change, ...props }) {
  const { viewport } = useThree()

  const { width, height, size } = React.useMemo(
    () => {
      const { width, height } = viewport().factor
      const size = width / 100 / ROW

      return {
        width,
        height,
        size,
      }
    },
    [viewport]
  )

  const scale = React.useMemo(() => [size, size, size], [size])
  const position = React.useMemo(
    () => {
      const left = -width / 100 / 2 + size / 2
      const top = height / 100 / 2 - size / 2
      const x = (i % ROW) * size
      const y = Math.floor(i / ROW) * -size

      return [left + x, top + y, 0]
    },
    [width, height, size, i]
  )

  const [color, set] = React.useState(0)

  // Artificial slowdown ...
  if (color > 0) {
    const e = performance.now() + SLOWDOWN
    while (performance.now() < e) {}
  }

  const mounted = React.useRef(false)
  React.useEffect(() => {
    mounted.current = true
    return () => (mounted.current = false)
  })

  React.useEffect(() => {
    if (change)
      setTimeout(
        () => run(low, () => mounted.current && set(Math.round(Math.random() * 0xffffff))),
        Math.random() * 1000
      )
  }, [change])

  return (
    <mesh scale={scale} position={position} geometry={geom} {...props}>
      <meshBasicMaterial attach="material" color={color} />
    </mesh>
  )
}

function Blocks(props) {
  const [changeBlocks, set] = React.useState(false)

  React.useEffect(() => {
    const handler = setInterval(() => set((state) => !state), 2000)
    return () => clearInterval(handler)
  })

  return new Array(BLOCK_AMOUNT).fill().map((_, i) => {
    return <Block key={i} i={i} change={changeBlocks} {...props} />
  })
}

function Fps() {
  let ref = React.useRef()
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
  return <Html className="fps" center ref={ref} />
}

const boxScale = [2, 2, 2]

function Box() {
  let t = 0
  const mesh = React.useRef()
  const [coords] = React.useState(() => [rpi(), rpi(), rpi()])
  useFrame(() => mesh.current && mesh.current.rotation.set(coords[0] + (t += 0.01), coords[1] + t, coords[2] + t))
  return <mesh ref={mesh} geometry={geom} material={material} scale={boxScale} />
}

function AnimatedSpikes() {
  return new Array(SPIKE_AMOUNT).fill().map((_, i) => <Box key={i} />)
}

function Dolly() {
  const { clock, camera } = useThree()
  useFrame(() => camera.updateProjectionMatrix(void (camera.zoom = 130 + Math.sin(clock.getElapsedTime() * 3) * 30)))
  return null
}

const camera = { zoom: 100 }
const cameraStyle = { background: '#272737' }

function Concurrent() {
  const root = useControl('React', { type: 'select', group: 'Performance', items: ['Concurrent', 'Legacy'] })
  const concurrent = root === 'Concurrent'
  return (
    <>
      <Canvas concurrent={concurrent} key={root} orthographic camera={camera} style={cameraStyle}>
        <Fps />
        <Blocks />
        <AnimatedSpikes />
        <Dolly />
      </Canvas>
      <Controls />
    </>
  )
}

export default React.memo(Concurrent)
