import * as THREE from 'three'
import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react'
import { ThreeElement, extend, Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from 'three-stdlib'

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>
  }
}

extend({ OrbitControls })

function useHover(stopPropagation = true) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(
    (e: any) => {
      if (stopPropagation) e.stopPropagation()
      setHover(true)
    },
    [stopPropagation],
  )
  const unhover = useCallback(
    (e: any) => {
      if (stopPropagation) e.stopPropagation()
      setHover(false)
    },
    [stopPropagation],
  )
  const [bind] = useState(() => ({ onPointerOver: hover, onPointerOut: unhover }))
  return [bind, hovered]
}

function useDrag(onDrag: any, onEnd: any) {
  const [active, setActive] = useState(false)
  const [, toggle] = useContext(camContext) as any

  const down = (event: ThreeEvent<PointerEvent>) => {
    console.log('down')
    setActive(true)
    toggle(false)
    event.stopPropagation()
    // @ts-expect-error
    event.target.setPointerCapture(event.pointerId)
  }

  const up = (event: ThreeEvent<PointerEvent>) => {
    console.log('up')
    setActive(false)
    toggle(true)
    event.stopPropagation()
    // @ts-expect-error
    event.target.releasePointerCapture(event.pointerId)
    if (onEnd) onEnd()
  }

  const move = (event: ThreeEvent<PointerEvent>) => {
    if (active) {
      event.stopPropagation()
      onDrag(event.unprojectedPoint)
    }
  }

  return { onPointerDown: down, onPointerUp: up, onPointerMove: move }
}

function EndPoint({ position, onDrag, onEnd }: any) {
  let [bindHover, hovered] = useHover(false)
  let bindDrag = useDrag(onDrag, onEnd)
  return (
    <mesh position={position} {...bindDrag} {...(bindHover as any)}>
      <sphereGeometry args={[7.5, 16, 16]} />
      <meshBasicMaterial color={hovered ? 'hotpink' : [0.1, 0.2, 0.9]} />
    </mesh>
  )
}

function Line({ defaultStart, defaultEnd }: any) {
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)
  const positions = useMemo(() => new Float32Array([...start, ...end]), [start, end])
  const lineRef = useRef<THREE.Line>(null!)
  useEffect(() => {
    const { current } = lineRef
    current.geometry.attributes.position.needsUpdate = true
    current.geometry.computeBoundingSphere()
  }, [lineRef, start, end])

  return (
    <>
      <line ref={lineRef as any}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="black" />
      </line>
      <EndPoint position={start} onDrag={(v: any) => setStart(v.toArray())} />
      <EndPoint position={end} onDrag={(v: any) => setEnd(v.toArray())} />
    </>
  )
}

const camContext = React.createContext(null)
function Controls({ children }: any) {
  const { gl, camera, invalidate } = useThree()
  const api = useState(true)
  const ref = useRef<OrbitControls>(null!)
  useEffect(() => {
    const current = ref.current
    const onChange = () => invalidate()

    // @ts-expect-error
    current.addEventListener('change', onChange)
    // @ts-expect-error
    return () => current.removeEventListener('change', onChange)
  }, [invalidate])

  return (
    <>
      <orbitControls ref={ref} args={[camera, gl.domElement]} enableDamping enabled={api[0]} />
      <camContext.Provider value={api as any}>{children}</camContext.Provider>
    </>
  )
}

export default function App() {
  return (
    <Canvas
      frameloop="demand"
      orthographic
      raycaster={{ params: { Line: { threshold: 5 } } as any }}
      camera={{ position: [0, 0, 500], zoom: 1 }}>
      <Controls>
        <Line defaultStart={[-100, -100, 0]} defaultEnd={[0, 100, 0]} />
        <Line defaultStart={[0, 100, 0]} defaultEnd={[100, -100, 0]} />
      </Controls>
    </Canvas>
  )
}
