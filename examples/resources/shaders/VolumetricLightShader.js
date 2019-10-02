import * as THREE from 'three'

export default {
  uniforms: {
    tDiffuse: { value: null },
    lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
    exposure: { value: 1.0 },
    decay: { value: 0.95 },
    density: { value: 0.6 },
    weight: { value: 0.1 },
    samples: { value: 50 },
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform sampler2D tDiffuse;
    uniform vec2 lightPosition;
    uniform float exposure;
    uniform float decay;
    uniform float density;
    uniform float weight;
    uniform int samples;
    const int MAX_SAMPLES = 100;
    void main()
    {
      vec2 texCoord = vUv;
      vec2 deltaTextCoord = texCoord - lightPosition;
      deltaTextCoord *= 1.0 / float(samples) * density;
      vec4 color = texture2D(tDiffuse, texCoord);
      float illuminationDecay = 1.0;
      for(int i=0; i < MAX_SAMPLES; i++) {
        if(i == samples) break;
        texCoord -= deltaTextCoord;
        vec4 sample = texture2D(tDiffuse, texCoord);
        sample *= illuminationDecay * weight;
        color += sample;
        illuminationDecay *= decay;
      }
      gl_FragColor = color * exposure;
    }
  `,
}
