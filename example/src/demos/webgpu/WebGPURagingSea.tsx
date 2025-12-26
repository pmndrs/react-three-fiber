import { Canvas, useUniforms, useNodes, type ThreeElements } from '@react-three/fiber/webgpu'
import { useControls } from 'leva'
import { getLevaSeaConfig, makeSeaNodes, TerrainGeometry } from './seaNodes'
import { CameraControls, Environment } from '@react-three/drei'

// single setup of nodes for the app
const Experience = () => {
  //* Leva Controls ==============================
  const levaUniforms = useControls('Raging Sea', getLevaSeaConfig())
  useUniforms(levaUniforms)

  //* Nodes Setup ==============================
  useNodes(({ uniforms }) => makeSeaNodes(uniforms), 'sea')

  return (
    <>
      <Lights />
      <SeaSurface />
      <CameraControls />
    </>
  )
}

function Lights() {
  const { envIntensity } = useControls('Environment', {
    envIntensity: { value: 0.5, min: 0, max: 1, step: 0.01 },
  })
  return (
    <>
      <ambientLight intensity={Math.PI} />
      <directionalLight position={[-4, 2, 0]} intensity={Math.PI} />
      <Environment preset="city" environmentIntensity={envIntensity} />
    </>
  )
}

function SeaSurface(props: ThreeElements['mesh']) {
  const matNodes = useNodes('sea')
  return (
    <mesh {...props}>
      <TerrainGeometry />
      <meshStandardMaterial {...matNodes} color={'#271442'} roughness={0.15} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas renderer camera={{ fov: 50, position: [1.5, 1.5, 1.5] }}>
      <color attach="background" args={['#271442']} />
      <Experience />
    </Canvas>
  )
}
