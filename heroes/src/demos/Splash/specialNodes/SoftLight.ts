// Soft Light blend mode node (Photoshop formula)
// https://www.ryanjuckett.com/photoshop-blend-modes-in-hlsl/
//
// Formula per channel:
//   blend < 0.5: 2 * base * blend + base^2 * (1 - 2 * blend)
//   blend >= 0.5: sqrt(base) * (2 * blend - 1) + 2 * base * (1 - blend)
//
// Usage:
//   softLight(base, blend)                    — full strength, no clamp
//   softLight(base, blend, 0.5)               — 50% mix factor
//   softLightClamped(base, blend)             — clamped to [0,1]
//   softLightClamped(base, blend, 0.5)        — clamped with factor

import { Fn, vec3, float, sqrt, mix } from 'three/tsl'

const softLightChannel = /*@__PURE__*/ Fn(([base_immutable, blend_immutable]) => {
  const base = float(base_immutable)
  const blend = float(blend_immutable)
  const dark = base
    .mul(blend)
    .mul(2.0)
    .add(base.mul(base).mul(float(1.0).sub(blend.mul(2.0))))
  const light = sqrt(base)
    .mul(blend.mul(2.0).sub(1.0))
    .add(base.mul(2.0).mul(float(1.0).sub(blend)))
  return mix(dark, light, float(blend.greaterThanEqual(0.5)))
})

const softLightBlend = /*@__PURE__*/ Fn(([base_immutable, blend_immutable]) => {
  const base = vec3(base_immutable)
  const blend = vec3(blend_immutable)
  return vec3(softLightChannel(base.x, blend.x), softLightChannel(base.y, blend.y), softLightChannel(base.z, blend.z))
})

export const softLight = /*@__PURE__*/ Fn(([base_immutable, blend_immutable, factor_immutable = float(1.0)]) => {
  return mix(base_immutable, softLightBlend(base_immutable, blend_immutable), float(factor_immutable))
})

export const softLightClamped = /*@__PURE__*/ Fn(([base_immutable, blend_immutable, factor_immutable = float(1.0)]) => {
  return mix(base_immutable, softLightBlend(base_immutable, blend_immutable), float(factor_immutable)).clamp(0.0, 1.0)
})
