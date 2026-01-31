// Fn Node to take the position Local and bounds and return a objectSpace Position
import { positionWorld } from 'three/tsl'
export function objectSpacePosition(boundsMin: any, boundsMax: any) {
  // bounds come from setFromObject (world-space), so use positionWorld to match
  return positionWorld.sub(boundsMin).div(boundsMax.sub(boundsMin))
}
