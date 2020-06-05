import React, { forwardRef, useMemo, useRef } from 'react'
import { useFrame, extend, ReactThreeFiber } from 'react-three-fiber'
import { Points, Vector3, Spherical, Color, AdditiveBlending, ShaderMaterial } from 'three'

type Props = {
  radius?: number
  depth?: number
  count?: number
  factor?: number
  saturation?: number
  fade?: boolean
}

class StarfieldMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: { time: { value: 0.0 }, fade: { value: 1.0 } },
      vertexShader: `uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(mvPosition.x + 2.0 * time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,
      fragmentShader: `uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);
      }`,
    })
  }
}

extend({ StarfieldMaterial })

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      starfieldMaterial: ReactThreeFiber.MaterialNode<StarfieldMaterial, []>
    }
  }
}

const genStar = (r: number) => {
  return new Vector3().setFromSpherical(new Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI))
}

export const Stars = forwardRef(
  ({ radius = 100, depth = 50, count = 5000, saturation = 0, factor = 4, fade = false }: Props, ref) => {
    const material = useRef<StarfieldMaterial>()
    const [position, color, size] = useMemo(() => {
      const positions = []
      const colors = []
      const sizes = Array.from({ length: count }, () => (0.5 + 0.5 * Math.random()) * factor)
      const color = new Color()
      let r = radius + depth
      const increment = depth / count
      for (var i = 0; i < count; i++) {
        r -= increment * Math.random()
        positions.push(...genStar(r).toArray())
        color.setHSL(i / count, saturation, 0.9)
        colors.push(color.r, color.g, color.b)
      }
      return [new Float32Array(positions), new Float32Array(colors), new Float32Array(sizes)]
    }, [])
    useFrame((state) => material.current && (material.current.uniforms.time.value = state.clock.getElapsedTime()))
    return (
      <points ref={ref as React.MutableRefObject<Points>}>
        <bufferGeometry attach="geometry">
          <bufferAttribute attachObject={['attributes', 'position']} args={[position, 3]} />
          <bufferAttribute attachObject={['attributes', 'color']} args={[color, 3]} />
          <bufferAttribute attachObject={['attributes', 'size']} args={[size, 1]} />
        </bufferGeometry>
        <starfieldMaterial
          ref={material}
          attach="material"
          blending={AdditiveBlending}
          uniforms-fade-value={fade}
          transparent
          vertexColors
        />
      </points>
    )
  }
)
