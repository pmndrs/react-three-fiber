import React, { useMemo } from 'react'
import { useFrame, useUpdate } from 'react-three-fiber'
import { Vector3, Spherical, Color, BufferAttribute, AdditiveBlending, BufferGeometry } from 'three'

type Props = {
  radius: number
  depth: number
  count: number
}

const vertexShader = `
  uniform float time;
  attribute float size;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
    gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(mvPosition.x + 2.0 * size * time + 100.0 * size));
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform sampler2D pointTexture;
  varying vec3 vColor;
  void main() {

    // Distance from 0.0 to 0.5 from the center of the point
    float d = distance(gl_PointCoord, vec2(0.5, 0.5));

    // Applying sigmoid to smoothen the border
    float opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));

    gl_FragColor = vec4(vColor, opacity);
  }
`

const genStar = (r: number) => {
  return new Vector3().setFromSpherical(new Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI))
}

export const Stars = ({ radius, depth = 50, count }: Props) => {
  const uniforms = useMemo(
    () => ({
      time: { value: 0.0 },
    }),
    []
  )

  useFrame((state) => {
    uniforms.time.value = state.clock.elapsedTime
  })

  const geometry = useUpdate((geo: BufferGeometry) => {
    const positions = []
    const colors = []
    const sizes = Array.from({ length: count }, () => 0.5 + 0.5 * Math.random())
    const color = new Color()
    let r = radius + depth
    const increment = depth / count
    for (var i = 0; i < count; i++) {
      r -= increment * Math.random()
      positions.push(...genStar(r).toArray())
      color.setHSL(i / count, 1.0, 0.9)
      colors.push(color.r, color.g, color.b)
    }
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
    geo.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
    geo.setAttribute('size', new BufferAttribute(new Float32Array(sizes), 1))
  }, [])

  return (
    <points>
      <bufferGeometry ref={geometry} attach="geometry" />
      <shaderMaterial
        attach="material"
        uniforms={uniforms}
        fragmentShader={fragmentShader}
        vertexShader={vertexShader}
        blending={AdditiveBlending}
        transparent
        vertexColors
      />
    </points>
  )
}
