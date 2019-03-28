import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { update, useTransition, useSpring, animated as anim } from 'react-spring/three'
import flat from 'lodash-es/flatten'
import { SVGLoader } from './../resources/loaders/SVGLoader'
import * as svgs from '../resources/images/svg'
const urls = Object.values(svgs)
const colors = ['#21242d', '#ea5158', '#0d4663', '#ffbcb7', '#2d4a3e', '#8bd8d2']
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
  useEffect(() => void setInterval(() => setPage(i => (i + 1) % urls.length), 4000), [])
  //window.s = setPage
  useEffect(() => void loaders[page].then(setShape), [page])
  const { color } = useSpring({
    from: { color: colors[0] },
    color: colors[page],
    delay: 500,
    config: { mass: 5, tension: 800, friction: 400 },
  })
  const transitions = useTransition(shapes, item => item.shape.uuid, {
    from: { position: [0, 50, -200], opacity: 0 },
    enter: { position: [0, 0, 0], opacity: 1 },
    leave: { position: [0, -400, 200], opacity: 0 },
    config: { mass: 5, tension: 800, friction: 90, precision: 0.1 },
    order: ['leave', 'enter', 'update'],
    lazy: true,
    trail: 15,
  })
  return (
    <>
      <mesh scale={[viewport.width * 2, viewport.height * 2, 1]} rotation={[0, deg(-20), 0]}>
        <planeGeometry name="geometry" args={[1, 1]} />
        <anim.meshPhongMaterial name="material" color={color} depthTest={false} />
      </mesh>
      <anim.group position={[1600, -700, page]} rotation={[0, deg(180), 0]}>
        {transitions.map(({ item: { shape, color, index }, key, props: { opacity, position } }) => (
          <anim.mesh key={key} position={position.interpolate((x, y, z) => [x, y, z + -index * 50])}>
            <anim.meshPhongMaterial
              attach="material"
              color={color}
              opacity={opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
              transparent
            />
            <shapeBufferGeometry attach="geometry" args={[shape]} />
          </anim.mesh>
        ))}
      </anim.group>
    </>
  )
})

export default function App() {
  return (
    <div class="main">
      <Canvas
        invalidateFrameloop={true}
        camera={{
          fov: 80,
          position: [0, 0, 2000],
          rotation: [0, deg(-20), deg(180)],
          near: 0.1,
          far: 20000,
        }}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.5} position={[300, 300, 4000]} />
        <Scene />
      </Canvas>
      <a href="https://github.com/drcmda/react-three-fiber" class="top-left" children="Github" />
      <a href="https://twitter.com/0xca0a" class="top-right" children="Twitter" />
      <a href="https://github.com/react-spring/react-spring" class="bottom-left" children="+ react-spring" />
      <a
        href="https://www.instagram.com/tina.henschel/"
        class="bottom-right"
        children="Illustrations @ Tina Henschel"
      />
      <span class="header">React Three Fiber</span>
    </div>
  )
}
