import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react'
import { extend, Canvas, useThree, ReactThreeFiber } from '@react-three/fiber'
// @ts-ignore
import { OrbitControls } from 'three-stdlib'
extend({ OrbitControls })

declare global {
  namespace JSX {
    interface IntrinsicElements {
      orbitControls: ReactThreeFiber.Node<OrbitControls, typeof OrbitControls>
    }
  }
}

function useHover(stopPropagation = true) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(
    (e) => {
      if (stopPropagation) e.stopPropagation()
      setHover(true)
    },
    [stopPropagation],
  )
  const unhover = useCallback(
    (e) => {
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

  const down = useCallback(
    (e) => {
      console.log('down')
      setActive(true)
      toggle(false)
      e.stopPropagation()
      e.target.setPointerCapture(e.pointerId)
    },
    [toggle],
  )

  const up = useCallback(
    (e) => {
      console.log('up')
      setActive(false)
      toggle(true)
      e.stopPropagation()
      e.target.releasePointerCapture(e.pointerId)
      if (onEnd) onEnd()
    },
    [onEnd, toggle],
  )

  const activeRef = useRef<any>()
  useEffect(() => void (activeRef.current = active))
  const move = useCallback(
    (event) => {
      if (activeRef.current) {
        event.stopPropagation()
        onDrag(event.unprojectedPoint)
      }
    },
    [onDrag],
  )

  const [bind] = useState(() => ({ onPointerDown: down, onPointerUp: up, onPointerMove: move }))
  return bind
}

function EndPoint({ position, onDrag, onEnd }: any) {
  let [bindHover, hovered] = useHover(false)
  let bindDrag = useDrag(onDrag, onEnd)
  return (
    <mesh position={position} {...bindDrag} {...bindHover}>
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
          <bufferAttribute
            attachObject={['attributes', 'position']}
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="white" />
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
    current.addEventListener('change', invalidate)
    return () => current.removeEventListener('change', invalidate)
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
      style={{ background: '#272727', touchAction: 'none' }}
      raycaster={{ params: { Line: { threshold: 5 } } }}
      camera={{ position: [0, 0, 500], zoom: 1 }}>
      <Controls>
        <Line defaultStart={[-100, -100, 0]} defaultEnd={[0, 100, 0]} />
        <Line defaultStart={[0, 100, 0]} defaultEnd={[100, -100, 0]} />
      </Controls>
    </Canvas>
  )
}
