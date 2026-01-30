// Fn Node to take the position Local and bounds and return a objectSpace Position
import { positionLocal } from 'three/tsl'
export function objectSpacePosition(boundsMin: any, boundsMax: any) {
  return positionLocal.sub(boundsMin).div(boundsMax.sub(boundsMin))
}
