import * as THREE from 'three'
import React, { useCallback, useMemo } from 'react'
import { Canvas } from 'react-three-fiber'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewPosition;
}`
const gradient = `vec4(1.0, vUv.y, 0.0, 1.0)`
const fragmentShader = `
varying vec2 vUv;
void main() {
  gl_FragColor = ${gradient};
}`
const shader = { vertexShader, fragmentShader }
const from = `vec4 diffuseColor = vec4( diffuse, opacity );`
const to = `vec4 diffuseColor = sRGBToLinear(${gradient});`
const onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(from, to)
}

// ShaderMaterial version for reference:
const PlaneShaderMaterial = React.memo((props) => {
  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[2, 6]} />
      <shaderMaterial attach="material" args={[shader]} />
    </mesh>
  )
})

// This suggested declaritive solution doesn't work:
const PlaneOBC = React.memo((props) => {
  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[2, 6]} />
      <meshBasicMaterial attach="material" defines={{ USE_UV: true }} onBeforeCompile={onBeforeCompile} />
    </mesh>
  )
})

// Works with a primitive and an imperatively declared material:
const PlaneOBCPrimitive = React.memo((props) => {
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial()
    m.onBeforeCompile = onBeforeCompile
    return m
  }, [])

  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[2, 6]} />
      <primitive attach="material" object={material} defines={{ USE_UV: true }} />
    </mesh>
  )
})

export default function App() {
  return (
    <Canvas>
      <PlaneOBC />
    </Canvas>
  )
}
