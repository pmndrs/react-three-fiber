import type { MockEventData } from '../types/internal'

export const calculateDistance = (event: MockEventData) => {
  if (event.offsetX && event.offsetY && event.initialClick.x && event.initialClick.y) {
    const dx = event.offsetX - event.initialClick.x
    const dy = event.offsetY - event.initialClick.y
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }
  return 0
}
