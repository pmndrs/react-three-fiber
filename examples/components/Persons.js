import * as THREE from 'three'
import React, { useState, useRef, useContext, useEffect, useCallback, useMemo } from 'react'
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { apply as applySpring, update, useTransition, useSpring, a } from 'react-spring/three'
import flat from 'lodash-es/flatten'
import { SVGLoader } from './../resources/loaders/SVGLoader'
import * as svgs from '../resources/images/svg/persons'
import { EffectComposer } from './../resources/postprocessing/EffectComposer'
import { ShaderPass } from './../resources/postprocessing/ShaderPass'
import { RenderPass } from './../resources/postprocessing/RenderPass'
import { GlitchPass } from './../resources/postprocessing/GlitchPass'
import { FXAAShader } from './../resources/shaders/FXAAShader'
apply({ EffectComposer, ShaderPass, RenderPass, GlitchPass })

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

function Person({ index }) {
  const [shapes, setShape] = useState([])
  useEffect(() => void loaders[index].then(setShape), [index])

  const [hovered, set] = useState(false)
  const hover = e => (e.stopPropagation(), set(true))
  const unhover = e => (e.stopPropagation(), set(false))
  const props = useSpring({ active: hovered ? 1 : 0, position: hovered ? [0, -50, 0] : [0, 0, 0] })

  return (
    <a.group
      onPointerOver={hover}
      onPointerOut={unhover}
      position={props.position.interpolate((x, y) => [index * 300 + index * 100, y + -400, -index])}
      rotation={[0, deg(180), 0]}>
      {shapes.map(({ shape, color, index }) => (
        <a.mesh
          key={shape.uuid}
          scale={props.active.interpolate(a => [1 + a * 0.2, 1 + a * 0.2, 1])}
          position={props.active.interpolate(a => [0, 0, a * -index])}>
          <meshPhongMaterial
            attach="material"
            color={color}
            opacity={1}
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

const Scene = React.memo(({ xy }) => {
  const { viewport } = useThree()
  return (
    <>
      <Person index={0} />
      <Person index={1} />
      <Person index={2} />
      <Person index={3} />
    </>
  )
})

const Effect = React.memo(({ factor }) => {
  const { gl, scene, camera, size } = useThree()
  const composer = useRef()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  // This takes over as the main render-loop (when 2nd arg is set to true)
  useRender(() => composer.current.render(), true)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <glitchPass attachArray="passes" renderToScreen factor={0} />
    </effectComposer>
  )
})

export default function App() {
  const calc = (x, y) => [x - window.innerWidth / 2, y - window.innerHeight / 2]
  const [spring, set] = useSpring(() => ({ xy: [0, 0], config: { mass: 10, tension: 550, friction: 140 } }))
  return (
    <div class="main" onMouseMove={({ clientX: x, clientY: y }) => set({ xy: calc(x, y) })}>
      <Canvas
        style={{ background: '#632e55' }}
        camera={{
          fov: 90,
          position: [0, 0, 500],
          rotation: [0, 0, deg(180)],
          near: 0.1,
          far: 20000,
        }}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.5} position={[300, 300, 4000]} />
        <mesh scale={[10000, 10000, 1]}>
          <planeGeometry attach="geometry" args={[1, 1]} />
          <meshPhongMaterial attach="material" color="#481d3d" depthTest={false} />
        </mesh>
        <Scene xy={spring.xy} />
      </Canvas>
      <a href="https://tympanus.net/codrops" class="top-left" children="Article" />
      <a href="https://github.com/drcmda/react-three-fiber" class="top-right" children="Github" />
      <a href="https://twitter.com/0xca0a" class="bottom-left" children="Twitter" />
      <a
        href="https://www.instagram.com/tina.henschel/"
        class="bottom-right"
        children="Illustrations / Tina Henschel"
      />
    </div>
  )
}
