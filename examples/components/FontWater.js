import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import fontFile from './../resources/fonts/unknown'
apply({ OrbitControls })

/** This renders text via canvas and projects it as a sprite */
function Text({ children, size = 1, letterSpacing = 0.01, color = '#000000' }) {
  const [font] = useState(() => new THREE.FontLoader().parse(fontFile))
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
    <group position={[-x / 2, -y / 2, 0]}>
      {shapes.map((shape, index) => (
        <primitive key={index} object={shape} />
      ))}
    </group>
  )
}

function Content() {
  const camera = useRef()
  const controls = useRef()
  const { size, setDefaultCamera } = useThree()
  useEffect(() => void setDefaultCamera(camera.current), [])
  useRender(() => controls.current.update())
  return (
    <>
      <perspectiveCamera
        ref={camera}
        aspect={size.width / size.height}
        radius={(size.width + size.height) / 4}
        fov={55}
        position={[0, 0, 5]}
        onUpdate={self => self.updateProjectionMatrix()}
      />
      {camera.current && (
        <group>
          <orbitControls ref={controls} args={[camera.current]} enableDamping dampingFactor={0.1} rotateSpeed={0.1} />
          <Text>lorem</Text>
        </group>
      )}
    </>
  )
}

export default function App() {
  return (
    <Canvas style={{ background: '#dfdfdf' }}>
      <Content />
    </Canvas>
  )
}
