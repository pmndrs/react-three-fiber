import { float, Fn, normalWorld, positionWorld, cameraPosition } from 'three/tsl'

export const fresnel = Fn(([exponent]) => {
  const viewDir = cameraPosition.sub(positionWorld).normalize()
  const NdotV = normalWorld.dot(viewDir).clamp(0, 1)
  return float(1).sub(NdotV).pow(exponent)
})
