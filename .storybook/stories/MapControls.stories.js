import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader'
import { Box3, Sphere } from 'three'
import { useLoader, Canvas } from 'react-three-fiber'

import { MapControls } from '../../src/MapControls'

export default {
  title: 'Controls/MapControls',
  component: MapControlsScene,
}

function Cell(props) {
  const { color, shape, fillOpacity } = props

  return (
    <mesh>
      <meshBasicMaterial attach="material" color={color} opacity={fillOpacity} depthWrite={false} transparent />
      <shapeBufferGeometry attach="geometry" args={[shape]} />
    </mesh>
  )
}

function Svg() {
  const [center, setCenter] = useState([0, 0, 0])
  const ref = useRef()

  const { paths } = useLoader(SVGLoader, 'map.svg')

  const shapes = useMemo(
    () =>
      paths.flatMap((p) =>
        p.toShapes(true).map((shape) => ({ shape, color: p.color, fillOpacity: p.userData.style.fillOpacity }))
      ),
    [paths]
  )

  useEffect(() => {
    const box = new Box3().setFromObject(ref.current)
    const sphere = new Sphere()
    box.getBoundingSphere(sphere)
    setCenter([-sphere.center.x, -sphere.center.y, 0])
  }, [])

  return (
    <group position={center} ref={ref}>
      {shapes.map((props) => (
        <Cell key={props.shape.uuid} {...props} />
      ))}
    </group>
  )
}

function MapControlsScene() {
  return (
    <Canvas orthographic camera={{ position: [0, 0, 50], zoom: 10, up: [0, 0, 1], far: 10000 }}>
      <color attach="background" args={[0xf3f3f3]} />
      <Suspense fallback={null}>
        <Svg />
      </Suspense>
      <MapControls />
    </Canvas>
  )
}

export const MapControlsSceneSt = () => <MapControlsScene />
MapControlsSceneSt.story = {
  name: 'Default',
}
