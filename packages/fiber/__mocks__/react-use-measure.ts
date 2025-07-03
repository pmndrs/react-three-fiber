import * as React from 'react'

// Export the mocked dimensions so tests can reference them
export const MOCKED_WIDTH = 1280
export const MOCKED_HEIGHT = 800

export default function useMeasure() {
  const element = React.useRef<HTMLElement | null>(null)
  const [bounds] = React.useState({
    left: 0,
    top: 0,
    width: MOCKED_WIDTH,
    height: MOCKED_HEIGHT,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
  })
  const ref = (node: HTMLElement) => {
    if (!node || element.current) {
      return
    }
    element.current = node
  }
  return [ref, bounds]
}
