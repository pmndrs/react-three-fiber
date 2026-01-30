// Splash material node graph — ported from Blender node tree export
//
// Signal flow:
//   1. UV → rotate 90° + offset x=1 → linear gradient → colorRamp (white@0 → black@0.323)
//   2. Generated → offset z=-19.32 → voronoi(scale=3) distance → invert
//   3. Mix(gradient ramp, inverted voronoi, 0.5)
//   4. Generated → scale x=3 → voronoi(scale=10) distance → invert
//   5. SoftLight(step3, step4)
//   6. Step threshold at 0.341 → greaterThan(0.5) → alpha
//   7. voronoi(scale=5) distance → constant ramp (dark teal / lighter teal)
//   8. SoftLight(step5, step7) → constant ramp (light blue / lighter blue) → emission color
//   9. Mix(transparent, emission, alpha) → output

import { vec3, float, clamp, mix, step, time } from 'three/tsl'
import { voronoiTexture, VoronoiFeature } from './VoronoiTexture'
import { softLight } from './SoftLight'
import { colorRamp } from './ColorRamp'

// Constant color ramp (hard step between two colors at a position)
function constantRamp(factor: any, colorA: any, colorB: any, pos = 0.5) {
  const t = step(float(pos), float(factor))
  return mix(vec3(colorA), vec3(colorB), t)
}

// Linear gradient: clamp(coord.x, 0, 1)
function gradientLinear(coord: any) {
  return clamp(vec3(coord).x, 0.0, 1.0)
}

// Invert color: 1 - c
function invert(c: any) {
  return float(1.0).sub(float(c))
}

// 90° z-rotation + translation
function mappingRotZ90(coord: any, loc: any) {
  const c = vec3(coord)
  const l = vec3(loc)
  return vec3(c.y.negate(), c.x, c.z).add(l)
}

function mappingOffset(coord: any, loc: any) {
  return vec3(coord).add(vec3(loc))
}

function mappingScale(coord: any, scale: any) {
  return vec3(coord).mul(vec3(scale))
}

/**
 * Build the splash material color and alpha from UV and Generated coordinates.
 *
 * @param uvCoord - UV texture coordinate
 * @param generatedCoord - Generated (object-space) texture coordinate
 * @returns { color, alpha } — both usable as TSL nodes
 */
export function splashMaterial(uvCoord: any, generatedCoord: any) {
  // --- Branch 1: Gradient fade ---
  // UV → rotate 90° + offset (1,0,0) → gradient → colorRamp white@0 → black@0.323
  const mappedUV = mappingRotZ90(uvCoord, vec3(1.0, 0.0, 0.0))
  const gradient = gradientLinear(mappedUV)
  const gradientColor = colorRamp(gradient, vec3(1.0), vec3(0.0), 0.0, 0.323)

  // --- Branch 2: Voronoi scale=3, offset z=-19.32 → invert ---
  const mapped1 = mappingOffset(generatedCoord.add(time.div(15).negate()), vec3(0.0, 0.0, -19.32))
  const vor1 = voronoiTexture({ coord: mapped1, scale: 3.0, feature: VoronoiFeature.F1 })
  const inv1 = invert(vor1.distance)

  // --- Step 3: Mix gradient ramp with inverted voronoi (factor 0.5) ---
  const mixed1 = mix(gradientColor, vec3(inv1), 0.5)

  // --- Branch 3: Voronoi scale=10, x-scaled 3x → invert ---
  const mapped2 = mappingScale(generatedCoord, vec3(3.0, 1.0, 1.0))
  const vor2 = voronoiTexture({ coord: mapped2, scale: 10.0, feature: VoronoiFeature.F1 })
  const inv2 = invert(vor2.distance)

  // --- Step 4: Soft Light blend ---
  const softLit1 = softLight(mixed1, vec3(inv2))

  // --- Alpha: constant step at 0.341, then greaterThan 0.5 ---
  const alphaRamp = constantRamp(softLit1, vec3(0.0), vec3(1.0), 0.341)
  const alpha = step(0.5, alphaRamp.x)

  // --- Branch 4: Voronoi scale=5 → constant ramp (dark teal → lighter teal) ---
  const vor3 = voronoiTexture({ coord: generatedCoord, scale: 5.0, feature: VoronoiFeature.F1 })
  const tealRamp = constantRamp(vor3.distance, vec3(0.15, 0.52, 0.67), vec3(0.39, 0.74, 0.87), 0.355)

  // --- Step 5: Soft Light blend combined with teal voronoi ---
  const softLit2 = softLight(softLit1, tealRamp)

  // --- Final color: constant ramp (blue shades) ---
  const finalColor = constantRamp(softLit2, vec3(0.28, 0.69, 0.84), vec3(0.64, 0.91, 1.0), 0.227)

  return { color: finalColor, alpha }
}
