import * as React from 'react'
import { Canvas, useResource, createPortal } from 'react-three-fiber'

const activeScale = [2, 2, 2]
const inactiveScale = [1, 1, 1]
const icosahedronBufferGeometryArgs = [1, 0]

function Icosahedron() {
  const [active, set] = React.useState(false)
  const handleClick = React.useCallback((e) => set((state) => !state), [])
  return (
    <mesh scale={active ? activeScale : inactiveScale} onClick={handleClick}>
      <icosahedronBufferGeometry attach="geometry" args={icosahedronBufferGeometryArgs} />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

const position1 = [-2, 0, 0]
const sphereBufferGeometryArgs = [0.5, 16, 16]

function RenderToPortal({ targets }) {
  const [target, set] = React.useState(targets[0])
  React.useEffect(() => {
    const timeout = window.setTimeout(() => set(targets[1]), 1000)
    return () => { window.clearTimeout(timeout) }
  }, [targets])
  return (
    <>
      <mesh position={position1}>
        <sphereBufferGeometry attach="geometry" args={sphereBufferGeometryArgs} />
        <meshNormalMaterial attach="material" />
      </mesh>
      {createPortal(<Icosahedron />, target)}
    </>
  )
}

const position2 = [0, 0, 0]
const position3 = [2, 0, 0]

function Group() {
  const ref1 = useResource()
  const ref2 = useResource()

  return (
    <group>
      <group ref={ref1} position={position2} />
      <group ref={ref2} position={position3} />
      { /* Do not memoise refs! */ }
      {ref1.current && ref2.current && <RenderToPortal targets={[ref1.current, ref2.current]} />}
    </group>
  )
}

function Reparenting() {
  return (
    <Canvas>
      <Group />
    </Canvas>
  )
}

export default React.memo(Reparenting)
