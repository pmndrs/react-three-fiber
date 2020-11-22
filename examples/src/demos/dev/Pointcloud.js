import * as React from 'react'
import { Canvas, extend, useFrame, useThree } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

extend({ OrbitControls })

const attachObjectAttributesPosition = ['attributes', 'position']
const attachObjectAttributesColor = ['attributes', 'color']

function Particles({ pointCount }) {
  const [positions, colors] = React.useMemo(() => {
    const positions = []
    const colors = []
    for (let i = 0; i < pointCount; i++) {
      positions.push(5 - Math.random() * 10)
      positions.push(5 - Math.random() * 10)
      positions.push(5 - Math.random() * 10)
      colors.push(1)
      colors.push(0.5)
      colors.push(0.5)
    }
    return [new Float32Array(positions), new Float32Array(colors)]
  }, [pointCount])

  const attrib = React.useRef()
  const onPointerOver = React.useCallback((e) => {
    e.stopPropagation()
    attrib.current.array[e.index * 3] = 1
    attrib.current.array[e.index * 3 + 1] = 1
    attrib.current.array[e.index * 3 + 2] = 1
    attrib.current.needsUpdate = true
  }, [])

  const onPointerOut = React.useCallback((e) => {
    attrib.current.array[e.index * 3] = 1
    attrib.current.array[e.index * 3 + 1] = 0.5
    attrib.current.array[e.index * 3 + 2] = 0.5
    attrib.current.needsUpdate = true
  }, [])

  return (
    <points onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attachObject={attachObjectAttributesPosition}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          ref={attrib}
          attachObject={attachObjectAttributesColor}
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial attach="material" vertexColors size={10} sizeAttenuation={false} />
    </points>
  )
}

function Controls() {
  const ref = React.useRef()
  const { camera, gl } = useThree()
  useFrame(() => ref.current.update())
  const args = React.useMemo(() => [camera, gl.domElement], [camera, gl.domElement])

  return <orbitControls ref={ref} args={args} enableDamping dampingFactor={0.1} rotateSpeed={0.5} />
}

const camera = { zoom: 60 }
const raycaster = { params: { Points: { threshold: 0.2 } } }

function PointCloud() {
  return (
    <Canvas orthographic camera={camera} raycaster={raycaster}>
      <Particles pointCount={100} />
      <Controls />
    </Canvas>
  )
}

export default React.memo(PointCloud)
