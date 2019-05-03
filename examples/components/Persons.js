import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { useTransition, a } from 'react-spring/three'
import { useRoute, useLocation, Link, Route, Switch } from 'wouter'
import flat from 'lodash-es/flatten'
import { SVGLoader } from './../resources/loaders/SVGLoader'
import * as persons from '../resources/images/svg/persons'

const names = Object.keys(persons)
const urls = Object.values(persons)
const deg = THREE.Math.degToRad
const loaders = urls.map(
  url =>
    new Promise(res =>
      new SVGLoader().load(url, shapes =>
        res(
          flat(shapes.map((group, index) => group.toShapes(true).map(shape => ({ shape, color: group.color, index }))))
        )
      )
    )
)

function Person() {
  const [match, params] = useRoute('/person/:name')
  const index = match ? names.indexOf(params.name) : 0
  const [shapes, setShapes] = useState([])
  useEffect(() => void loaders[index].then(setShapes), [index])

  const transitions = useTransition(shapes, item => item.shape.uuid, {
    from: { position: [-50, 0, 0], rotation: [0, -0.6, 0], opacity: 0 },
    enter: { position: [0, 0, 0], rotation: [0, 0.3, 0], opacity: 1 },
    leave: { position: [50, 0, 0], rotation: [0, 0.6, 0], opacity: 0 },
    order: ['leave', 'enter', 'update'],
    lazy: true,
    trail: 5,
    unique: true,
    reset: true,
  })

  return (
    <a.group position={[500, -400, 0]} rotation={[0, deg(180), 0]}>
      {transitions.map(({ item: { shape, color, index }, key, props: { opacity, position, rotation } }) => (
        <a.mesh key={key} rotation={rotation} position={position.interpolate((x, y, z) => [x, y, 0])}>
          <a.meshPhongMaterial
            attach="material"
            color={color}
            opacity={opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            transparent
          />
          <shapeBufferGeometry attach="geometry" args={[shape]} />
        </a.mesh>
      ))}
    </a.group>
  )
}

function Name() {
  const [match, params] = useRoute('/person/:name')
  const name = match ? params.name : names[0]
  return <span class="middle">{name}</span>
}

export default function App() {
  return (
    <div class="main">
      <Name />
      <Canvas
        camera={{
          fov: 90,
          position: [0, 0, 500],
          rotation: [0, 0, deg(180)],
          near: 0.1,
          far: 20000,
        }}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.5} position={[300, 300, 4000]} />
        <Person />
      </Canvas>
      <a href="https://github.com/drcmda/react-three-fiber" class="top-left" children="Github" />
      <span class="top-right">
        {names.map(person => (
          <>
            <Link to={`/person/${person}`}>{person}</Link>&nbsp;
          </>
        ))}
      </span>
      <a href="https://www.instagram.com/tina.henschel/" class="bottom-left" children="Illustrations / Tina Henschel" />
    </div>
  )
}
