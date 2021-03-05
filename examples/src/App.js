import React from 'react'
import * as THREE from 'three'

import { useThree } from '../../src/web'

const col = new THREE.Color(0xff0000)

export default function App() {
  const matRef = React.useRef()
  const intRef = React.useRef()
  const [showCube, setShowCube] = React.useState(false)

  const [color, setColor] = React.useState('pink')

  React.useEffect(() => {
    const { current: mat } = matRef

    if (mat) {
      intRef.current = setInterval(() => {
        if (mat.color.r === 1) {
          mat.color = col.set(0x0000ff)
        } else {
          mat.color = col.set(0xff0000)
        }

        setShowCube(!showCube)
      }, 1000)
    }

    return () => {
      clearInterval(intRef.current)
    }
  }, [showCube, setShowCube])

  const handlePointerDown = () => {
    console.log('clicked')
    if (color === 'pink') {
      setColor('yellow')
    } else {
      setColor('pink')
    }
  }

  const a = useThree((state) => state.clock)
  console.log(a)

  return (
    <>
      <group>
        <mesh onPointerDown={handlePointerDown}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial ref={matRef} color={col} />
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
      <color attach="background" args={[color]} />
    </>
  )
}
