import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { update, useTransition, useSpring, a } from 'react-spring/three'
import flat from 'lodash-es/flatten'
import { SVGLoader } from './../resources/loaders/SVGLoader'
import * as svgs from '../resources/images/svg'

const urls = Object.values(svgs)
const colors = ['#21242d', '#ea5158', '#0d4663', '#EE786E', '#2d4a3e', '#8bd8d2']
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

const Scene = React.memo(() => {
  const { viewport } = useThree()
  const [page, setPage] = useState(0)
  const [shapes, setShape] = useState([])
  useEffect(() => void setInterval(() => setPage(i => (i + 1) % urls.length), 3000), [])
  //window.s = setPage
  useEffect(() => void loaders[page].then(setShape), [page])
  const { color } = useSpring({
    from: { color: colors[0] },
    color: colors[page],
    delay: 500,
    config: { mass: 5, tension: 800, friction: 400 },
  })
  const transitions = useTransition(shapes, item => item.shape.uuid, {
    from: { rotation: [-0.2, 0.9, 0], position: [0, 50, -200], opacity: 0 },
    enter: { rotation: [0, 0, 0], position: [0, 0, 0], opacity: 1 },
    leave: { rotation: [0.2, -0.9, 0], position: [0, -400, 200], opacity: 0 },
    config: (item, state) =>
      state !== 'leave'
        ? { mass: 50, tension: 800, friction: 190, precision: 0.0001 }
        : { mass: 20, tension: 800, friction: 190, precision: 0.0001 },
    order: ['leave', 'enter', 'update'],
    lazy: true,
    trail: 15,
    unique: true,
    reset: true,
  })
  return (
    <>
      <ambientLight intensity={0.5} />
      <spotLight intensity={0.5} position={[300, 300, 4000]} />
      <mesh scale={[viewport.width * 2, viewport.height * 2, 1]} rotation={[0, deg(-20), 0]}>
        <planeGeometry attach="geometry" args={[1, 1]} />
        <a.meshPhongMaterial attach="material" color={color} depthTest={false} />
      </mesh>
      <a.group position={[1600, -700, page]} rotation={[0, deg(180), 0]}>
        {transitions.map(({ item: { shape, color, index }, key, props: { opacity, position, rotation } }) => (
          <a.mesh key={key} rotation={rotation} position={position.interpolate((x, y, z) => [x, y, z + -index * 50])}>
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
    </>
  )
})

export default function App() {
  return (
    <div class="main">
      <Canvas
        invalidateFrameloop
        camera={{
          fov: 90,
          position: [0, 0, 1800],
          rotation: [0, deg(-20), deg(180)],
          near: 0.1,
          far: 20000,
        }}>
        <Scene />
      </Canvas>
      <a href="https://tympanus.net/codrops" class="top-left" children="Article" />
      <a href="https://github.com/drcmda/react-three-fiber" class="top-right" children="Github" />
      <a href="https://twitter.com/0xca0a" class="bottom-left" children="Twitter" />
      <a
        href="https://www.instagram.com/tina.henschel/"
        class="bottom-right"
        children="Illustrations / Tina Henschel"
      />
      <span class="header">REACT THREE FIBER</span>
    </div>
  )
}
