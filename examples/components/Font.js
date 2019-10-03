import * as THREE from 'three'
import React, { Suspense, useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { apply, Canvas, useFrame, useThree, useResource, useLoader } from 'react-three-fiber'
import bold from 'file-loader!../resources/fonts/bold.blob'

function Text({
  children,
  vAlign = 'center',
  hAlign = 'center',
  size = 1,
  letterSpacing = 0.01,
  color = '#000000',
  ...props
}) {
  const font = useLoader(THREE.FontLoader, bold)
  const [shapes, [x, y]] = useMemo(() => {
    let x = 0,
      y = 0
    let letters = [...children]
    let mat = new THREE.MeshBasicMaterial({ color, opacity: 1, transparent: true })
    return [
      letters.map(letter => {
        const geom = new THREE.ShapeGeometry(font.generateShapes(letter, size, 1))
        geom.computeBoundingBox()
        const mesh = new THREE.Mesh(geom, mat)
        mesh.position.x = x
        x += geom.boundingBox.max.x + letterSpacing
        y = Math.max(y, geom.boundingBox.max.y)
        return mesh
      }),
      [x, y],
    ]
  }, [children])
  return (
    <group {...props}>
      <group
        position={[
          vAlign === 'center' ? -x / 2 : vAlign === 'right' ? -x : 0,
          hAlign === 'center' ? -y / 2 : hAlign === 'right' ? -y : 0,
          0,
        ]}>
        {shapes.map((shape, index) => (
          <primitive key={index} object={shape} />
        ))}
      </group>
    </group>
  )
}

function Rig() {
  const target = useRef()
  useFrame(({ camera, scene }) => {
    const t = Date.now() * 0.001
    const rx = Math.sin(t * 0.7) * 0.5
    const ry = Math.sin(t * 0.3) * 0.5
    const rz = Math.sin(t * 0.2) * 0.5
    target.current.rotation.x = rx
    target.current.rotation.y = ry
    target.current.rotation.z = rz
  })

  return (
    <group ref={target} scale={[0.7, 0.7, 0.7]}>
      <Text vAlign="right" position={[0, 1.1, 0]} children="REACT" />
      <Text vAlign="right" position={[0, 0, 0]} children="THREE" />
      <Text vAlign="right" position={[0, -1.1, 0]} children="FIBER" />
      <Text vAlign="right" size={3.3} position={[2.8, 0, 0]} children="3" />
      <Text vAlign="right" position={[3.9, -1.1, 0]} children="X" />
    </group>
  )
}

export default function App() {
  return (
    <Canvas pixelRatio={window.devicePixelRatio} style={{ background: '#dfdfdf' }}>
      <Suspense fallback={null}>
        <Rig />
      </Suspense>
    </Canvas>
  )
}
