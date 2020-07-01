import { MeshStandardMaterial, MeshStandardMaterialParameters, Shader } from 'three'
import React, { useRef } from 'react'
import { extend, useFrame, ReactThreeFiber } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

type WobbleMaterialType = JSX.IntrinsicElements['meshStandardMaterial'] & {
  time?: number
  factor: number
}

type Props = WobbleMaterialType & {
  speed?: number
  factor?: number
}

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      wobbleMaterialImpl: WobbleMaterialType
    }
  }
}

function WobbleMaterialImpl(parameters: MeshStandardMaterialParameters) {
  MeshStandardMaterial.call(this)
  this.setValues(parameters)
  this._time = { value: 0 }
  this._factor = { value: 1 }
  this.onBeforeCompile = (shader: Shader) => {
    shader.uniforms.time = this._time
    shader.uniforms.factor = this._factor
    shader.vertexShader = 'uniform float time; uniform float factor;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `float theta = sin( time + position.y ) / 2.0 * factor;
        float c = cos( theta );
        float s = sin( theta );
        mat3 m = mat3( c, 0, s, 0, 1, 0, -s, 0, c );
        vec3 transformed = vec3( position ) * m;
        vNormal = vNormal * m;`
    )
  }
  Object.defineProperty(this, 'time', {
    get: () => this._time,
    set: (val) => (this._time.value = val),
  })
  Object.defineProperty(this, 'factor', {
    get: () => this._factor,
    set: (val) => (this._factor.value = val),
  })
}

WobbleMaterialImpl.prototype = Object.create(MeshStandardMaterial.prototype)
WobbleMaterialImpl.prototype.constructor = MeshStandardMaterial
WobbleMaterialImpl.prototype.isMeshStandardMaterial = true

extend({ WobbleMaterialImpl })

export const MeshWobbleMaterial = React.forwardRef(({ speed = 1, ...props }: Props, ref) => {
  const material = useRef<WobbleMaterialType>()
  useFrame((state) => material.current && (material.current.time = state.clock.getElapsedTime() * speed))
  return <wobbleMaterialImpl ref={mergeRefs([ref, material])} attach="material" {...props} />
})
