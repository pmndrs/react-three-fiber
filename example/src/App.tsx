import * as React from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from 'react-three-fiber'

const col = new THREE.Color(0xff0000)

export default function App() {
  const material = React.useRef<THREE.MeshBasicMaterial>()
  const [showCube, setShowCube] = React.useState(false)
  const [color, setColor] = React.useState('pink')

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (material.current) material.current.color = col.set(material.current.color.r === 1 ? 0x0000ff : 0xff0000)
      setShowCube(!showCube)
    }, 1000)
    return () => clearInterval(interval)
  }, [showCube, setShowCube])

  const handlePointerDown = () => setColor(color === 'pink' ? 'yellow' : 'pink')
  const a = useThree((state) => state.clock)
  const group = React.useRef<THREE.Group>()
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = Math.sin(clock.elapsedTime)
  })

  return (
    <>
      <group ref={group}>
        <mesh onPointerDown={handlePointerDown}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial ref={material} color={col} />
        </mesh>
        {showCube ? (
          <mesh position={[2, 0, 0]}>
            <boxBufferGeometry args={[1, 1]} />
            <meshNormalMaterial />
          </mesh>
        ) : (
          <mesh>
            <icosahedronBufferGeometry args={[1]} />
            <meshBasicMaterial color="orange" />
          </mesh>
        )}
      </group>
      <color attach="background" args={[color] as any} />
    </>
  )
}
