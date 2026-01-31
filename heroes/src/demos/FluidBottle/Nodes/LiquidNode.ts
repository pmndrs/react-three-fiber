import { Fn, float, vec3, positionLocal, faceDirection, mix, abs, dot } from 'three/tsl'

/**
 * Core liquid clipping — returns a float where < 0 = liquid, > 0 = air.
 * Works in local/object space so the fill plane moves with the mesh.
 * wobbleX/Z tilt the clipping plane, fillY is the local-space fill height.
 */
export const liquidFill = /*@__PURE__*/ Fn(([wobbleX, wobbleZ, fillY]) => {
  const wobbleNormal = vec3(float(wobbleX), 1, float(wobbleZ)).normalize()
  return dot(positionLocal, wobbleNormal).sub(float(fillY))
})

/**
 * Liquid color with foam rim at the surface edge.
 * Returns vec3 color — blends liquidColor with foamColor near the fill line.
 */
export const liquidColor = /*@__PURE__*/ Fn(([fillTest, liquidCol, foamCol, rimWidth]) => {
  const rim = abs(float(fillTest)).smoothstep(0, float(rimWidth))
  return mix(vec3(foamCol), vec3(liquidCol), rim)
})

/**
 * Surface detection via backface rendering.
 * With DoubleSide + alphaTest clipping, backfaces at the clip boundary
 * form the visible liquid surface (the "cap"). faceDirection is 1 for
 * front faces, -1 for back faces.
 */
export const liquidSurface = /*@__PURE__*/ Fn(([surfaceCol, bodyCol]) => {
  // faceDirection: 1.0 = front face (side walls), -1.0 = back face (liquid top cap)
  const isBack = float(1).sub(faceDirection).mul(0.5) // 0 for front, 1 for back
  return mix(vec3(bodyCol), vec3(surfaceCol), isBack)
})
