import * as THREE from 'three'
import React, { useMemo, useRef, useCallback } from 'react'
import { Canvas, extend } from 'react-three-fiber'
import { OrbitControls } from 'drei'

class DotMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      transparent: true,
      uniforms: { size: { value: 10 }, scale: { value: 1 } },
      vertexShader: THREE.ShaderLib.points.vertexShader,
      fragmentShader: `
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, step(length(gl_PointCoord.xy - vec2(0.5)), 0.5));
      }`,
    })
  }
}

extend({ DotMaterial })

const white = new THREE.Color('white')
const hotpink = new THREE.Color('hotpink')
function Particles({ pointCount }) {
  const [positions, colors] = useMemo(() => {
    const positions = [...new Array(pointCount * 3)].map(() => 5 - Math.random() * 10)
    const colors = [...new Array(pointCount)].flatMap(() => hotpink.toArray())
    return [new Float32Array(positions), new Float32Array(colors)]
  }, [pointCount])

  const points = useRef()
  const hover = useCallback((e) => {
    e.stopPropagation()
    white.toArray(points.current.geometry.attributes.color.array, e.index * 3)
    points.current.geometry.attributes.color.needsUpdate = true
  }, [])

  const unhover = useCallback((e) => {
    hotpink.toArray(points.current.geometry.attributes.color.array, e.index * 3)
    points.current.geometry.attributes.color.needsUpdate = true
  }, [])

  return (
    <points ref={points} onPointerOver={hover} onPointerOut={unhover}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute attachObject={['attributes', 'color']} count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <dotMaterial vertexColors />
    </points>
  )
}

export default function App() {
  return (
    <Canvas
      style={{ background: 'peachpuff' }}
      orthographic
      camera={{ zoom: 60, position: [0, 0, 100] }}
      raycaster={{ params: { Points: { threshold: 0.2 } } }}
    >
      <Particles pointCount={1000} />
      <OrbitControls />
    </Canvas>
  )
}
