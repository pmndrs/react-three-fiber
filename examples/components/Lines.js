import * as THREE from 'three'
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Canvas, useUpdate, useThree } from 'react-three-fiber'

function useHover() {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(e => setHover(true), [])
  const unhover = useCallback(e => setHover(false), [])
  const [bind] = useState(() => ({ onPointerOver: hover, onPointerOut: unhover }))
  return [bind, hovered]
}

function useDrag(onDrag, onEnd) {
  const { viewport } = useThree()
  const size = useRef()
  useEffect(() => void (size.current = viewport))

  const down = useCallback(e => {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
  }, [])
  const up = useCallback(e => {
    e.stopPropagation()
    e.target.releasePointerCapture(e.pointerId)
    if (onEnd) onEnd()
  }, [])

  const move = useCallback(e => {
    if (e.buttons === 1) {
      e.stopPropagation()
      const x = e.clientX / size.current.factor - size.current.width / 2
      const y = -(e.clientY / size.current.factor - size.current.height / 2)
      onDrag(x, y)
    }
  }, [])

  const [bind] = useState(() => ({ onPointerDown: down, onPointerUp: up, onPointerMove: move }))
  return bind
}

function EndPoint({ position, onDrag, onEnd }) {
  const [bindHover, hovered] = useHover()
  const bindDrag = useDrag(onDrag, onEnd)
  return (
    <mesh position={position} {...bindDrag} {...bindHover}>
      <sphereBufferGeometry attach="geometry" args={[10, 16, 16]} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'white'} />
    </mesh>
  )
}

function Line() {
  const [start, setStart] = useState([0, 0, 0])
  const [end, setEnd] = useState([100, 0, 0])
  const ref = useUpdate(
    geom => {
      geom.vertices = [start, end].map(v => new THREE.Vector3(...v))
      geom.verticesNeedUpdate = true
      geom.computeBoundingSphere()
    },
    [start, end]
  )
  const [bindHover, hovered] = useHover()
  const bindDrag = useDrag((x, y) => {
    setStart([start[0] + x, start[1] + y, 0])
    setEnd([end[0] + x, end[1] + y, 0])
  })
  return (
    <>
      <line {...bindHover} {...bindDrag}>
        <geometry ref={ref} attach="geometry" />
        <lineBasicMaterial attach="material" color={hovered ? 'hotpink' : 'white'} />
      </line>
      <EndPoint position={start} onDrag={(x, y) => setStart([x, y, 0])} />
      <EndPoint position={end} onDrag={(x, y) => setEnd([x, y, 0])} />
    </>
  )
}

export default function App() {
  return (
    <Canvas orthographic raycaster={{ linePrecision: 5 }}>
      <Line />
    </Canvas>
  )
}
