import * as THREE from 'three'
import * as React from 'react'
import { Canvas, extend, useFrame, useThree } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import { GlitchPass } from './../resources/postprocessing/GlitchPass'
import { WaterPass } from './../resources/postprocessing/WaterPass'

// Makes these prototypes available as "native" jsx-string elements
extend({ EffectComposer, ShaderPass, RenderPass, WaterPass, UnrealBloomPass, FilmPass, GlitchPass })

const scale1 = [1, 1, 6]
const args1 = [4, 0]
const args2 = [1, 0]

function SwarmComponent({ count, mouse }) {
  const mesh = React.useRef()
  const light = React.useRef()
  const { viewport } = useThree()
  const aspect = viewport().factor
  const dummy = React.useMemo(() => new THREE.Object3D(), [])
  // Generate some random positions, speed factors and timings
  const particles = React.useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100
      const factor = 20 + Math.random() * 100
      const speed = 0.01 + Math.random() / 200
      const xFactor = -50 + Math.random() * 100
      const yFactor = -50 + Math.random() * 100
      const zFactor = -50 + Math.random() * 100
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 })
    }
    return temp
  }, [count])
  // The innards of this hook will run every frame
  useFrame((state) => {
    // Makes the light follow the mouse
    light.current.position.set(mouse.current[0] / aspect, -mouse.current[1] / aspect, 0)
    // Run through the randomized data to calculate some movement
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle
      // There is no sense or reason to any of this, just messing around with trigonometric functions
      t = particle.t += speed / 2
      const a = Math.cos(t) + Math.sin(t * 1) / 10
      const b = Math.sin(t) + Math.cos(t * 2) / 10
      const s = Math.cos(t)
      particle.mx += (mouse.current[0] - particle.mx) * 0.01
      particle.my += (mouse.current[1] * -1 - particle.my) * 0.01
      // Update the dummy object
      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      )
      dummy.scale.set(s, s, s)
      dummy.rotation.set(s * 5, s * 5, s * 5)
      dummy.updateMatrix()
      // And apply the matrix to the instanced item
      mesh.current.setMatrixAt(i, dummy.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })
  const instancedMeshArgs = React.useMemo(() => [null, null, count], [count])

  return (
    <>
      <pointLight ref={light} distance={40} intensity={8} color="lightblue">
        <mesh scale={scale1}>
          <dodecahedronBufferGeometry attach="geometry" args={args1} />
          <meshBasicMaterial attach="material" color="lightblue" transparent />
        </mesh>
      </pointLight>
      <instancedMesh ref={mesh} args={instancedMeshArgs}>
        <dodecahedronBufferGeometry attach="geometry" args={args2} />
        <meshStandardMaterial attach="material" color="#020000" roughness={0.5} metalness={0.5} />
      </instancedMesh>
    </>
  )
}

const filmPassArgs = [0.25, 0.4, 1500, false]

function Effect({ down }) {
  const composer = React.useRef()
  const { scene, gl, size, camera } = useThree()
  const aspect = React.useMemo(() => new THREE.Vector2(size.width, size.height), [size])
  React.useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(() => composer.current.render(), 1)
  const effectComposerArgs = React.useMemo(() => [gl], [gl])

  const unrealBloomPassArgs = React.useMemo(() => [aspect, 2, 1, 0], [aspect])

  return (
    <effectComposer ref={composer} args={effectComposerArgs}>
      <renderPass attachArray="passes" scene={scene} camera={camera} />
      <waterPass attachArray="passes" factor={2} />
      <unrealBloomPass attachArray="passes" args={unrealBloomPassArgs} />
      <filmPass attachArray="passes" args={filmPassArgs} />
      <glitchPass attachArray="passes" factor={down ? 1 : 0} />
    </effectComposer>
  )
}

const style = { width: '100%', height: '100%' }
const camera = { fov: 100, position: [0, 0, 30] }
const spotLightPosition = [0, 0, 70]
const planeBufferGeometryArgs = [10000, 10000]

function Swarm() {
  const [down, set] = React.useState(false)
  const mouse = React.useRef([300, -200])
  const onMouseMove = React.useCallback(
    ({ clientX: x, clientY: y }) => (mouse.current = [x - window.innerWidth / 2, y - window.innerHeight / 2]),
    []
  )
  const onMouseUp = React.useCallback(function callback() {
    set(false)
  }, [])
  const onMouseDown = React.useCallback(function callback() {
    set(true)
  }, [])
  return (
    <div style={style} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseDown={onMouseDown}>
      <Canvas camera={camera}>
        <pointLight distance={60} intensity={2} color="white" />
        <spotLight intensity={2} position={spotLightPosition} penumbra={1} color="red" />
        <mesh>
          <planeBufferGeometry attach="geometry" args={planeBufferGeometryArgs} />
          <meshStandardMaterial attach="material" color="#00ffff" depthTest={false} />
        </mesh>
        <SwarmComponent mouse={mouse} count={20000} />
        <Effect down={down} />
      </Canvas>
    </div>
  )
}

export default React.memo(Swarm)
