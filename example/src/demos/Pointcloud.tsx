import { Canvas, ThreeEvent, extend } from '@react-three/fiber'
import { useCallback, useMemo, useRef } from 'react'
import * as THREE from 'three'

class DotMaterialImpl extends THREE.ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      uniforms: { size: { value: 15 }, scale: { value: 1 } },
      vertexShader: THREE.ShaderLib.points.vertexShader,
      fragmentShader: `
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, step(length(gl_PointCoord.xy - vec2(0.5)), 0.5));
      }`,
    })
  }
}

const DotMaterial = extend(DotMaterialImpl)

const white = new THREE.Color('white')
const hotpink = new THREE.Color('hotpink')

function Particles({ pointCount }: { pointCount: number }) {
  const [positions, colors] = useMemo(() => {
    const positions = [...new Array(pointCount * 3)].map(() => 5 - Math.random() * 10)
    const colors = [...new Array(pointCount)].flatMap(() => hotpink.toArray())
    return [new Float32Array(positions), new Float32Array(colors)]
  }, [pointCount])

  const points = useRef<THREE.Points>(null!)

  const hover = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    white.toArray(points.current.geometry.attributes.color.array, e.index! * 3)
    points.current.geometry.attributes.color.needsUpdate = true
  }, [])

  const unhover = useCallback((e: ThreeEvent<PointerEvent>) => {
    hotpink.toArray(points.current.geometry.attributes.color.array, e.index! * 3)
    points.current.geometry.attributes.color.needsUpdate = true
  }, [])

  return (
    <points ref={points} onPointerOver={hover} onPointerOut={unhover}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <DotMaterial vertexColors depthWrite={false} />
    </points>
  )
}

export default function App() {
  return (
    <Canvas
      orthographic
      camera={{ zoom: 40, position: [0, 0, 100] }}
      raycaster={{ params: { Points: { threshold: 0.2 } } as any }}>
      <Particles pointCount={1000} />
    </Canvas>
  )
}
