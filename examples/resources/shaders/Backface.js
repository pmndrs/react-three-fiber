import { ShaderMaterial, BackSide } from 'three'

export default class RefractionMaterial extends ShaderMaterial {
  constructor(options) {
    super({
      vertexShader: `varying vec3 worldNormal;
      void main() {

        vec4 transformedNormal = vec4(normal, 0.);
        vec4 transformedPosition = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          transformedNormal = instanceMatrix * transformedNormal;
          transformedPosition = instanceMatrix * transformedPosition;
        #endif

        worldNormal = normalize( modelViewMatrix * transformedNormal).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
      }`,
      fragmentShader: `varying vec3 worldNormal;
      void main() {
        gl_FragColor = vec4(worldNormal, 1.0);
      }`,
      side: BackSide,
    })
  }
}
