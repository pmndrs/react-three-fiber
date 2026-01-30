// Color Ramp node (2-stop linear interpolation)
// Equivalent to Blender's ColorRamp / ValToRGB with 2 stops and Linear interpolation.
//
// Maps a scalar factor [0,1] to a color by lerping between two color stops.
// Stop positions define where each color sits on the gradient (default 0 and 1).
//
// Usage:
//   colorRamp(factor, colorA, colorB)                     — full ramp from 0 to 1
//   colorRamp(factor, colorA, colorB, posA, posB)         — custom stop positions

import { Fn, vec3, float, mix, clamp, step } from 'three/tsl'

export const colorRamp = /*@__PURE__*/ Fn(
  ([
    factor_immutable,
    colorA_immutable,
    colorB_immutable,
    posA_immutable = float(0.0),
    posB_immutable = float(1.0),
  ]) => {
    const factor = float(factor_immutable)
    const colorA = vec3(colorA_immutable)
    const colorB = vec3(colorB_immutable)
    const posA = float(posA_immutable)
    const posB = float(posB_immutable)

    // Remap factor so posA maps to 0 and posB maps to 1
    const t = clamp(factor.sub(posA).div(posB.sub(posA)), 0.0, 1.0)

    return mix(colorA, colorB, t)
  },
)

// Constant interpolation: holds colorA below posB, colorB at or above posB.
// Equivalent to Blender's ColorRamp with Constant interpolation (2 stops).
export const colorRampConstant = /*@__PURE__*/ Fn(
  ([
    factor_immutable,
    colorA_immutable,
    colorB_immutable,
    _posA_immutable = float(0.0),
    posB_immutable = float(1.0),
  ]) => {
    const factor = float(factor_immutable)
    const colorA = vec3(colorA_immutable)
    const colorB = vec3(colorB_immutable)
    const posB = float(posB_immutable)

    // Step at posB: below → colorA, at or above → colorB
    const t = step(posB, factor)

    return mix(colorA, colorB, t)
  },
)
