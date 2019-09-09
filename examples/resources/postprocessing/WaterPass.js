import {
  DataTexture,
  FloatType,
  Math as _Math,
  Mesh,
  OrthographicCamera,
  PlaneBufferGeometry,
  RGBFormat,
  Scene,
  ShaderMaterial,
  UniformsUtils,
  Vector2,
} from 'three'
import { WaterShader } from '../shaders/WaterShader.js'
import { Pass } from 'three/examples/jsm/postprocessing/Pass'

var WaterPass = function(dt_size) {
  Pass.call(this)
  if (WaterShader === undefined) console.error('THREE.WaterPass relies on THREE.WaterShader')
  var shader = WaterShader
  this.uniforms = UniformsUtils.clone(shader.uniforms)
  if (dt_size === undefined) dt_size = 64
  this.uniforms['resolution'].value = new Vector2(dt_size, dt_size)
  this.material = new ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
  })
  this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
  this.scene = new Scene()
  this.quad = new Mesh(new PlaneBufferGeometry(2, 2), null)
  this.quad.frustumCulled = false // Avoid getting clipped
  this.scene.add(this.quad)
  this.factor = 0
  this.time = 0
}

WaterPass.prototype = Object.assign(Object.create(Pass.prototype), {
  constructor: WaterPass,

  render: function(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    const factor = Math.max(0, this.factor)
    this.uniforms['byp'].value = factor ? 0 : 1
    this.uniforms['texture'].value = readBuffer.texture
    this.uniforms['time'].value = this.time
    this.uniforms['factor'].value = this.factor
    this.time += 0.05
    this.quad.material = this.material
    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      renderer.render(this.scene, this.camera)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
      renderer.render(this.scene, this.camera)
    }
  },
})

export { WaterPass }
