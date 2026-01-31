import { Fn, float, vec3, time } from 'three/tsl'
import { mx_fractal_noise_vec3 } from 'three/tsl'

/**
 * Blender-style Wave Texture (Bands mode, Saw profile)
 *
 * Uses abs(sin()) for sharp creases (like Blender's sawtooth profile),
 * with noise distortion on the phase. Chained iterations add complexity.
 *
 * @param coord       - 3D position input (e.g. positionLocal)
 * @param scale       - base frequency of the bands
 * @param distortion  - how much noise warps the sine bands
 * @param detail      - fractal noise octaves for distortion (1-15)
 * @param detailScale - scale of the distortion noise
 * @param speed       - scroll speed (positive = downward on cylinder)
 */
export const waveTexture = Fn(([coord, scale, distortion, detail, detailScale, speed]: any) => {
  // Scrolling coordinate
  const scrolled = coord.add(vec3(0, time.mul(speed), 0))

  // Noise-based distortion
  const noise = mx_fractal_noise_vec3(scrolled.mul(detailScale), detail, float(0.5)).x

  // Base phase with noise distortion
  const phase = scrolled.y.mul(scale).add(noise.mul(distortion))

  // Blender uses abs(sin()) for the sawtooth/saw profile — gives sharp valley creases
  // Chain: each iteration distorts the next for complexity
  const w0 = phase.sin().abs()
  const w1 = phase.mul(2.1).add(w0).sin().abs()
  const w2 = phase.mul(4.3).add(w1.mul(0.5)).sin().abs()

  // Weighted blend — w0 dominates for large structure, w2 adds fine detail
  const combined = w0.mul(0.5).add(w1.mul(0.3)).add(w2.mul(0.2))

  return combined
})
