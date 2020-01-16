import * as THREE from 'three'
import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react'
import { extend, Canvas, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
extend({ OrbitControls })

function useHover(stopPropagation = true) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(e => {
    if (stopPropagation) e.stopPropagation()
    setHover(true)
  }, [])
  const unhover = useCallback(e => {
    if (stopPropagation) e.stopPropagation()
    setHover(false)
  }, [])
  const [bind] = useState(() => ({ onPointerOver: hover, onPointerOut: unhover }))
  return [bind, hovered]
}

function useDrag(onDrag, onEnd) {
  const [active, setActive] = useState(false)
  const [, toggle] = useContext(camContext)

  const down = useCallback(e => {
    setActive(true)
    toggle(false)
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
  }, [])

  const up = useCallback(e => {
    setActive(false)
    toggle(true)
    e.stopPropagation()
    e.target.releasePointerCapture(e.pointerId)
    if (onEnd) onEnd()
  }, [])

  const activeRef = useRef()
  useEffect(() => void (activeRef.current = active))
  const move = useCallback(event => {
    if (activeRef.current) {
      event.stopPropagation()
      onDrag(event.unprojectedPoint)
    }
  }, [])

  const [bind] = useState(() => ({ onPointerDown: down, onPointerUp: up, onPointerMove: move }))
  return bind
}

function EndPoint({ position, onDrag, onEnd }) {
  let [bindHover, hovered] = useHover(false)
  let bindDrag = useDrag(onDrag, onEnd)

  /*const [active, setActive] = useState(true)
  if (!active) bindDrag = undefined
  if (!active) bindHover = undefined

  useEffect(() => void setTimeout(() => console.log('________inactive') || setActive(false), 2000), [])
  useEffect(() => void setTimeout(() => console.log('________active!!') || setActive(true), 6000), [])*/

  return (
    <mesh position={position} {...bindDrag} {...bindHover} onClick={e => console.log(e)}>
      <sphereBufferGeometry attach="geometry" args={[7.5, 16, 16]} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'white'} />
    </mesh>
  )
}

function Line({ defaultStart, defaultEnd }) {
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)
  const vertices = useMemo(() => [start, end].map(v => new THREE.Vector3(...v)), [start, end])
  const update = useCallback(self => ((self.verticesNeedUpdate = true), self.computeBoundingSphere()), [])
  return (
    <>
      <line>
        <geometry attach="geometry" vertices={vertices} onUpdate={update} />
        <lineBasicMaterial attach="material" color="white" />
      </line>
      <EndPoint position={start} onDrag={v => setStart(v.toArray())} />
      <EndPoint position={end} onDrag={v => setEnd(v.toArray())} />
    </>
  )
}

const camContext = React.createContext()
function Controls({ children }) {
  const { camera, invalidate, intersect } = useThree()
  const api = useState(true)
  const ref = useRef()
  useEffect(() => {
    const handler = ref.current.addEventListener('change', invalidate)
    return () => ref.current.removeEventListener('change', handler)
  }, [])

  //useEffect(() => setTimeout(() => console.log(intersect()), 3000), [])

  return (
    <>
      <orbitControls ref={ref} args={[camera]} enabled={api[0]} />
      <camContext.Provider value={api}>{children}</camContext.Provider>
    </>
  )
}

export default function App() {
  return (
    <Canvas
      invalidateFrameloop
      orthographic
      style={{ background: '#272727', touchAction: 'none' }}
      raycaster={{ linePrecision: 5 }}
      camera={{ position: [0, 0, 500] }}>
      <Controls>
        <Line defaultStart={[-100, -100, 0]} defaultEnd={[0, 100, 0]} />
        <Line defaultStart={[0, 100, 0]} defaultEnd={[100, -100, 0]} />
      </Controls>
    </Canvas>
  )
}
