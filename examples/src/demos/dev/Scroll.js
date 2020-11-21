import * as THREE from 'three'
import * as React from 'react'
import { apply as extendSpring, useSpring, a, interpolate } from 'react-spring/three'
import { extend as extendThree, Canvas, useFrame, useThree } from 'react-three-fiber'
import styled from 'styled-components'
import data from '../../resources/data'

// Import and register postprocessing classes as three-native-elements
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GlitchPass } from '../../resources/postprocessing/GlitchPass'

extendSpring({ EffectComposer, RenderPass, GlitchPass })
extendThree({ EffectComposer, RenderPass, GlitchPass })

const planeBufferGeometryArgs1 = [5, 5]

/** This component loads an image and projects it onto a plane */
function Image({ url, opacity, scale, ...props }) {
  const texture = React.useMemo(() => new THREE.TextureLoader().load(url), [url])
  const [hovered, setHover] = React.useState(false)
  const onPointerOver = React.useCallback(() => setHover(true), [])
  const onPointerOut = React.useCallback(() => setHover(false), [])
  const { factor } = useSpring({ factor: hovered ? 1.1 : 1 })
  return (
    <a.mesh
      {...props}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      scale={factor.interpolate((f) => [scale * f, scale * f, 1])}
    >
      <planeBufferGeometry attach="geometry" args={planeBufferGeometryArgs1} />
      <a.meshLambertMaterial attach="material" transparent opacity={opacity}>
        <primitive attach="map" object={texture} />
      </a.meshLambertMaterial>
    </a.mesh>
  )
}

/** This renders text via canvas and projects it as a sprite */
function Text({ children, position, opacity, color = 'white', fontSize = 410 }) {
  const { viewport } = useThree()
  const { width, height } = viewport()
  const canvas = React.useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 2048
    const context = canvas.getContext('2d')
    context.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, avenir next, avenir, helvetica neue, helvetica, ubuntu, roboto, noto, segoe ui, arial, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = color
    context.fillText(children, 1024, 1024 - 410 / 2)
    return canvas
  }, [children, color, fontSize])
  const onUpdate = React.useCallback(function callback(s) {
    s.needsUpdate = true
  }, [])

  const scale = React.useMemo(
    function memo() {
      const scale = width > height ? width : height

      return [scale, scale, 1]
    },
    [height, width]
  )
  return (
    <a.sprite scale={scale} position={position}>
      <a.spriteMaterial attach="material" transparent opacity={opacity}>
        <canvasTexture attach="map" image={canvas} premultiplyAlpha onUpdate={onUpdate} />
      </a.spriteMaterial>
    </a.sprite>
  )
}

const planeBufferGeometryArgs2 = [1, 1]

/** This component creates a fullscreen colored plane */
function Background({ color }) {
  const { viewport } = useThree()
  const { width, height } = viewport()

  const scale = React.useMemo(
    function memo() {
      return [width, height, 1]
    },
    [width, height]
  )

  return (
    <mesh scale={scale}>
      <planeBufferGeometry args={planeBufferGeometryArgs2} />
      <a.meshBasicMaterial color={color} depthTest={false} />
    </mesh>
  )
}

function Star({ geo, mat, position }) {
  return <mesh geometry={geo} material={mat} position={position} />
}

/** This component rotates a bunch of stars */
function Stars({ position }) {
  let group = React.useRef()
  let theta = 0
  useFrame(() => {
    const r = 5 * Math.sin(THREE.Math.degToRad((theta += 0.01)))
    const s = Math.cos(THREE.Math.degToRad(theta * 2))
    group.current.rotation.set(r, r, r)
    group.current.scale.set(s, s, s)
  })
  const [geo, mat, coords] = React.useMemo(() => {
    const geo = new THREE.SphereBufferGeometry(1, 10, 10)
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('peachpuff') })
    const coords = new Array(1000)
      .fill()
      .map((i) => [Math.random() * 800 - 400, Math.random() * 800 - 400, Math.random() * 800 - 400])
    return [geo, mat, coords]
  }, [])

  return (
    <a.group ref={group} position={position}>
      {coords.map((position, i) => (
        <Star key={i} geo={geo} mat={mat} position={position} />
      ))}
    </a.group>
  )
}

/** This component creates a glitch effect */
const Effects = React.memo(({ factor }) => {
  const { gl, scene, camera, size } = useThree()
  const composer = React.useRef()
  React.useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  // This takes over as the main render-loop (when 2nd arg is set to true)
  useFrame(() => composer.current.render(), 1)
  const effectComposerArgs = React.useMemo(
    function memo() {
      return [gl]
    },
    [gl]
  )
  const renderPassArgs = React.useMemo(
    function memo() {
      return [scene, camera]
    },
    [scene, camera]
  )

  return (
    <effectComposer ref={composer} args={effectComposerArgs}>
      <renderPass attachArray="passes" args={renderPassArgs} />
      <a.glitchPass attachArray="passes" renderToScreen factor={factor} />
    </effectComposer>
  )
})

/** This component creates a bunch of parallaxed images */
function Images({ top, mouse, scrollMax }) {
  return data.map(([url, x, y, factor, z, scale], index) => (
    <Image
      key={index}
      url={url}
      scale={scale}
      opacity={top.interpolate([0, 500], [0, 1])}
      position={interpolate([top, mouse], (top, mouse) => [
        (-mouse[0] * factor) / 50000 + x,
        (mouse[1] * factor) / 50000 + y * 1.15 + ((top * factor) / scrollMax) * 2,
        z + top / 2000,
      ])}
    />
  ))
}

/** This component maintains the scene */
function Scene({ top, mouse }) {
  const { size } = useThree()
  const scrollMax = size.height * 4.5
  return (
    <>
      <a.spotLight intensity={1.2} color="white" position={mouse.interpolate((x, y) => [x / 100, -y / 100, 6.5])} />
      <Effects factor={top.interpolate([0, 150], [1, 0])} />
      <Background
        color={top.interpolate(
          [0, scrollMax * 0.25, scrollMax * 0.8, scrollMax],
          ['#27282F', '#247BA0', '#70C1B3', '#f8f3f1']
        )}
      />
      <Stars position={top.interpolate((top) => [0, -1 + top / 20, 0])} />
      <Images top={top} mouse={mouse} scrollMax={scrollMax} />
      <Text opacity={top.interpolate([0, 200], [1, 0])} position={top.interpolate((top) => [0, -1 + top / 200, 0])}>
        scroll
      </Text>
      <Text
        position={top.interpolate((top) => [0, -20 + ((top * 10) / scrollMax) * 2, 0])}
        color="black"
        fontSize={150}
      >
        down
      </Text>
    </>
  )
}

const style = { height: '525vh' }

/** Main component */
function Scroll() {
  // This tiny spring right here controls all(!) the animations, one for scroll, the other for mouse movement ...
  const [{ top, mouse }, set] = useSpring(() => ({ top: 0, mouse: [0, 0] }))
  const onMouseMove = React.useCallback(
    ({ clientX: x, clientY: y }) => set({ mouse: [x - window.innerWidth / 2, y - window.innerHeight / 2] }),
    [set]
  )
  const onScroll = React.useCallback((e) => set({ top: e.target.scrollTop }), [set])
  const [{ onGotPointerCaptureLegacy, ...events }, setEvents] = React.useState({})
  const onCreated = React.useCallback(function callback({ events }) {
    setEvents(events)
  }, [])
  return (
    <>
      <Canvas className="canvas" onCreated={onCreated}>
        <Scene top={top} mouse={mouse} />
      </Canvas>
      <Container onScroll={onScroll} onMouseMove={onMouseMove} {...events}>
        <div style={style} />
      </Container>
    </>
  )
}

export default React.memo(Scroll)

const Container = styled.div`
  position: absolute;
  overflow: auto;
  top: 0px;
  width: 100%;
  height: 100vh;
  font-size: 20em;
  font-weight: 800;
  line-height: 0.9em;
`
