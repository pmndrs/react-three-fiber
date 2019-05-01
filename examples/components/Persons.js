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
import { AfterimagePass } from './../resources/postprocessing/AfterimagePass'
import { FXAAShader } from './../resources/shaders/FXAAShader'
apply({ EffectComposer, ShaderPass, RenderPass, GlitchPass, AfterimagePass })

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

function Person() {
  const [index, setIndex] = useState(0)
  const [shapes, setShapes] = useState([])
  useEffect(() => void loaders[index].then(setShapes), [index])
  useEffect(() => void setInterval(() => setIndex(i => (i + 1) % loaders.length), 3000), [])

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

const Effect = React.memo(({ factor }) => {
  const { gl, scene, camera, size } = useThree()
  const composer = useRef()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  // This takes over as the main render-loop (when 2nd arg is set to true)
  useRender(() => composer.current.render(), true)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <afterimagePass attachArray="passes" factor={0.94} />
      <shaderPass
        attachArray="passes"
        args={[FXAAShader]}
        material-uniforms-resolution-value={[1 / size.width, 1 / size.height]}
        renderToScreen
      />
    </effectComposer>
  )
})

export default function App() {
  return (
    <div class="main">
      <span class="middle">Test</span>
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
