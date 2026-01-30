// Voronoi Texture Node — wrapper around mx_worley_noise with range correction
// mx_worley outputs a compressed range; remapMin/remapMax control the mapping to 0–1

import { vec3, float, mx_worley_noise_vec3, mx_worley_noise_float, clamp } from 'three/tsl'

export const VoronoiFeature = {
  F1: 0,
  F2: 1,
  SMOOTH_F1: 2,
  DISTANCE_TO_EDGE: 3,
  N_SPHERE_RADIUS: 4,
} as const

export const VoronoiMetric = {
  EUCLIDEAN: 0,
  MANHATTAN: 1,
  CHEBYCHEV: 2,
  MINKOWSKI: 3,
} as const

export interface VoronoiInputs {
  coord: any
  scale?: any
  smoothness?: any
  exponent?: any
  randomness?: any
  feature?: number
  metric?: number
  remapMin?: any
  remapMax?: any
}

export interface VoronoiOutputs {
  distance: any
  color: any
  position: any
}

export function voronoiTexture({
  coord,
  scale = 5.0,
  randomness = 1.0,
  remapMin = 0.65,
  remapMax = 1.0,
}: VoronoiInputs): VoronoiOutputs {
  const scaledCoord = vec3(coord).mul(float(scale))
  const jitter = float(randomness).clamp(0.0, 1.0)

  const noiseColor = mx_worley_noise_vec3(scaledCoord, jitter)
  const raw = mx_worley_noise_float(scaledCoord, jitter)
  // Remap from [remapMin, remapMax] to [0, 1]
  const rMin = float(remapMin)
  const rMax = float(remapMax)
  const noiseDist = clamp(raw.sub(rMin).div(rMax.sub(rMin)), 0.0, 1.0)

  return {
    distance: noiseDist,
    color: noiseColor,
    position: scaledCoord,
  }
}
