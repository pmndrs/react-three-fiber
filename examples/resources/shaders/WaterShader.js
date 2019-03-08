/**
 * Simple underwater shader
 * 
 
 parameters:
 tDiffuse: texture
 time: this should increase with time passing
 distort_speed: how fast you want the distortion effect of water to proceed
 distortion: to what degree will the shader distort the screen 
 centerX: the distortion center X coord
 centerY: the distortion center Y coord

 explaination:
 the shader is quite simple
 it chooses a center and start from there make pixels around it to "swell" then "shrink" then "swell"...
 this is of course nothing really similar to underwater scene
 but you can combine several this shaders together to create the effect you need...
 And yes, this shader could be used for something other than underwater effect, for example, magnifier effect :)

 * @author vergil Wang
 */

var WaterShader = {
  uniforms: {
    tDiffuse: { type: 't', value: null },
    time: { type: 'f', value: 0.0 },
    distort_speed: { type: 'f', value: 0.0005 },
    distortion: { type: 'f', value: 0.04 },
    centerX: { type: 'f', value: 0.5 },
    centerY: { type: 'f', value: 0.5 },
  },

  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    'vUv = uv;',
    'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

    '}',
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float time;',
    'uniform float distort_speed;',
    'uniform float distortion;',
    'uniform float centerX;',
    'uniform float centerY;',
    'varying vec2 vUv;',

    'void main() {',
    'vec2 p = vUv;',
    'vec2 center_coord;',
    'float distance_to_center;',
    'float projected_distance_to_center;',
    'float distort_degree;',

    'center_coord.x = p.x - centerX;',
    'center_coord.y = p.y - centerY;',
    'distance_to_center = sqrt(center_coord.x * center_coord.x + center_coord.y * center_coord.y);',
    'distort_degree = abs( mod(distort_speed* time, distortion) - (distortion / 2.0)) + 1.0;',
    'projected_distance_to_center = pow(1.0, distort_degree - 1.0) * pow(distance_to_center/1.0, distort_degree);',
    'p.x = projected_distance_to_center * center_coord.x/ distance_to_center + centerX;',
    'p.y = projected_distance_to_center * center_coord.y/ distance_to_center + centerY;',
    'vec4 color = texture2D(tDiffuse, p);',
    'gl_FragColor = color;',

    '}',
  ].join('\n'),
}

export { WaterShader }
