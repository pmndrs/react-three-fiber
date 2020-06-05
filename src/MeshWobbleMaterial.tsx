import { MeshStandardMaterial } from 'three'
import React, { useRef } from 'react'
import { extend, useFrame, ReactThreeFiber } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

class WobbleMaterialImpl extends MeshStandardMaterial {
  _time = { value: 0 }
  _factor = { value: 1 }

  constructor() {
    super()
    this.onBeforeCompile = (shader) => {
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
  }
  get time() {
    return this._time.value
  }
  set time(v) {
    this._time.value = v
  }
  get factor() {
    return this._factor.value
  }
  set factor(v) {
    this._factor.value = v
  }
}

extend({ WobbleMaterialImpl })

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      wobbleMaterialImpl: ReactThreeFiber.MaterialNode<WobbleMaterialImpl, [THREE.MeshStandardMaterialParameters]>
    }
  }
}

type Props = JSX.IntrinsicElements['wobbleMaterialImpl'] & {
  speed?: number
  factor?: number
}

export const MeshWobbleMaterial = React.forwardRef(({ speed = 1, ...props }: Props, ref) => {
  const material = useRef<WobbleMaterialImpl>()
  useFrame((state) => material.current && (material.current.time = state.clock.getElapsedTime() * speed))
  return <wobbleMaterialImpl ref={mergeRefs([ref, material])} attach="material" {...props} />
})
