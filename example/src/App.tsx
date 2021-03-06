import * as React from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from 'react-three-fiber'

export default function App() {
  const [showCube, setShowCube] = React.useState(false)
  const [color, setColor] = React.useState('pink')

  React.useEffect(() => {
    const interval = setInterval(() => setShowCube(showCube => !showCube), 1000)
    return () => clearInterval(interval)
  }, [])

  const size = useThree((state) => state.size)
  console.log(size)
  const group = React.useRef<THREE.Group>()
  useFrame(({ clock }) => {
    if (group.current) group.current.position.x = Math.sin(clock.elapsedTime)
  })

  return (
    <>
      <group ref={group}>
        <mesh onClick={() => setColor(color === 'pink' ? 'yellow' : 'pink')}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshBasicMaterial color={showCube ? 0x0000ff : 0xff0000} />
        </mesh>
        {showCube ? (
          <mesh position={[2, 0, 0]}>
            <boxGeometry args={[1, 1]} />
            <meshNormalMaterial  transparent opacity={0.5}/>
          </mesh>
        ) : (
          <mesh>
            <icosahedronGeometry args={[1]} />
            <meshBasicMaterial color="orange" transparent opacity={0.5} />
          </mesh>
        )}
      </group>
      <color attach="background" args={[color] as any} />
    </>
  )
}
