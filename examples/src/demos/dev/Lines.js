import * as THREE from 'three'
import React, { useRef, useEffect, useState, useCallback, useContext, useMemo } from 'react'
import { extend, Canvas, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
extend({ OrbitControls })

function useHover(stopPropagation = true) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(
    (e) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      setHover(true)
    },
    [stopPropagation]
  )
  const unhover = useCallback(
    (e) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      setHover(false)
    },
    [stopPropagation]
  )
  const [bind] = useState(() => ({ onPointerOver: hover, onPointerOut: unhover }))
  return [bind, hovered]
}

function useDrag(onDrag, onEnd) {
  const [active, setActive] = useState(false)
  const [, toggle] = useContext(camContext)

  const down = useCallback(
    (e) => {
      setActive(true)
      toggle(false)
      e.stopPropagation()
      e.target.setPointerCapture(e.pointerId)
    },
    [toggle]
  )

  const up = useCallback(
    (e) => {
      setActive(false)
      toggle(true)
      e.stopPropagation()
      e.target.releasePointerCapture(e.pointerId)
      if (onEnd) onEnd()
    },
    [onEnd, toggle]
  )

  const activeRef = useRef()
  useEffect(() => void (activeRef.current = active))
  const move = useCallback(
    (event) => {
      if (activeRef.current) {
        event.stopPropagation()
        onDrag(event.unprojectedPoint)
      }
    },
    [onDrag]
  )

  const [bind] = useState(() => ({ onPointerDown: down, onPointerUp: up, onPointerMove: move }))
  return bind
}

function EndPoint({ position, onDrag, onEnd }) {
  let [bindHover, hovered] = useHover(false)
  let bindDrag = useDrag(onDrag, onEnd)
  return (
    <mesh position={position} {...bindDrag} {...bindHover}>
      <sphereBufferGeometry attach="geometry" args={[7.5, 16, 16]} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'white'} />
    </mesh>
  )
}

function Line({ defaultStart, defaultEnd }) {
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(defaultEnd)
  const vertices = useMemo(() => [start, end].map((v) => new THREE.Vector3(...v)), [start, end])
  const update = useCallback((self) => {
    self.verticesNeedUpdate = true
    self.computeBoundingSphere()
  }, [])
  return (
    <>
      <line>
        <geometry attach="geometry" vertices={vertices} onUpdate={update} />
        <lineBasicMaterial attach="material" color="white" />
      </line>
      <EndPoint position={start} onDrag={(v) => setStart(v.toArray())} />
      <EndPoint position={end} onDrag={(v) => setEnd(v.toArray())} />
    </>
  )
}

const camContext = React.createContext()
function Controls({ children }) {
  const { gl, camera, invalidate } = useThree()
  const api = useState(true)
  const ref = useRef()
  useEffect(() => {
    const current = ref.current
    const handler = current.addEventListener('change', invalidate)
    return () => current.removeEventListener('change', handler)
  }, [invalidate])

  return (
    <>
      <orbitControls ref={ref} args={[camera, gl.domElement]} enableDamping enabled={api[0]} />
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
