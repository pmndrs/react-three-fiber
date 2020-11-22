import * as THREE from 'three'
import * as React from 'react'
import { extend, Canvas, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
extend({ OrbitControls })

function useHover(stopPropagation = true) {
  const [hovered, setHover] = React.useState(false)
  const hover = React.useCallback(
    (e) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      setHover(true)
    },
    [stopPropagation]
  )
  const unhover = React.useCallback(
    (e) => {
      if (stopPropagation) {
        e.stopPropagation()
      }
      setHover(false)
    },
    [stopPropagation]
  )
  const [bind] = React.useState(() => ({ onPointerOver: hover, onPointerOut: unhover }))
  return [bind, hovered]
}

function useDrag(onDrag, onEnd) {
  const [active, setActive] = React.useState(false)
  const [, toggle] = React.useContext(camContext)

  const down = React.useCallback(
    (e) => {
      setActive(true)
      toggle(false)
      e.stopPropagation()
      e.target.setPointerCapture(e.pointerId)
    },
    [toggle]
  )

  const up = React.useCallback(
    (e) => {
      setActive(false)
      toggle(true)
      e.stopPropagation()
      e.target.releasePointerCapture(e.pointerId)
      if (onEnd) onEnd()
    },
    [onEnd, toggle]
  )

  const activeRef = React.useRef()
  React.useEffect(() => void (activeRef.current = active))
  const move = React.useCallback(
    (event) => {
      if (activeRef.current) {
        event.stopPropagation()
        onDrag(event.unprojectedPoint)
      }
    },
    [onDrag]
  )

  const [bind] = React.useState(() => ({ onPointerDown: down, onPointerUp: up, onPointerMove: move }))
  return bind
}

const sphereBufferGeometryArgs = [7.5, 16, 16]

function EndPoint({ position, onDrag, onEnd }) {
  let [bindHover, hovered] = useHover(false)
  let bindDrag = useDrag(onDrag, onEnd)
  return (
    <mesh position={position} {...bindDrag} {...bindHover}>
      <sphereBufferGeometry attach="geometry" args={sphereBufferGeometryArgs} />
      <meshBasicMaterial attach="material" color={hovered ? 'hotpink' : 'white'} />
    </mesh>
  )
}

function Line({ defaultStart, defaultEnd }) {
  const [start, setStart] = React.useState(defaultStart)
  const [end, setEnd] = React.useState(defaultEnd)
  const vertices = React.useMemo(() => [start, end].map((v) => new THREE.Vector3(...v)), [start, end])
  const update = React.useCallback((self) => {
    self.verticesNeedUpdate = true
    self.computeBoundingSphere()
  }, [])
  const onDragStart = React.useCallback(function callback(v) {
    setStart(v.toArray())
  }, [])
  const onDragEnd = React.useCallback(function callback(v) {
    setEnd(v.toArray())
  }, [])
  return (
    <>
      <line>
        <geometry attach="geometry" vertices={vertices} onUpdate={update} />
        <lineBasicMaterial attach="material" color="white" />
      </line>
      <EndPoint position={start} onDrag={onDragStart} />
      <EndPoint position={end} onDrag={onDragEnd} />
    </>
  )
}

const camContext = React.createContext()
function Controls({ children }) {
  const { gl, camera, invalidate } = useThree()
  const api = React.useState(true)
  const ref = React.useRef()
  React.useEffect(() => {
    const current = ref.current
    const handler = current.addEventListener('change', invalidate)
    return () => current.removeEventListener('change', handler)
  }, [invalidate])

  const args = React.useMemo(() => [camera, gl.domElement], [camera, gl.domElement])

  return (
    <>
      <orbitControls ref={ref} args={args} enableDamping enabled={api[0]} />
      <camContext.Provider value={api}>{children}</camContext.Provider>
    </>
  )
}

const style = { background: '#272727', touchAction: 'none' }
const raycaster = { params: { Line: { threshold: 5 } } }
const camera = { position: [0, 0, 500] }
const line1defaultStart = [-100, -100, 0]
const line1defaultEnd = [0, 100, 0]
const line2defaultStart = [0, 100, 0]
const line2defaultEnd = [100, -100, 0]

function Lines() {
  return (
    <Canvas invalidateFrameloop orthographic style={style} raycaster={raycaster} camera={camera}>
      <Controls>
        <Line defaultStart={line1defaultStart} defaultEnd={line1defaultEnd} />
        <Line defaultStart={line2defaultStart} defaultEnd={line2defaultEnd} />
      </Controls>
    </Canvas>
  )
}

export default React.memo(Lines)
