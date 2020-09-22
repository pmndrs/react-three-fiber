/**  @author vergil Wang */

import * as THREE from 'three'
import { Pass } from 'three/examples/jsm/postprocessing/Pass'

const WaterShader = {
  uniforms: {
    byp: { value: 0 },
    tex: { type: 't', value: null },
    time: { type: 'f', value: 0.0 },
    factor: { type: 'f', value: 0.0 },
    resolution: { type: 'v2', value: null },
  },
  vertexShader: `varying vec2 vUv;
    void main(){  
      vUv = uv; 
      vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * modelViewPosition;
    }`,
  fragmentShader: `
  uniform int byp;
    uniform float time;
    uniform float factor;
    uniform vec2 resolution;
    uniform sampler2D tex;
    varying vec2 vUv;
    void main() { 
      if (byp<1) {
        vec2 uv = vUv;
        float frequency = 4.0;
        float amplitude = 0.015 * factor;
        float x = uv.y * frequency + time * .7; 
        float y = uv.x * frequency + time * .3;
        uv.x += .5 * amplitude * cos(x);
        uv.y += .5 * amplitude * sin(y);
        vec4 rgba = texture2D(tex, uv);
        gl_FragColor = rgba;
      } else {
        gl_FragColor = texture2D(tex, vUv);
      }
    }`,
}

class WaterPass extends Pass {
  constructor(dt_size) {
    super()
    this.uniforms = THREE.UniformsUtils.clone(WaterShader.uniforms)
    if (dt_size === undefined) dt_size = 64
    this.uniforms['resolution'].value = new THREE.Vector2(dt_size, dt_size)
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: WaterShader.vertexShader,
      fragmentShader: WaterShader.fragmentShader,
    })
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.scene = new THREE.Scene()
    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null)
    this.quad.frustumCulled = false // Avoid getting clipped
    this.scene.add(this.quad)
    this.factor = 0
    this.time = 0
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const factor = Math.max(0, this.factor)
    this.uniforms['byp'].value = factor ? 0 : 1
    this.uniforms['tex'].value = readBuffer.texture
    this.uniforms['time'].value = this.time
    this.uniforms['factor'].value = this.factor
    this.time += 0.01
    this.quad.material = this.material
    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      renderer.render(this.scene, this.camera)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
      renderer.render(this.scene, this.camera)
    }
  }
}

export { WaterPass }
