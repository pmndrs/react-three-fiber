import * as THREE from 'three'
import React, { forwardRef, useMemo } from 'react'
import fontJson from './resources/firasans_regular.json'

const font = new THREE.FontLoader().parse(fontJson)
const geom = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(
  number => new THREE.TextGeometry(number, { font, size: 5, height: 0.1 })
)

const Text = forwardRef(
  ({ children, vAlign = 'center', hAlign = 'center', size = 0.1, color = 'white', ...props }, ref) => {
    const array = useMemo(() => [...children], [children])
    return (
      <group ref={ref} {...props} dispose={null}>
        {array.map((char, index) => (
          <mesh
            position={[-(array.length / 2) * 3.5 + index * 3.5, 0, 0]}
            key={index}
            geometry={geom[parseInt(char)]}>
            <meshBasicMaterial attach="material" color={color} transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    )
  }
)

export default Text
