import { Canvas, useUniforms, useNodes, type ThreeElements } from '@react-three/fiber/webgpu'
import { useControls } from 'leva'
import { getLevaSeaConfig, makeSeaNodes, TerrainGeometry } from './seaNodes'
import { CameraControls, Environment } from '@react-three/drei'
import { instancedArray, struct } from 'three/tsl'

const maxParticles = 1000
// single setup of nodes for the app
const Experience = () => {
  //* Leva Controls ==============================
  const levaUniforms = useControls('Raging Sea', getLevaSeaConfig())
  useUniforms(levaUniforms)

  //* Nodes Setup ==============================
  useNodes(({ uniforms }) => makeSeaNodes(uniforms), 'sea')
  useNodes(() => {
    const particleStruct = struct({
      position: { type: 'vec3' },
      velocity: { type: 'vec3' },
      C: { type: 'mat3' },
    })
    // to get the data size we have to be clever
    const typeNode = particleStruct().structTypeNode
    console.log('struct raw', typeNode)
    const particleStructSize = 20 // each vec3 occupies 4 floats and mat3 occupies 12 floats in memory because of webgpu memory alignment
    const particleArray = new Float32Array(maxParticles * particleStructSize)

    for (let i = 0; i < maxParticles; i++) {
      particleArray[i * particleStructSize] = Math.random() * 0.8 + 0.1
      particleArray[i * particleStructSize + 1] = Math.random() * 0.8 + 0.1
      particleArray[i * particleStructSize + 2] = Math.random() * 0.8 + 0.1
    }

    const particleBuffer = instancedArray(particleArray, particleStruct)

    return { particleBuffer }
  })

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
