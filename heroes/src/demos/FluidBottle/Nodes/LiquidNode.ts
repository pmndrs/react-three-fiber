import { Fn, float, vec3, positionWorld, modelPosition, faceDirection, mix, abs, dot } from 'three/tsl'

/**
 * Core liquid clipping in WORLD space.
 * The clip plane is always world-Y-up (+ wobble tilt), so when the bottle
 * rotates the liquid stays level with gravity.
 *
 * Uses modelPosition (object world origin from the model matrix) so the fill
 * plane moves with the object without needing a JS-side uniform.
 *
 * fillY      = fill level in local space (from bounding box mapping)
 * wobbleX/Z  = tilt the surface plane
 */
export const liquidFill = /*@__PURE__*/ Fn(([wobbleX, wobbleZ, fillY]) => {
  // World-up plane tilted by wobble
  const wobbleNormal = vec3(float(wobbleX), 1, float(wobbleZ)).normalize()
  // Position relative to object center — keeps fill stable during translation
  const relPos = positionWorld.sub(modelPosition)
  // Positive = above surface (air), negative = below (liquid)
  return dot(relPos, wobbleNormal).sub(float(fillY))
})

/**
 * Liquid color with foam rim at the surface edge.
 */
export const liquidColor = /*@__PURE__*/ Fn(([fillTest, liquidCol, foamCol, rimWidth]) => {
  const rim = abs(float(fillTest)).smoothstep(0, float(rimWidth))
  return mix(vec3(foamCol), vec3(liquidCol), rim)
})

/**
 * isBackFace — 0 for front faces, 1 for back faces.
 */
export const isBackFace = /*@__PURE__*/ Fn(() => {
  return float(1).sub(faceDirection).mul(0.5)
})

/**
 * Lit color output — front faces get bodyCol for PBR lighting,
 * back faces get black (lighting has nothing to act on).
 */
export const liquidLitColor = /*@__PURE__*/ Fn(([bodyCol]) => {
  return mix(vec3(bodyCol), vec3(0), isBackFace())
})

/**
 * Emissive output — back faces get surfaceCol as unlit emissive,
 * front faces get zero emissive (they use standard lighting).
 */
export const liquidEmissive = /*@__PURE__*/ Fn(([surfaceCol]) => {
  return mix(vec3(0), vec3(surfaceCol), isBackFace())
})
