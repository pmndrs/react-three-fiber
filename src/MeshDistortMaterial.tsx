import React, { useRef } from 'react'
import { MeshPhysicalMaterial, MeshPhysicalMaterialParameters, Shader } from 'three'
import { extend, useFrame } from 'react-three-fiber'
// eslint-disable-next-line
// @ts-ignore
import mergeRefs from 'react-merge-refs'
// eslint-disable-next-line
// @ts-ignore
import distort from './glsl/distort.vert'

type DistortMaterialType = JSX.IntrinsicElements['meshPhysicalMaterial'] & {
  time?: number
  distort: number
  radius: number
}

type Props = DistortMaterialType & {
  speed?: number
  factor?: number
}

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      distortMaterialImpl: DistortMaterialType
    }
  }
}

interface Uniform<T> {
  value: T
}

class DistortMaterialImpl extends MeshPhysicalMaterial {
  _time: Uniform<number>
  _distort: Uniform<number>
  _radius: Uniform<number>

  constructor(parameters: MeshPhysicalMaterialParameters) {
    super(parameters)
    this.setValues(parameters)
    this._time = { value: 0 }
    this._distort = { value: 0.4 }
    this._radius = { value: 1 }
  }

  onBeforeCompile(shader: Shader) {
    shader.uniforms.time = this._time
    shader.uniforms.radius = this._radius
    shader.uniforms.distort = this._distort

    shader.vertexShader = `
      uniform float time;
      uniform float radius;
      uniform float distort;
      ${distort}
      ${shader.vertexShader}
    `
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        float updateTime = time / 50.0;
        float noise = snoise(vec3(position / 2.0 + updateTime * 5.0));
        vec3 transformed = vec3(position * (noise * pow(distort, 2.0) + radius));
        `
    )
  }

  get time() {
    return this._time.value
  }

  set time(v) {
    this._time.value = v
  }

  get distort() {
    return this._distort.value
  }

  set distort(v) {
    this._distort.value = v
  }

  get radius() {
    return this._radius.value
  }

  set radius(v) {
    this._radius.value = v
  }
}

extend({ DistortMaterialImpl })

export const MeshDistortMaterial = React.forwardRef(({ speed = 1, ...props }: Props, ref) => {
  const material = useRef<DistortMaterialType>()
  useFrame((state) => material.current && (material.current.time = state.clock.getElapsedTime() * speed))

  return <distortMaterialImpl ref={mergeRefs([ref, material])} attach="material" {...props} />
})
