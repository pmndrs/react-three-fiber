import * as React from 'react'
import { Canvas, useLoader, useFrame, useThree, extend } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { draco } from 'drei'
import planet from '../resources/gltf/planet.gltf'

useLoader.preload(GLTFLoader, planet, draco())

extend({ OrbitControls })

const rotation1 = [-Math.PI / 2, 0, 0]
const position1 = [0, 0.02, -6.33]
const rotation2 = [0.24, -0.55, 0.56]
const scale1 = [7, 7, 7]

const attachObjectAttributesPosition = ['attributes', 'position']

function PlanetComponent(props) {
  const group = React.useRef()
  const { nodes, materials } = useLoader(GLTFLoader, planet, draco())

  console.log(nodes['planet.001_1'].geometry)

  return (
    <group ref={group} {...props} dispose={null}>
      <group rotation={rotation1}>
        <group position={position1} rotation={rotation2} scale={scale1}>
          <mesh material={materials.scene} geometry={nodes['planet.001_1'].geometry} />
          <mesh material={materials.scene} geometry={nodes['planet.001_2'].geometry} />
        </group>
      </group>
    </group>
  )
}

const Planet = React.memo(PlanetComponent)

function StarsComponent({ count = 5000 }) {
  const positions = React.useMemo(() => {
    let positions = []
    for (let i = 0; i < count; i++) {
      positions.push((50 + Math.random() * 1000) * (Math.round(Math.random()) ? -1 : 1))
      positions.push((50 + Math.random() * 1000) * (Math.round(Math.random()) ? -1 : 1))
      positions.push((50 + Math.random() * 1000) * (Math.round(Math.random()) ? -1 : 1))
    }
    return new Float32Array(positions)
  }, [count])

  return (
    <points>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attachObject={attachObjectAttributesPosition}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial attach="material" size={2} sizeAttenuation color="white" transparent opacity={0.8} fog={false} />
    </points>
  )
}

const Stars = React.memo(StarsComponent)

function ControlsComponent(props) {
  const { gl, camera } = useThree()
  const ref = React.useRef()
  useFrame(() => ref.current.update())
  const args = React.useMemo(() => [camera, gl.domElement], [camera, gl.domElement])

  return <orbitControls ref={ref} args={args} {...props} />
}

const Controls = React.memo(ControlsComponent)

const style1 = { background: 'radial-gradient(at 50% 70%, #200f20 40%, #090b1f 80%, #050523 100%)' }
const camera = { position: [0, 0, 15] }
const pointLightPosition = [-10, -25, -10]
const spotLightPosition = [15, 25, 5]
const fogArgs = ['#090b1f', 0, 25]

function GTLFPlanet() {
  return (
    <Canvas colorManagement={false} style={style1} camera={camera} shadowMap>
      <ambientLight intensity={0.4} />
      <pointLight intensity={20} position={pointLightPosition} color="#200f20" />
      <spotLight
        castShadow
        intensity={4}
        angle={Math.PI / 8}
        position={spotLightPosition}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <fog attach="fog" args={fogArgs} />
      <React.Suspense fallback={null}>
        <Planet />
      </React.Suspense>
      <Stars />
      <Controls
        autoRotate
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.5}
        rotateSpeed={1}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
    </Canvas>
  )
}

export default React.memo(GTLFPlanet)
