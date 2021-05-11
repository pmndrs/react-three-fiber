import * as THREE from 'three'
import * as React from 'react'
import { useFrame, useThree, Canvas, useLoader } from '@react-three/fiber'
import { useAsset } from 'use-asset'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const label = { padding: '10px 20px', bottom: 'unset', right: 'unset', top: 60, left: 60 }

function AsyncComponent({ cacheKey }: { cacheKey: string }) {
  useAsset<any, any>(async () => await new Promise((res) => setTimeout(res, 2000)), cacheKey)
  return null
}

function ThreeLoader() {
  const ref = React.useRef<THREE.Mesh>(null!)
  useFrame((state) => (ref.current.position.y = Math.sin(state.clock.elapsedTime * 4) / 2))
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.1, 32, 32]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

function HtmlLoader() {
  return <span style={{ ...label, border: '2px solid #10af90', color: '#10af90' }}>waiting...</span>
}

function SimulateError() {
  useLoader(GLTFLoader, '/doesnotexist.glb')
  return null
}

class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError = (error: any) => ({ error })
  render() {
    if (this.state.error)
      return (
        <span style={{ ...label, border: '2px solid #ff5050', color: '#ff5050' }}>
          {JSON.stringify(this.state.error)}
        </span>
      )
    return this.props.children
  }
}

export default function App() {
  const [load, set] = React.useState(false)
  React.useEffect(() => {
    setTimeout(() => set(true), 3000)
  }, [])
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<HtmlLoader />}>
        <Canvas camera={{ position: [2, 2, 2] }}>
          {/*<React.Suspense fallback={<ThreeLoader />}>*/}
          <ambientLight />
          <pointLight position={[10, 10, 5]} intensity={2} />
          <mesh>
            <boxGeometry />
            <meshStandardMaterial color="orange" />
          </mesh>
          <AsyncComponent cacheKey="1" />
          {load && <SimulateError />}
          {/*</React.Suspense>*/}
        </Canvas>
      </React.Suspense>
    </ErrorBoundary>
  )
}
