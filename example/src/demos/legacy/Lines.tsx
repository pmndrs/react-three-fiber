import { Line } from '@react-three/drei'
import { Canvas, type ThreeElements, type ThreeEvent, type Vector3 } from '@react-three/fiber'
import { useState } from 'react'

function PolyLine({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: [number, number, number]
  defaultEnd: [number, number, number]
}) {
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)

  return (
    <>
      <Line points={[...start, ...end]} lineWidth={3} color="lightgray" />
      <EndPoint position={start} onDrag={setStart} />
      <EndPoint position={end} onDrag={setEnd} />
    </>
  )
}

function EndPoint({
  position,
  onDrag,
}: ThreeElements['mesh'] & { onDrag: (position: [number, number, number]) => void }) {
  const [active, setActive] = useState(false)
  const [hovered, setHover] = useState(false)

  const down = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
    setActive(true)
  }

  const up = (event: ThreeEvent<PointerEvent>) => {
    setActive(false)
  }

  const move = (event: ThreeEvent<PointerEvent>) => {
    if (active && onDrag) onDrag(event.unprojectedPoint.toArray())
  }

  return (
    <mesh
      position={position}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      onPointerDown={down}
      onLostPointerCapture={up}
      onPointerUp={up}
      onPointerMove={move}>
      <sphereGeometry args={[10, 16, 16]} />
      <meshBasicMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas
      orthographic
      raycaster={{ params: { Line: { threshold: 5 } } as any }}
      camera={{ position: [0, 0, 500], zoom: 1 }}>
      <PolyLine defaultStart={[-100, -100, 0]} defaultEnd={[0, 100, 0]} />
      <PolyLine defaultStart={[0, 100, 0]} defaultEnd={[100, -100, 0]} />
    </Canvas>
  )
}
