import { Fn, float, vec3, positionWorld, modelPosition, mix, abs, dot, frontFacing } from 'three/tsl'

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
  const wx = float(wobbleX)
  const wz = float(wobbleZ)
  // World-up plane tilted by wobble
  const wobbleNormal = vec3(wx, 1, wz).normalize()
  // Position relative to object center — keeps fill stable during translation
  const relPos = positionWorld.sub(modelPosition)
  // When the surface tilts, the center fill point drops (volume conservation).
  // Proportional to tilt² so it's always a drop, scales naturally with wobble.
  const fillDrop = wx.mul(wx).add(wz.mul(wz)).mul(0.25)
  // Positive = above surface (air), negative = below (liquid)
  return dot(relPos, wobbleNormal).sub(float(fillY)).add(fillDrop)
})

/**
 * Liquid color with foam rim at the surface edge.
 */
export const liquidColor = /*@__PURE__*/ Fn(([fillTest, liquidCol, foamCol, rimWidth]) => {
  const rim = abs(float(fillTest)).smoothstep(0, float(rimWidth))
  return mix(vec3(foamCol), vec3(liquidCol), rim)
})

/**
 * Lit color output — front faces get bodyCol for PBR lighting,
 * back faces get black (lighting has nothing to act on).
 */
export const liquidLitColor = /*@__PURE__*/ Fn(([bodyCol]) => {
  return mix(vec3(0), vec3(bodyCol), frontFacing)
})

/**
 * Emissive output — back faces get surfaceCol as unlit emissive,
 * front faces get zero emissive (they use standard lighting).
 */
export const liquidEmissive = /*@__PURE__*/ Fn(([surfaceCol]) => {
  return mix(vec3(surfaceCol), vec3(0), frontFacing)
})
